---
title: 微前端架构面试 QA
outline: deep
---

# 微前端架构面试 QA

本文整理微前端项目架构、公共能力建设和 Monorepo 相关的面试问题及回答。

## 1. 子应用切换 keepAlive 保活

**背景**

- 子应用切换时如果直接卸载，页面实例会被销毁，表单等内部状态也会丢失。

**解决方案**

- 通过 `loadMicroApp` 手动加载子应用，每个子应用保留独立的挂载容器，已加载的实例直接复用。
- 切换时使用 `v-show` 控制显隐，不销毁子应用；该子应用的所有页签关闭后，再卸载整个应用实例。
- 应用隐藏后，定时器、全局监听等仍可能运行，需要在失活时暂停、卸载时清理。

## 2. 解决 Vue KeepAlive 的原生限制

**背景**

同一页面可以通过不同参数打开多个页签，例如分别编辑订单 A（`?id=1`）和订单 B（`?id=2`）。

- **不设置 `key`**：`KeepAlive` 默认使用组件类型作为缓存键。因此，同一个路由组件即使通过不同的路由路径或参数访问，通常会复用同一个组件实例。导致修改 B 的表单内容后，切回 A 时，A 也会显示 B 修改后的内容。
  > 通过 onBeforeRouteUpdate 或 watch 监听路由参数变化，更新业务数据。
- **设置 `route.fullPath` 作为 `key`**：A 和 B 可以使用各自的缓存实例，但 `include` 和 `exclude` 只能按组件 `name` 筛选，无法直接按 `key` 单独清除某个 Tab 的缓存。如果移除该组件名，会同时影响这个组件的其他缓存实例。

**解决方案**

1. 使用 `route.fullPath` 作为 `key`，让同一个路由组件的不同页面独立缓存。
2. 通过 `h()` 包装路由组件，创建新的虚拟 DOM 节点：
   - `name` 设为 `route.fullPath`，用于 `include` 匹配；
   - `render` 返回 `RouterView` 插槽提供的原组件 VNode。
3. 使用 `Map` 按 `fullPath` 存储新创建的 vnode 避免重复创建导致缓存失效。

```vue
<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive :include="include">
      <component
        :is="wrapKeepAliveComponent(Component)"
        :key="route.fullPath"
      />
    </KeepAlive>
  </RouterView>
</template>

<script>
// 简化示意：实际实现会按 fullPath 复用包装组件定义
h({
  name: route.fullPath,
  render() {
    return component
  },
})
</script>
```

**子应用切换**

- **关闭页签**：主应用通知子应用，按 `fullPath` 清理对应缓存。
- **切换应用**：切走时，`RouterView` 因路由不匹配而变空，不渲染任何组件，正常触发 `onDeactivated`；切回时恢复缓存，正常触发 `onActivated`。

## 3. Vite 动态修改 base

### 子应用加载的资源 404

#### 原理

qiankun 借助 `import-html-entry` 解析子应用 HTML 时，会把收集到的外部样式 `href` 和外部脚本 `src` 的相对路径，按照子应用的资源路径补成完整 URL 再请求资源。

#### 问题

Vite 还有两类资源路径需要单独处理：

1. **入口 HTML**
   - `vite-plugin-qiankun` 改写入口脚本产生的内联 `import()` 地址
   - Vite 分包后生成的 `modulepreload` 预加载链接地址
2. **异步 chunk 模块加载**
   - 懒加载 `import()` 触发时，Vite 动态创建 `modulepreload` 预加载，并行请求异步 chunk 及其公共 JS 依赖，减少串行加载的等待；
   - 默认启用 CSS 代码分割，通过 `<link rel="stylesheet">` 加载对应样式。

> 使用 Vite 默认的 `base: '/'` 构建时，会生成根路径 URL，浏览器会按主应用的 origin 解析，导致资源 404。

### 解决方案

**开发环境**：Vite 通过 `server.origin` 配置子应用完整 URL。

#### 方案一：完整的 URL

- 子应用通过 Vite 的 `base` 或者 Webpack 的 `output.publicPath` 配置为完整的 URL 可以解决问题。
- 但会把部署地址写入产物。我们希望灰度验证完成后将用一份构建产物直接部署生产，而不是重新构建。

#### 方案二：运行时指定资源路径

**Webpack**

子应用可以在业务模块执行前，将 `__webpack_public_path__` 全局变量设置为 qiankun 注入的 `window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__` 实现运行时指定资源路径。

**Vite**

1. 子应用把 `base` 设为 `./`，打包后的资源就使用相对路径。懒加载时，Vite 会以发起导入的 JS 文件地址（`import.meta.url`）为基准解析这些路径，让 JS 预加载和 CSS 请求都指向子应用。
2. 主应用通过 qiankun 的 `getTemplate` 钩子处理入口 HTML，将 `./` 开头的相对路径按子应用 `entry` 补全为完整 URL。

### 入口 CSS 文件中的 `url()`

背景：生产环境下 qiankun 通过 fetch 获取入口 CSS 后内联成 `<style>`。其中 `url()` 的相对路径会改为按主应用页面地址解析，会导致图片、字体资源 404。

解决方案：通过 qiankun 的 `fetch` 拦截 CSS 文件，把文件中的 `./` 相对路径补全为完整 URL。

## 3. `resume/resume-crm.md` 里这个项目，前端架构负责人主要做了什么？

**A：** 不是只做“技术选型”，而是把微前端从概念落成一套可以持续接入、持续演进的工程体系。

可以拆成 5 件事来讲：

### 1. 定整体方案，明确演进路径

- 选择 `qiankun` 作为应用级编排层，解决主应用加载、挂载、卸载子应用的问题；
- 选择 `Vue 3 + Vite` 承接新子应用；
- 保留旧 `Vue 2 + Webpack` 子应用接入能力，支持存量系统灰度迁移；
- 选择 `pnpm workspace` 作为 Monorepo 基建，让共享包、工程配置和本地联调统一管理。

这一步的关键不是“选了什么技术”，而是**保证新旧系统能并存，迁移过程不断业务**。

### 2. 搭主应用壳层，把编排能力做完整

主应用不是只渲染一个容器，而是负责一整套运行时编排：

- 维护子应用注册表，统一管理 `activeRule`、`entry`、`container`；
- 根据当前路由识别激活子应用；
- 通过 `loadMicroApp()` 管理挂载、切换和卸载；
- 把 `authorizedRoutes`、`userData`、`activeRule` 等上下文通过 `props` 下发给子应用；
- 和菜单、标签页、KeepAlive、实例回收逻辑协作。

对应仓库里的关键实现可以直接落到这些文档：

- [子应用注册表](../../qiankun/micro-app-registry)
- [子应用状态管理](../../qiankun/micro-app-store)
- [路由协作机制](../../qiankun/routing-mechanism)

### 3. 抽公共基础包，把“接入成本”从人肉经验变成标准能力

这个项目里，架构负责人更重要的产出通常不是某个页面，而是把重复问题抽成共享层：

- `@breeze/runtime`：主子应用共享运行时、事件通道、类型定义；
- `@breeze/router`：动态路由和权限注册；
- `@breeze/bridge-vue`：把 qiankun 生命周期和 Vue 应用初始化桥接起来；
- `@breeze/vite-config`：统一子应用 Vite 接入方式；
- `@breeze/components`、`@breeze/utils`、`@breeze/i18n`：沉淀可复用基础能力。

这类包的价值是：**新应用接入时不再从零拼装微前端能力，而是按约定消费现成基建。**

### 4. 解决迁移期的硬问题

真正体现架构价值的通常不是 happy path，而是这些问题有没有被系统解决：

- `activeRule`、Vue Router `base`、资源路径三者如何保持一致；
- Vite 子应用如何接入 qiankun，而不是停留在“理论上可行”；
- 老 `Webpack + Vue 2` 子应用如何兼容接入；
- 子应用切换时如何处理 KeepAlive、实例复用和真正 `unmount`；
- 子应用资源、样式、全局副作用如何清理和兜底。

对应深挖资料：

- [qiankun 原理](../../micro-frontend/qiankun-principle)
- [vite-plugin-qiankun 解决了什么问题](../../micro-frontend/vite-plugin-qiankun)
- [OCRM 接入问题排查](../../qiankun/ocrm-troubleshooting)

### 5. 把方案沉淀成团队可复用规范

前端架构负责人最后要对“团队效率”负责，而不是只对“自己能做出来”负责：

- 统一 `tsconfig`、ESLint、Stylelint、提交规范；
- 统一 workspace 依赖管理和共享脚本；
- 补齐接入文档、原理文档、踩坑文档；
- 让新子应用接入流程更标准，减少对个人经验的依赖。

**一句话收口：** 这个角色更像“前端平台 / 微前端基础设施 owner”，核心工作是定边界、做底座、解迁移难题、降团队接入成本。

## 4. Monorepo 在这个项目里担任了什么角色？

**A：** Monorepo 在这个项目里主要负责**研发阶段的协同和基础设施沉淀**。我们把 `runtime`、`router`、`bridge-vue`、`vite-config` 这类共享能力都放在同一个仓库里，方便统一维护和源码联调。

这样做的价值是，子应用可以继续独立运行、独立部署，但底层基建、工程规范和公共包不用每个项目重复造一遍。

所以可以简单理解成：**qiankun 解决运行时集成，Monorepo 解决研发期协作。**

## 5. 如果 Monorepo 里改了公共组件，是不是每个子应用都要重新部署？怎么解决？

**A：** 如果公共组件是通过 `workspace` 包在构建期打进各个子应用里的，那原则上**需要重建受影响的子应用**，因为组件代码已经进了它们各自的 bundle。

很多人会说“那做成组件库不就行了”，但如果这个组件库还是通过 npm / workspace 安装，最后一样会被打进子应用产物里，本质上还是**构建期依赖**，所以改了组件库之后，受影响的子应用照样要重新部署。

这个问题我一般分两层处理：**稳定的基础组件继续走 Monorepo 共享 + 自动化 affected deploy**，只发布真正依赖它的子应用；**需要高频独立发布的组件**，再考虑做成运行时共享，比如独立组件服务或 Module Federation。

所以本质上不是“Monorepo 怎么做到完全不用部署”，而是要区分：**构建期共享的东西走受影响发布，运行时共享的东西再做远程化。**

## 6. 模块联邦 Module Federation 的区别是什么？

**A：** 因为我们当前要解决的是**应用级编排**，不是模块级共享。这个项目需要主应用按路由加载完整子应用，还要统一处理菜单、权限、标签页、挂载卸载和新旧系统并存，这些更适合 qiankun。

qiankun 和 Module Federation 的核心区别是：**qiankun 管的是完整子应用，Module Federation 管的是远程模块**。前者更适合微前端壳和生命周期管理，后者更适合跨应用共享组件或能力模块。

所以对这个项目来说，qiankun 是主方案；如果以后要做远程组件共享，Module Federation 可以作为补充，而不是替代。

## 7. Web Components

Web Components 可以作为“胶水层”，让各个子应用共享通用组件，而无需担心框架冲突
