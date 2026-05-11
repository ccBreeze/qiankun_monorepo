---
title: 为什么不使用 Module Federation
---

# 为什么不使用 Module Federation

本文说明本项目为什么优先选择 qiankun 的应用级加载模型，而不是使用 Module Federation 作为微前端集成主方案。

## 先看结论

Module Federation 很适合解决“多个独立构建之间运行时共享模块”的问题；但本项目当前要解决的核心问题是：**主应用按路由加载完整子应用，并统一管理子应用生命周期、菜单、标签页、权限上下文、资源路径和卸载清理**。

这两类问题相邻，但不是同一个层级：

| 维度       | qiankun 当前承担的职责               | Module Federation 更擅长的职责                    |
| ---------- | ------------------------------------ | ------------------------------------------------- |
| 集成粒度   | 完整应用                             | 模块、组件、页面片段                              |
| 加载入口   | 子应用 HTML entry                    | `remoteEntry.js` 暴露的 remote module             |
| 运行时关系 | 主应用加载并驱动子应用生命周期       | host 消费 remote 暴露的模块                       |
| 路由协作   | 主应用根据 `activeRule` 匹配子应用   | 通常由 host 自己决定在哪个路由 import 哪个 remote |
| 隔离目标   | 应用容器、样式、全局副作用、卸载清理 | 依赖共享、模块复用、远程组件加载                  |
| 版本治理   | 各应用可更像独立系统部署             | shared 依赖需要显式协商版本和单例                 |

所以本项目不是否定 Module Federation，而是没有把它放在“微前端应用编排层”的位置上。

## Module Federation 解决的是什么

根据 webpack 官方说明，Module Federation 的目标是让多个独立构建组成一个应用。每个构建既可以作为 container 暴露模块，也可以作为 host 消费其他构建暴露的模块。

典型 remote 暴露组件：

```js
new ModuleFederationPlugin({
  name: 'crm',
  filename: 'remoteEntry.js',
  exposes: {
    './CustomerPanel': './src/CustomerPanel',
  },
  shared: {
    vue: { singleton: true },
  },
})
```

典型 host 消费组件：

```ts
const CustomerPanel = defineAsyncComponent(() => import('crm/CustomerPanel'))
```

它的关键词是：

- remote 暴露模块；
- host 运行时加载 remote module；
- 多个构建共享依赖；
- 通过 shared/singleton/requiredVersion 协调依赖版本。

这套模型非常适合以下场景：

1. 多团队共享业务组件、页面片段或工具模块；
1. 页面由多个远程组件拼装；
1. 希望减少 Vue、React、组件库等公共依赖重复加载；
1. host 与 remote 的技术栈、构建工具和依赖版本可以被统一治理。

## 本项目需要的是应用级编排

当前主应用通过注册表声明子应用：

```ts [apps/main-app/src/utils/microApp/registry.ts]
const microAppDefinitions: MicroAppDefinition[] = [
  {
    activeRule: MICRO_APP_ACTIVE_RULE.OCRM,
    entryMap: {
      [RUNTIME_ENV.DEV]: 'http://localhost:8102',
      [RUNTIME_ENV.PROD]: 'http://localhost:8102',
    },
  },
  {
    activeRule: MICRO_APP_ACTIVE_RULE.VUE3_HISTORY,
    entryMap: {
      [RUNTIME_ENV.DEV]: 'http://localhost:8101',
      [RUNTIME_ENV.PROD]: 'http://localhost:8101',
    },
  },
]
```

运行时再按当前路由加载完整子应用：

```ts [apps/main-app/src/stores/microApp.ts]
const microApp = loadMicroApp(newApp, newApp.configuration)
loadedMicroApps.set(newApp.name, microApp)
await microApp.mountPromise
```

这个模型背后的重点不是“加载一个远程组件”，而是主应用要控制一整套应用生命周期：

- 根据 `activeRule` 判断当前 URL 属于哪个子应用；
- 将用户信息、授权路由、当前激活规则注入子应用；
- 将子应用挂载到指定 DOM 容器；
- 在标签页关闭、路由切换或孤儿应用出现时卸载子应用；
- 通过 `getTemplate`、`fetch` 等钩子处理 HTML 与 CSS 资源路径；
- 与主应用菜单、标签栏、权限和运行时事件协议协作。

如果改用 Module Federation，这些能力不会自动出现，仍然要在 host 侧重新设计一套应用容器、生命周期协议、路由协议和卸载清理机制。

## 为什么当前不选 Module Federation

### 1. 它会把问题从“应用编排”转成“模块契约”

qiankun 加载的是完整子应用。子应用只要提供入口 HTML 和生命周期，内部路由、状态、页面组织可以继续作为一个独立应用演进。

Module Federation 加载的是 remote module。主应用需要知道 remote 暴露了什么模块，并在自己的路由或组件树中 import 它：

```ts
import('vue3History/Routes')
import('crm/CustomerList')
import('ocrm/App')
```

这会让主应用和子应用之间形成更细的模块契约。对于本项目这种“子应用自带路由、菜单、页面和业务上下文”的结构，契约会变重。

### 2. 依赖共享不是纯收益

Module Federation 的一个核心价值是共享依赖，例如 `vue`、`vue-router`、`pinia`、组件库等。但共享依赖需要处理单例、版本范围、严格版本和加载顺序。

例如 Vue 生态里，下面这些依赖一旦跨应用共享，就需要很谨慎：

| 依赖         | 风险                                             |
| ------------ | ------------------------------------------------ |
| `vue`        | 多实例与单例策略会影响响应式上下文和插件安装     |
| `vue-router` | 子应用路由实例通常不应和主应用路由实例混用       |
| `pinia`      | store 作用域需要明确隔离，否则状态边界容易变模糊 |
| 组件库       | 主题、样式注入、弹层容器和版本差异都需要统一治理 |

本项目目前更倾向于用 monorepo package 共享稳定基础能力，例如 `@breeze/runtime`、`@breeze/bridge-vue`、`@breeze/components`。这些包在构建期显式依赖，边界更清楚；应用运行时仍然保持应用级隔离。

### 3. 它不能替代 qiankun 的容器和卸载语义

qiankun 的价值不只是“远程加载”。它还提供了子应用挂载、卸载、生命周期状态和容器语义。

Module Federation 即使能加载 `remote/App`，也只得到一个模块。主应用仍要回答：

1. 这个模块挂到哪个 DOM？
1. 重复进入路由时是否复用？
1. 标签页关闭时如何销毁？
1. 子应用注册的定时器、事件监听、弹窗节点如何清理？
1. 样式污染和全局副作用如何隔离？

这些正是当前 `loadMicroApp()`、`activeRule`、`container`、`mountPromise`、`unmount()` 这一套流程在解决的问题。

### 4. 资源路径问题仍然存在

Module Federation 的 remoteEntry 能解决 remote module 的发现和加载，但不等于自动解决所有资源路径。

本项目已经在 qiankun 路径下专门处理了：

- Vite 构建产物中的动态 import 路径；
- HTML 模板中的根路径资源；
- CSS 被内联后 `url()` 相对路径跑偏；
- 不同环境下子应用 entry 与资源 origin 的计算。

这些问题在 Module Federation 模型下也会换一种形态继续存在，只是从 HTML Entry 的路径治理变成 remote chunk、CSS、字体图片和 public path 的治理。

### 5. 存量和异构应用迁移成本更高

qiankun 的 HTML Entry 模型对存量应用更友好。只要应用能独立构建并提供入口 HTML，就可以逐步接入主应用。

Module Federation 要求子应用主动暴露模块，通常还需要：

- 增加 federation 插件配置；
- 规划 `exposes` 和 `remotes`；
- 处理 shared 依赖；
- 为远程模块补类型声明；
- 调整应用入口，让它既能独立运行，又能作为 remote module 被 host 挂载。

对当前项目来说，这会把“接入一个完整子应用”的成本前移到每个子应用的构建和模块契约设计上。

## 什么时候可以考虑 Module Federation

Module Federation 不是不能用，而是适合放在更明确的场景里：

| 场景                                           | 是否适合 |
| ---------------------------------------------- | -------- |
| 多个应用共享大体量业务组件                     | 适合     |
| 主应用页面需要组合多个团队提供的远程组件       | 适合     |
| 希望独立部署组件库，并让消费方运行时获取最新版 | 适合     |
| 只想把完整子应用按路由挂载进主应用             | 不优先   |
| 子应用需要保持较强独立性和完整生命周期         | 不优先   |
| 存量系统只想低侵入接入主应用壳                 | 不优先   |

一个更合理的长期位置是：**qiankun 继续负责应用级编排，Module Federation 只在局部用于跨应用共享组件或能力模块**。

例如：

```text
主应用
├── qiankun 加载完整子应用
│   ├── vue3-history
│   ├── ocrm
│   └── breeze-crm-v8
└── 可选：Module Federation 加载共享业务组件
    ├── design-system/Button
    └── crm-widgets/CustomerSummary
```

这样可以避免用 Module Federation 承担应用生命周期、路由激活和沙箱隔离这些它并不擅长的职责。

## 小结

本项目不使用 Module Federation 作为主微前端方案，核心原因是：**当前问题是应用级编排，不是模块级共享**。

qiankun 更贴合本项目现在的边界：主应用负责加载完整子应用，统一管理路由激活、容器、生命周期、props、卸载和资源路径；共享能力则通过 monorepo package 显式沉淀。

后续如果出现跨应用复用大型业务组件、运行时动态升级组件库、多个团队共同拼装同一页面等需求，可以再把 Module Federation 作为局部能力引入，而不是替换当前 qiankun 架构。

## 参考资料

- [webpack：Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Module Federation Documentation](https://docs.webpack.js.org/guides/module-federation)
- [qiankun：API](https://umijs.github.io/qiankun/api)
