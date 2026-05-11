---
title: 微前端中台架构升级 · 面试 QA
---

# 微前端中台架构升级 · 面试 QA

本文从 **资深面试官 / 技术总监** 视角，围绕本仓库对应的简历项目「微前端中台架构升级」做层层追问，并给出经得起追问的范例答复。

每一组 QA 的设计原则：

- **问**：带钩子、带压力，不接受空泛的"加强了团队协作"式回答；
- **答**：先讲思路 → 给关键技术细节 → 主动暴露权衡 / 残留坑，避免吹牛被穿透。

> 项目背景速览
> Vue 3 + TS + Vite + qiankun + pnpm Workspace；主应用 `apps/main-app` 作为 Host Shell，子应用如 `apps/vue3-history`；沉淀 8 个 `@breeze/*` 基础包 + 30+ 通用组件；旧 Vue 2 + 自研 UI 框架按模块灰度迁移、业务零中断。

[[toc]]

---

## 一、架构选型与基础设施

### Q1：你说选了 qiankun，那为什么不是 Module Federation、micro-app、wujie？怎么证明这不是拍脑袋？

**A：** 先讲约束，再横向对比，最后落到迁移风险。

核心约束不是"哪个方案最新"，而是：**老系统不能停、新旧技术栈并存、子应用要独立部署、主应用要能托管 Vue 2 / Vue 3 混合应用**。

| 方案              | 优点                                 | 放弃原因                                            |
| ----------------- | ------------------------------------ | --------------------------------------------------- |
| Module Federation | 依赖共享强，适合组件 / 模块级复用    | 对构建体系耦合更强，老 Vue 2 + 非标准构建接入成本高 |
| micro-app         | WebComponent 封装更轻                | 团队案例和排障经验不如 qiankun 成熟                 |
| wujie             | iframe 隔离好，样式污染少            | 通信、路由、弹窗、权限这类中台场景需要额外封装较多  |
| qiankun           | 生态成熟、生命周期清晰，适合渐进迁移 | 沙箱和样式隔离不是银弹，需要工程约束补足            |

判断点：这次不是追求最强隔离，而是追求 **「存量系统可迁移、团队可维护、问题可定位」**。

如果继续追问"qiankun 有什么坑"，我会主动说：全局变量污染、样式污染、子应用 publicPath、路由 base、资源加载失败、主子应用状态同步都是坑——所以我不会只引入 qiankun，而是配套沉淀 `runtime` / `router` / `bridge-vue` / `vite-config`，把接入规范固化掉。

参考站内文档：[为什么不使用 Module Federation](./why-not-module-federation)。

---

### Q2：用了 pnpm Workspace，为什么不直接上 Nx 或 Turbo？8 个包变成 30 个还撑得住吗？

**A：** 先区分「包管理」和「任务编排」。

pnpm Workspace 解决的是 monorepo 内部依赖管理 + 本地包联调。当前阶段核心痛点是：多个子应用和基础包要统一版本、统一 TS 配置、统一构建配置、本地调试不发包。pnpm 足够，且学习成本低。

Nx / Turbo 偏任务缓存、增量构建、依赖图分析、远程缓存——它们不是不能用，而是要在以下条件出现后再引入：

| 条件                         | 是否需要 Nx / Turbo |
| ---------------------------- | ------------------- |
| 包数量 < 10、CI 压力不大     | 暂不需要            |
| 多团队并行开发、任务依赖复杂 | 需要考虑            |
| CI 构建时间成为主要瓶颈      | 需要考虑            |
| 需要 affected build / test   | 需要考虑            |

不用 multi-repo 的原因：基础包和应用是 **强耦合演进** 的；multi-repo 会带来版本发布、联调、跨仓 PR、依赖升级成本。微前端 ≠ 必须 multi-repo，尤其在中台迁移期。

升级路径：保持 pnpm workspace，CI 构建出现明显瓶颈再引入 Turbo 的 pipeline cache，而不是一开始把复杂度拉满。

---

### Q3：沉淀了 8 个基础包，边界怎么划？如果 runtime 依赖 router、router 又依赖 runtime，循环依赖你怎么拆？

**A：** 分包原则是按 **「稳定职责」** 拆，不按「技术名词」拆。包之间只能单向依赖，底层包不能反向感知业务和框架。

| 包                      | 职责                   | 不应该做什么                  |
| ----------------------- | ---------------------- | ----------------------------- |
| `@breeze/utils`         | 纯工具函数             | 不依赖 Vue / Router / qiankun |
| `@breeze/runtime`       | 通信通道、运行时上下文 | 不注册业务路由                |
| `@breeze/router`        | 动态路由、路由守卫     | 不直接操作 tab UI             |
| `@breeze/bridge-vue`    | Vue 子应用生命周期桥接 | 不承载业务协议                |
| `@breeze/vite-config`   | Vite 配置工厂          | 不引入运行时代码              |
| `@breeze/eslint-config` | 代码规范               | 不依赖应用源码                |

依赖方向：

```text
apps/*
  -> bridge-vue
  -> router
  -> runtime
  -> utils
```

如果 `runtime` 和 `router` 互相需要，**抽象协议层**，而不是互相 import：runtime 提供事件通道，router 监听或发起协议；真正需要组合的胶水代码放应用层，不让基础包互相感知。

防止循环依赖回潮的三件事：

1. `tsconfig references` 控制编译边界；
2. ESLint `import/no-cycle` 检查；
3. 包 README 明确 allowed dependencies。

---

### Q4：主子应用通信为什么不用 `window.dispatchEvent` / `postMessage` / qiankun props，非要封装 EventEmitter2？是不是过度设计？

**A：** 简单方案能做，但复杂场景下会塌方。

- `window.dispatchEvent`：能广播，但事件名散、payload 无类型、请求-响应链路弱。做"跳转后关闭当前页并返回来源页"这类双向协议会很快失控；
- `postMessage`：更适合跨窗口 / iframe / 跨域。qiankun 默认不是 iframe 隔离，主子应用同 window，用 postMessage 反而绕；
- `qiankun props`：适合初始化注入（token / basePath / userInfo），不适合做高频运行时双向通信，更像启动参数而非协议总线。

EventEmitter2 的价值：命名空间、once、off、通配监听、请求-响应封装。例如：

```ts
channel.emit('tab:navigate:request', {
  from: 'vue3-history',
  path: '/microApp/order/detail',
  query: { id: '1001' },
  requestId: 'req_001',
})
```

需要响应的场景统一带 `requestId`，约定 response 事件或 Promise 包装。

代价要主动说：本质还是全局内存对象，必须管 listener 解绑；子应用 unmount 时要清理，否则重复响应 + 内存泄漏。**所以 bridge 层统一注册和销毁，不允许业务随手挂全局监听**。

---

### Q5：在 monorepo 多应用多包里 ESLint / Prettier / Stylelint 怎么复用？规则冲突怎么处理？

**A：** 规则沉淀成 `@breeze/eslint-config`，应用和 package 只继承不复制：

```js
// apps/vue3-history/eslint.config.js
import breeze from '@breeze/eslint-config'

export default [
  ...breeze.vue3Ts(),
  {
    files: ['src/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
]
```

冲突处理原则：**格式化交给 Prettier、质量规则交给 ESLint、样式合法性交给 Stylelint**——三者职责不重叠。

monorepo 分三层：

| 层级      | 内容                                           |
| --------- | ---------------------------------------------- |
| 根目录    | 统一 scripts、lint-staged、prettier、stylelint |
| 配置包    | 可复用 ESLint presets                          |
| 应用 / 包 | 少量 override                                  |

防止规范沦为摆设：本地 `lint-staged` 卡提交，CI 跑全量 `pnpm -r lint` + `pnpm -r type-check`，新增包必须接入统一脚本，否则不允许合并。

---

### Q6：子应用接入成本 3 天 → 0.5 天，0.5 天具体省在哪？现场让你接一个新子应用，步骤是什么？

**A：** 原来的 3 天大多卡在配置 / 模板 / 协议拼装，不是写业务：

| 成本点              | 原来                          | 现在                       |
| ------------------- | ----------------------------- | -------------------------- |
| Vite / qiankun 配置 | 手写、踩 publicPath / base 坑 | `@breeze/vite-config` 生成 |
| 生命周期暴露        | 每应用复制模板                | `@breeze/bridge-vue` 封装  |
| 动态路由            | 手工注册、路径冲突            | `@breeze/router` 统一      |
| 通信协议            | 各写各的事件                  | `@breeze/runtime` 统一     |
| 主应用注册          | 多处改配置                    | 集中 registry              |
| 规范接入            | 手动复制 lint / tsconfig      | 配置包继承                 |

标准接入：

```ts
// 子应用入口
import { createQiankunVueApp } from '@breeze/bridge-vue'
import { routes } from './routes'

export const { bootstrap, mount, unmount } = createQiankunVueApp({
  App,
  routes,
  base: '/microApp/demo',
})
```

```ts
// 主应用 registry
{
  name: 'demo',
  entry: '/microApp/demo/',
  activeRule: '/microApp/demo',
  container: '#micro-app-container',
}
```

需要诚实标定：**0.5 天只覆盖微前端基础接入（创建应用、配置、注册路由、联调通信、刷新和跳转验证），不含业务开发**。

---

### Q7：动态路由为什么放到子应用 mount 阶段注册？用户直接刷新 `/microApp/order/detail/1001`，怎么保证主应用和子应用都能命中？

**A：** 主应用只负责识别"该激活哪个子应用"，不应感知子应用内部所有业务路由——否则主应用路由表会无限膨胀。

刷新链路：

1. 浏览器请求 `/microApp/order/detail/1001`；
2. 主应用 history fallback 返回 Host Shell；
3. 主应用根据 activeRule `/microApp/order` 激活对应子应用；
4. 子应用 mount；
5. 子应用按自己的 base 注册内部路由；
6. Vue Router 命中 `/detail/1001`。

最常见的坑是 **base 不一致**：主应用 activeRule、Vite base、Vue Router history base、静态资源路径必须保持一致，否则会出现"首屏能进、刷新 404、资源 404、路由空白"。

不把所有子路由提前注册到主应用，是为了守住微前端边界——否则每次子应用路由变更都要改主应用，发布耦合会重新回来。

---

### Q8：启动从 10 分钟到 90 秒，架构层面到底做了什么？这是 Vite 的功劳还是 monorepo 的功劳？

**A：** 先澄清口径——是 **本地开发环境冷启动 + 目标子应用按需启动**，不是全量启动所有子应用，也不是 CI 构建。

主要优化来源：

| 优化项              | 作用                             |
| ------------------- | -------------------------------- |
| Vue 3 + Vite        | dev server 冷启动和 HMR 明显快   |
| monorepo 本地包链接 | 基础包不必发版再安装             |
| 子应用独立启动      | 不再被绑死成一次性启动整个旧系统 |
| Vite 配置工厂       | 减少重复配置和错误配置           |
| 依赖预构建          | 降低首次启动依赖扫描成本         |
| 拆分公共包          | 避免应用内重复编译同一套工具代码 |

不会说"全是 Vite 的功劳"——Vite 提供能力，**架构改造决定能不能吃到收益**。如果业务还绑在一个巨型应用里，换 Vite 也救不了。

证明不是偶然：保留迁移前后同机器、同网络、同依赖缓存的启动耗时记录，区分 cold / warm start，CI 构建、应用 dev 启动、HMR 响应分开统计。

---

## 二、核心难点与解决方案

### Q9：子应用静态资源 404 的根因是什么？你怎么定位到不是路由问题，而是资源基准路径问题？

**A：** 表面是动态 chunk / 图片 / 字体 404，**实质是子应用构建时写死的相对路径，在主应用域名下被重新解释**。qiankun 只负责加载入口，后续 `import()` 拆出来的 chunk、CSS 中的 `url()`、字体资源仍按浏览器自己的 URL 解析规则走。

方案对比：

- 劣化：把资源都改成绝对 CDN 地址。能救急，但每环境都要重 build，灰度和多域名部署很痛；
- 劣化：主应用 nginx 上代理所有子应用资源。短期可行，但主应用被迫知道每个子应用产物路径；
- **实际采用**：Vite 子应用用 `experimental.renderBuiltUrl` 把资源路径推迟到运行时；主应用加载子应用前注入 `window.__assetsPath`；
- 备选：所有子应用部署到固定 CDN 前缀，构建时注入 `base`，要求拓扑稳定。

关键代码：

```ts
// 子应用 vite.config.ts
experimental: {
  renderBuiltUrl(filename, { hostType }) {
    return {
      runtime: `window.__assetsPath ? window.__assetsPath + ${JSON.stringify(filename)} : ${JSON.stringify(filename)}`,
    }
  },
}
```

```ts
// 主应用加载前
window.__assetsPath = getMicroAppAssetsPath(appName)
loadMicroApp({ name: appName, entry, container, props })
```

残留坑：

- `__assetsPath` 必须在子应用首个异步 chunk 触发前注入；
- 多个子应用并发加载时共享全局变量会串，要按 appName 做 map：`window.__MICRO_ASSETS__[appName]`；
- CSS `url()`、worker、wasm、动态拼接路径要单独验证。

参考实现：`apps/main-app/src/utils/microApp/assetsPath.ts`。

---

### Q10：renderBuiltUrl 为什么不直接用 `import.meta.env`？

**A：** 这道题考的是 **「资源地址是构建期决策还是运行时决策」**。

`import.meta.env` 在 Vite 构建时已被静态替换，适合固定环境，不适合主子应用跨域、同包多部署、多租户、灰度域名切换。

```ts
// 构建期固定：产物里已经是字符串
const base = import.meta.env.VITE_ASSET_BASE

// 运行时决策：同一个产物可部署到不同域名
const assetUrl = window.__assetsPath + 'assets/index-xxx.js'
```

`import.meta.env` 不是"不好"，而是它解决的是构建环境差异；而这里的问题发生在 qiankun 运行时——主应用实际把子应用挂到哪个域名 / 路径，**只有运行时知道**。

残留坑：运行时表达式让产物依赖全局协议；类型上要扩展 `Window`；同时考虑 CSP、跨域 CORS、字体跨域、缓存失效策略。

---

### Q11：那为什么不用 publicPath 运行时改写？`__webpack_public_path__` 多成熟。

**A：** Webpack 的 `publicPath` 主要影响 chunk loader，**Vite / Rollup 的资源发射模型并不等价**——产物里的资源 URL、CSS 中的 url()、`new URL('./x.png', import.meta.url)`、动态 import 解析链路完全不一样。

方案对比：

- 劣化：照搬 `__webpack_public_path__`。Webpack 子应用可行，Vite 子应用容易只修 JS chunk，漏掉 CSS / 图片 / 字体；
- 劣化：qiankun loader 里手动 replace HTML / CSS。侵入大、误替换、缓存难控；
- **实际采用**：在 Vite 资源发射源头接入 `renderBuiltUrl`，让 chunk、asset 都按同一规则输出。

```ts
function resolveAsset(filename: string) {
  const base = window.__assetsPath
  return base ? new URL(filename, base).toString() : filename
}
```

考点：候选人是否知道 **`publicPath` 是打包器运行时机制，不是浏览器标准**——qiankun 不会自动修复每个子应用内部的资源解析点。

残留坑：第三方库自己拼 URL（如 `'/static/xxx.png'`），`renderBuiltUrl` 管不到；要么改库配置，要么注入库自己的 asset base。

---

### Q12：动态权限路由是 push 模式还是 pull 模式？为什么？

**A：** 这里更接近 **push 模式**：主应用拿到后端权限路由后，加载子应用时通过 props 把 `authorizedRoutes` 推下去，子应用 mount 阶段注册自己的动态路由。

方案对比：

- 劣化：主应用维护所有子应用真实路由表 → 主应用耦合子应用内部页面结构；
- 劣化：子应用各自 pull 后端权限 → 重复请求、菜单一致性、登录态边界难收敛；
- **实际采用**：主应用统一拿权限，按子应用分发；子应用只注册自己能解释的路由；
- 备选：主应用只下发 token，子应用自己换路由（强自治团队适用，链路更长）。

```ts
// 主应用
loadMicroApp({
  name,
  entry,
  container,
  props: {
    authorizedRoutes: routesByApp[name],
    alias: menuAlias,
  },
})

// 子应用 mount
export async function mount(props) {
  MicroAppContext.setProps(props)
  dynamicRouteGuard(router, {
    routes: props.authorizedRoutes,
    resolveComponent: routeComponentMap,
  })
  app.mount(props.container)
}
```

残留坑：push 模式要求主子应用约定路由 schema；后端返回的 component key、alias、权限码必须版本兼容，否则会出现菜单有入口但页面无法解析。

---

### Q13：主应用只有 `/login` 和 `/microApp` 两个静态路由，怎么做到菜单跳到不同子应用页面？路由匹配冲突怎么解决？

**A：** URL 只是承载容器状态，**真实页面路由由 alias + 子应用内部路由共同决定**。主应用不需要注册每个业务页面，只需把当前菜单解析成「目标子应用 + 子应用内路径 + 参数」。

```ts
watch(
  () => route.fullPath,
  async () => {
    const matched = aliasMap.resolve(route.fullPath)
    if (!matched) return showNotFound()

    await microAppStore.switchTo({
      appName: matched.appName,
      entry: matched.entry,
      innerPath: matched.innerPath,
      props: {
        alias: matched.alias,
        authorizedRoutes: matched.routes,
      },
    })
  },
)
```

冲突优先级：越具体的 alias 越优先，避免 `/order/:id` 抢掉 `/order/create`：

```ts
aliasRules.sort((a, b) => b.specificity - a.specificity)
```

残留坑：同一路径 alias 到不同子应用时，**必须额外带 `appName` 或菜单 id**，否则浏览器 URL 无法唯一表达目标；刷新恢复、复制链接、面包屑回显都会受影响。

---

### Q14：同一菜单在不同子应用间「无感切换」，你怎么保证不是简单 iframe 式跳转？

**A：** 不只是改 URL 或重载 entry——容器、权限、路由状态、tab 状态要一起切换，否则用户会感知白屏 / 状态丢失 / 菜单高亮错乱。

```ts
async function switchMicroApp(target) {
  const current = activeMicroApp.value
  if (current?.name === target.appName) {
    current.update?.({ innerPath: target.innerPath })
    return
  }
  await maybeUnmount(current)
  activeMicroApp.value = loadMicroApp({
    name: target.appName,
    entry: target.entry,
    props: buildProps(target),
  })
}
```

残留坑：**「无感切换」≠「不卸载」**。

- 保活策略过宽 → 后台定时器、WebSocket、全局事件会积累；
- 卸载太积极 → 用户丢状态。

所以必须 **和 tab 生命周期绑定，而不是只和菜单点击绑定**。

---

### Q15：子应用 KeepAlive 为什么不能只用 Vue 自带 KeepAlive？真正保活的是什么？

**A：** 这里的"页面状态丢失"实质是 **qiankun 子应用实例生命周期 ≠ Vue 组件缓存生命周期**。Vue `KeepAlive` 缓的是组件 vnode；qiankun 默认切换时 `unmount` 整个子应用——根实例都销毁了，组件缓存自然也没了。

方案对比：

- 劣化：只在子应用内部包一层 `<KeepAlive>` → 同应用内部路由切换有效，跨子应用切换无效；
- 劣化：所有 qiankun 实例永不 unmount → 状态保住了，但内存泄漏 + 权限变更风险高；
- **实际采用**：`tabBarStore` 用 `fullPath` 维护 tab Map（持久化到 localStorage），按 tab 生命周期决定保留 / 回收对应子应用实例；
- 备选：用 qiankun `loadMicroApp` 手动管实例池，以 appName + routeKey 为粒度。

```ts
const tabs = new Map<string, TabRecord>()

function openTab(route) {
  tabs.set(route.fullPath, {
    appName: resolveApp(route),
    fullPath: route.fullPath,
  })
}

function closeTab(fullPath: string) {
  const tab = tabs.get(fullPath)
  tabs.delete(fullPath)

  if (!hasTabOfApp(tab.appName)) {
    microAppStore.unmount(tab.appName)
  }
}
```

残留坑：保活的是 **「子应用实例 + 子应用内部路由状态 + 页面组件状态」** 的组合，不是单纯 Vue KeepAlive。刷新浏览器后 localStorage 能恢复 tab 列表，但不能恢复内存中的组件实例——除非业务页自己做状态持久化。

---

### Q16：KeepAlive 用 fullPath 做 key，那相同 fullPath 不同子应用怎么办？

**A：** 这道题在揭穿"URL 唯一标识页面"的假设。在微前端里，**URL 未必能唯一标识业务实例**。

方案对比：

- 劣化：只用组件名做 key → 订单详情 A / B 互相覆盖；
- 劣化：只用 `fullPath` → 同路径不同子应用冲突；
- **更稳妥**：tab key = `appName + fullPath + aliasId/menuId` 复合 key；如果当前实现只基于 `fullPath`，要明确前提是 **alias 全局唯一**；
- 备选：后端菜单直接下发 `tabKey`，主应用透传。

```ts
function buildTabKey(input: {
  appName: string
  fullPath: string
  menuId?: string
  alias?: string
}) {
  return [input.appName, input.menuId ?? input.alias ?? input.fullPath].join(
    '::',
  )
}
```

如果候选人坚持"fullPath 一定唯一"，会继续追问：**灰度迁移时同一菜单从老子应用切到新子应用，URL 保持不变，怎么区分旧实例和新实例？**

残留坑：key 升级会影响已有 localStorage 数据，要做兼容迁移；否则用户升级后可能出现旧 tab 无法关闭或错误恢复。

---

### Q17：无同应用 tab 时自动 unmount，那用户快速切换 tab 抖动怎么办？有没有引用计数？

**A：** 这道题考的是 **并发切换 / 异步加载 / 重复关闭 / 快速重开** 的鲁棒性。如果没有引用计数或延迟回收，快速切换会出现"刚 unmount 又 load"，甚至异步回调落到已销毁实例上。

方案对比：

- 劣化：关 tab 立即 `unmount()` → 简单，但抖动明显；
- 劣化：永不卸载 → 体验稳定，但资源不可控；
- **实际建议**：以 `appName` 维护引用计数 / 活跃 tab 集合 + 短延迟回收窗口；
- 备选：LRU 实例池，超上限再淘汰最久未访问。

```ts
const refs = new Map<string, Set<string>>()
const unmountTimers = new Map<string, number>()

function retain(appName: string, tabKey: string) {
  clearTimeout(unmountTimers.get(appName))
  getSet(refs, appName).add(tabKey)
}

function release(appName: string, tabKey: string) {
  refs.get(appName)?.delete(tabKey)

  if (refs.get(appName)?.size === 0) {
    const timer = window.setTimeout(() => {
      if (refs.get(appName)?.size === 0) {
        microAppStore.unmount(appName)
      }
    }, 300)
    unmountTimers.set(appName, timer)
  }
}
```

残留坑：引用计数必须和真实 tab 增删保持一致——异常路由、浏览器回退、刷新恢复、关闭当前激活 tab 都要覆盖；否则会出现引用泄漏，导致子应用永远不卸载。

---

### Q18：为什么不用 shadow DOM 隔离？scoped 模式下旧框架的 `:root` / `body` 选择器怎么处理？

**A：** 不同隔离模式会改变 **CSS 选择器语义和 DOM 继承模型**。

`experimentalStyleIsolation: true` 是 scoped 模式（给子应用样式选择器加作用域前缀），不是 shadow DOM。shadow DOM 隔离更强，但旧 UI 框架如果依赖全局弹层、`document.body`、CSS 变量、字体、reset，迁移成本会更高。

方案对比：

- 劣化：完全不开隔离 → 主应用和子应用样式互相污染；
- 劣化：直接上 shadow DOM → 弹窗挂 body、全局主题变量、第三方组件库 overlay 容器都会出问题；
- **实际采用**：理解 scoped 边界，对旧框架的全局样式做定向改造或外层命名空间收敛；
- 备选：新老分层治理——旧系统单独沙箱容器，新系统按 CSS Modules / BEM / design token 重构。

处理方式：

```css
/* 原旧框架 */
:root {
  --brand-color: #1677ff;
}
body .legacy-button {
  font-size: 14px;
}

/* 改成子应用容器内变量和命名空间 */
.micro-app-legacy {
  --brand-color: #1677ff;
}
.micro-app-legacy .legacy-button {
  font-size: 14px;
}
```

```ts
export async function mount(props) {
  const container = props.container.querySelector('#app')
  container.classList.add('micro-app-legacy')
  app.mount(container)
}
```

残留坑：

- `body > .modal`、`message`、`popover` 这类 teleport 到 body 的组件不会天然落在子应用容器内——要配置 `getPopupContainer`，或在弹层根节点补子应用 class；
- scoped 模式可能破坏依赖 `html` / `body` / `:root` 的选择器，需要逐类梳理，**不要指望 qiankun 自动兜底**。

---

## 三、性能、效能与协作量化

### Q19：首屏资源体积下降 35%，我不太信。你怎么测的？基线是什么？gzip 后还是 raw？

**A：** 这个 35% 不是全站平均值，**而是核心工作台首页 + 两个高频业务入口的首屏 JS / CSS 资源口径**，gzip 后体积。基线是迁移前的线上稳定版本，优化后取灰度全量后的同一入口版本。

测量手段：

- `webpack-bundle-analyzer` / `rollup-plugin-visualizer`：raw / gzip / 模块组成；
- Chrome DevTools Coverage：首屏未使用代码比例；
- CI 构建产物统计：防止后续回涨；
- Sentry RUM / 自研埋点：验证体积下降是否反映到用户体验。

为什么用 gzip 而不是 raw：raw 体积下降更大，但 **用户实际下载更接近 gzip / br 后体积**，拿 raw 数据对外沟通不诚实。

贡献最大的三件事：

1. 子应用按路由拆分，避免主应用一次性拉全量业务代码；
2. 重型依赖外置或替换（日期、图表、富文本相关）；
3. 通用基础包去重，减少多个子应用重复打包。

局限：低频复杂页（图表、导出、编辑器）首屏体积下降有限，甚至会因功能增强而上涨。所以更看重 **「核心入口下降 35% + 体积预算机制建立」**，而不是宣称所有页面都下降 35%。

---

### Q20：LCP 4.2s → 1.8s，是不是偷偷切 SSR 了？

**A：** 没切 SSR，仍是 CSR 架构。

LCP 元素在核心首页主要是 **首屏业务卡片区域的容器标题和主数据块**，不是 logo 或骨架屏——明确排除了"骨架屏成为 LCP 导致指标好看但用户没内容"的情况。

测量分两类：

- 实验室数据：Lighthouse、WebPageTest，固定网络和设备条件；
- 真实用户数据：Sentry RUM + 自研 `performance.getEntriesByType` 埋点（LCP / FID / INP / CLS / 资源耗时 / 接口耗时）。

  4.2s → 1.8s 是 **Chrome 中端设备模拟 + Fast 4G 条件下核心入口 P75**。3G 下没这么好，优化后大概仍在 3s+——这个我会主动说，因为 LCP 强依赖网络 / 接口 / 设备，不能只报漂亮数字。

主要优化：

- 首屏接口聚合，减少瀑布请求；
- 路由级代码分割，非首屏模块延迟加载；
- 图片和图标资源压缩，关键资源预加载；
- 拆掉部分同步初始化逻辑，降低主线程阻塞；
- 子应用预加载从"全部预加载"改成"按权限和访问概率预加载"。

权衡：预加载减少 → 部分二级页面首次进入稍慢，但核心入口明显变快——按访问频次做分层策略，不全局追求一个指标。

---

### Q21：启动时长 10 分钟到 90 秒，太夸张了。是 dev server 启动还是冷启动？子应用是不是没全启？

**A：** 这个指标说的是 **本地开发环境从启动命令到可访问目标业务页面的时间**，不是生产冷启动，也不是 CI 构建。

迁移前 10 分钟主要来自：

- 多个子应用全量启动；
- webpack dev server 编译慢；
- 公共依赖重复编译；
- 本地代理和 mock 初始化链路混乱；
- 新人不知道只启动自己负责的模块。

优化后 90 秒是 **目标子应用按需启动**，不是全量启动所有子应用。这个边界必须说清楚。

Vite 贡献最大的配置：

- `optimizeDeps.include / exclude` 控制依赖预构建；
- monorepo 内部包源码联调，但避免不必要的全量扫描；
- `server.fs.allow`、alias、workspace 解析收敛；
- 拆分 mock、代理、权限初始化逻辑；
- 子应用按需启动脚本（如只启动 `main + 当前子应用`）。

启动埋点把"安装依赖、依赖预构建、dev server ready、页面可用"分段记录，否则 10 分钟到 90 秒容易变成口头感受。

局限：首次安装、清空缓存、切分支后依赖大变更时启动时间会回升。所以区分了「首次冷启动 / 日常热启动 / 目标子应用启动」三个指标。

---

### Q22：新人上手 2 周到 3 天，怎么定义「上手」？是不是只是能把项目跑起来？

**A：** 不是只跑起来。"上手"定义为 **新人能独立完成一个标准 CRUD 需求**：页面创建、接口联调、权限接入、表单校验、列表分页、提测、Code Review 通过。

衡量方式不是特别精密，但有记录：

- 新人入职 / 转组后的第一个需求耗时；
- 第一次有效 MR 的提交时间；
- Code Review 中的重复性问题数量；
- 是否需要老同事持续手把手支持。

文档体系分三层：

1. 快速启动：环境、命令、常见问题、权限和 mock；
2. 开发手册：路由、菜单、权限、接口、状态管理、微前端接入；
3. 场景模板：列表页、表单页、详情页、弹窗、国际化、埋点。

也有脚手架，不是从空白文件开始——会生成页面目录、路由配置、接口模板、基础测试和约定好的组件写法。

局限：3 天适用于有 React / Vue 和前端工程经验的人。完全不了解业务或工程基础弱的新人仍需更长时间——**真正减少的是「摸索项目约定」的时间，不是把业务理解成本变没**。

---

### Q23：单需求 1 周到 2 天，是不是只统计了最简单的需求？复杂需求也能降这么多？

**A：** 这个指标只适用于 **标准化程度高的中后台需求**：列表、筛选、分页、表单、详情、权限、简单导入导出。复杂流程编排、跨系统联调、图表分析类需求没这么大降幅。

口径：历史需求池里同类需求的平均开发周期，从进入开发到提测，**不包含产品反复改需求和外部接口阻塞时间**。这个口径有局限，所以不会说所有需求都从 1 周变 2 天。

降幅来源：

- `table-pagination` 统一分页表格；
- `form-builder` 统一表单校验、提交、错误处理；
- 基础包封装权限、请求、埋点、异常处理；
- 脚手架减少重复目录和配置；
- Code Review checklist 减少返工。

复杂需求也会受益，但更多是减少样板代码和低级错误——可能从 2 周降到 1.5 周，**而不是直接降到 2 天**。

权衡：模板化提升一致性，但可能让新人不理解底层机制。所以要求模板生成的代码 **可读、可改、不做黑盒魔法**。

---

### Q24：业务零中断 + 回滚粒度到单子应用，灰度怎么做？回滚 SLA 多少？最大事故是什么？

**A：** 灰度不是一次切，而是 **按模块 / 路由 / 租户 / 用户角色逐步切**。主应用维护路由映射和子应用版本配置，某个模块可以指向旧应用，也可以指向新子应用。

回滚到单子应用粒度依赖三件事：

- 子应用独立构建、独立发布、独立版本号；
- 主应用通过配置中心 / 发布平台控制入口版本；
- 公共协议稳定（路由参数、登录态、权限、事件通信不能随便破坏）。

回滚 SLA：内部要求 P0 问题 **10 分钟内入口回切，30 分钟内给出影响面和后续处理**。实际做到过几分钟内切回，但依赖发布平台和缓存策略，不能只靠人工重新发版。

最大事故：公共依赖版本不一致导致某子应用在灰度用户下白屏。后续补了：

- 子应用启动健康检查；
- 灰度前自动冒烟；
- 主应用加载失败 fallback；
- 发布后关键指标监控；
- 公共包版本兼容策略。

诚实标定：**「零中断」指用户侧没有发生全站级不可用，不代表没有局部 bug**。

---

### Q25：AI Skill 工具链听起来很玄。i18n-replace 这些是 LLM 生成还是规则模板？误改怎么处理？为什么不是 codemod？

**A：** **不是完全让 LLM 自由生成代码**。核心链路是「规则模板 + AST/codemod + LLM 辅助判断」的组合。

以 `i18n-replace` 为例：

- AST 扫描 JSX / TS / 配置对象里的中文字符串；
- 规则判断哪些能替换、哪些跳过（日志、测试快照、第三方配置）；
- 生成 key、语言包和替换补丁；
- LLM 主要用于命名建议、上下文分类、复杂文案归类；
- 最后必须跑类型检查、lint、单测、人工 review。

误改防护：

- 默认生成 diff，不直接提交；
- 高风险文件只标记建议，不自动改；
- 保留回滚 patch；
- CI 校验语言包 key 缺失 / 重复 / 未引用；
- 抽样人工验收高频页面。

为什么不是纯 codemod？**有些场景需要语义判断**——中文文案到底是按钮、提示、表格列名还是业务状态，纯规则生成的 key 可维护性差。

为什么不是纯 Skill / LLM？不可控——容易上下文丢失、误改变量、破坏格式。最终把 Skill 定位成 **「工程流程入口」**，底层仍然尽量使用 AST 和确定性规则。

局限：复杂业务文案、多语言语序差异、动态拼接字符串仍需要人工介入。**+80% 是批量提取阶段的效率提升，不代表国际化整体成本下降 80%**。

---

### Q26：30+ 通用组件你怎么避免过度封装？有没有用了几次又拆回业务里的？

**A：** 有这个风险，而且确实踩过。后来定了组件进入通用库的门槛：

- 至少 3 个以上子应用真实复用；
- API 稳定，不把单个业务流程塞进去；
- 有文档、示例、变更记录；
- 有明确 owner；
- 允许业务侧扩展，而不是只能等组件库发版。

组件分三类：

1. **基础展示组件**：稳定，可长期维护；
2. **业务模式组件**：分页表格、查询表单——有约束但收益高；
3. **业务强绑定组件**：原则上不进通用库，只放业务包里。

反向迁出例子：「高级筛选面板」一开始想统一所有业务筛选，后来发现不同业务的字段联动、权限、默认值差异太大，封装后参数爆炸——最后拆成「基础筛选容器 + 各业务自己组合字段」。

权衡：覆盖度高 → 一致性 + 交付速度 → 学习成本上升。所以后来更强调 **「组合能力」而不是「大而全组件」**。

---

### Q27：基础包升级时多个子应用怎么同步？没人升怎么办？难道靠群里喊？

**A：** 不能只靠群通知。

机制层面：

- 基础包语义化版本管理，明确 breaking change；
- changelog 写迁移影响和示例；
- 提供自动升级脚本或 codemod；
- CI 检查高风险旧版本；
- 发布平台展示各子应用基础包版本分布；
- 每个子应用有 owner，升级责任能对应到人。

没人升的两种处理：

- **安全 / 稳定性 / 兼容性问题**：设 deadline，必要时阻断发布；
- **普通能力升级**：不强推，提供收益说明和迁移工具。

对 breaking change：先做兼容层，给一个迁移窗口——技术上能强制，**组织上不一定可行**。

局限：业务团队短期交付压力大时，基础包升级一定会被延后。技术负责人要把升级收益讲清楚（减少线上故障 / 减少重复代码 / 支持新能力），而 **不是包装成「架构洁癖」**。

---

### Q28：项目从 0 重做，你会改哪三件事？我不想听「做得更好」这种空话。

**A：**

**第一，更早建立指标体系，而不是优化后再补统计。**

一开始就定义资源体积、LCP、启动耗时、构建耗时、接入耗时、交付周期、回滚耗时的采样口径。这样成果更可信，也避免团队争论"到底有没有变快"。

**第二，更早控制微前端边界。**

微前端不是越拆越好。早期有些模块拆得偏细，带来通信、依赖、发布协调成本。如果重做，会按 **业务自治边界、发布频率、团队 ownership** 拆，而不是只按页面结构拆。

**第三，更早把工具链产品化。**

脚手架、Skill、组件文档、升级脚本一开始只是少数核心同学会用，后来才补文档和流程。如果从 0 来，会把它们当 **内部产品** 做：使用文档 / 版本记录 / 反馈入口 / owner / 成功指标。

这三件事背后的教训是：**技术方案本身不是最难的，难的是让不同经验水平、不同业务压力的人持续用起来，并且不因为架构升级影响交付节奏**。
