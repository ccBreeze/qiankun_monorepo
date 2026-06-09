---
title: 微前端原理面试 QA
outline: deep
---

# 微前端原理面试 QA

本文整理 qiankun、Vite 及微前端隔离机制相关的原理面试问题与回答。

## 为什么要使用微前端？

我们使用微前端，主要是为了在保障存量业务稳定的前提下，逐步升级旧系统。原系统基于 Vue2 + Webpack 和自研 UI 框架，技术栈落后、遗留问题多、上手成本高，单次启动或构建超过 10 分钟，已经影响需求交付效率。

通过微前端让新旧应用共存，新需求使用 Vue3 + Vite 独立开发和构建，再按模块逐步替换旧业务，降低一次性重写的风险。

## 1. 为什么不用 iframe

1. 浏览器刷新 iframe url 状态会丢失、前进后退按钮无法使用。
2. 弹窗只能在 iframe 内部展示，无法覆盖全局。
3. 通信困难。只能走 postMessage / localStorage 等迂回通道。
4. 每次打开白屏时间太长，对于SPA 应用来说无法接受。

## 2. 技术选型：为什么选择 qiankun 而不是 Garfish / wujie / micro-app

我们旧项目是 Vue 2 + Webpack，选型时首先考虑的是怎么保留原有业务，等后续有机会再逐步重构。qiankun 对这套技术栈有成熟的接入方案，改造成本比较可控。

新项目使用 Vue 3 + Vite 技术栈，关于 qiankun 不支持 Vite 问题，通过引入 vite-plugin-qiankun 解决，代价是放弃 ESM 代码的 JS 沙箱隔离。字节的 Garfish 框架也是采用放弃 JS 沙箱隔离的方案。

另外，相比其他框架，qiankun 的 GitHub Star 量最多 issues 活跃。在写 Demo 时遇到的问题，都能从官方文档和已有 issues 中找到解决方案，这让我对后续落地更有把握。

所以关于技术选项：我们更看重**旧项目的迁移成本和框架生态的成熟度**

## 3. qiankun 为什么不支持 vite

根本原因是**qiankun 的 JS 沙箱执行与 Vite 的原生 ESM 不兼容**：

1. qiankun 会先用 `fetch` 获取子应用的 JS 文本，创建 JS 沙箱后通过 `eval` 执行，实现隔离。
2. Vite 构建后的入口是原生 ES Module，通过 `<script type="module">` 标签加载，依赖和后续 chunk 都通过静态 `import` 加载。
3. 而 qiankun 使用 `eval` 执行普通脚本，不支持静态 `import`、`export`，所以直接执行 Vite 的 ESM 产物时会报 `SyntaxError` 语法错误。

## 4. vite-plugin-qiankun 原理

主要解决两个问题：

1. Vite 的 ESM 入口不能直接通过 qiankun 的 `eval` 执行；
2. 生命周期通过 ESM `export` 导出，会保留在模块命名空间中，qiankun 的普通脚本执行链路无法直接获取。

**编译时：**

1. 通过 Vite 的 `transformIndexHtml()` 钩子把 module script 改成普通 `<script>` 中的动态 `import()`。
2. 向 HTML 注入 `bootstrap`、`mount`、`unmount` 占位函数，返回 Promise，等待真实生命周期回填后再调用。

**运行时：**

1. qiankun 先在 JS 沙箱中执行注入脚本，从 `window[appName]` 获取占位生命周期。动态 `import()` 可以在普通脚本的 `eval` 中执行，实际的 ESM 加载和执行则交给浏览器。
2. 子应用入口通过 `renderWithQiankun()` 将真实生命周期注册到插件维护的全局映射中；子应用入口通模块加载完成后，插件读取并回填真实生命周期，结束 Promise 等待，最终由 qiankun 调用真实的生命周期函数。

::: warning Vite 原生 ESM 绕过 JS 沙箱

- `vite-plugin-qiankun` 会把 Vite 入口的 `<script type="module">` 改写成普通脚本中的动态 `import()`。

- 动态 `import()` 可以在普通脚本的 `eval` 中执行，不会像静态 `import` 一样在解析阶段抛出语法错误。代码执行到 `import()` 时，浏览器再通过原生 ESM loader 加载和执行 EMS 模块

因此 ESM 代码会绕过 qiankun 的 JS 沙箱，产生副作用逃逸。

:::

## 5. qiankun 原理

1. 通过 `registerMicroApps()` 注册子应用，路由命中 `activeRule` 时自动加载子应用；也可以调用 `loadMicroApp()` 手动加载。
2. `import-html-entry` 请求并解析子应用的入口 HTML，提取 CSS/JS，将外部导入的相对路径按子应用 entry 入口补成完整 URL；
3. 外部 CSS 会被拉取并内联为 `<style>`，生成处理后的 HTML 模板。
4. qiankun 创建子应用容器和 JS 沙箱，获取普通脚本的代码文本，包装并注入沙箱代理后，通过 `eval` 执行。入口脚本执行完成后，从导出结果或沙箱全局变量中获取子应用生命周期。
5. 由 `single-spa` 调度：`bootstrap` 负责首次初始化，`mount` 将模板渲染到子应用容器并挂载应用，`unmount` 卸载应用、清理模板，并配合沙箱补丁回收可追踪的副作用。

## 6. JS 沙箱隔离

### 隔离全局变量

作用：限制子应用对 `window` `self` `globalThis` **全局对象**的读写，避免不同子应用互相覆盖；

原理：qiankun 加载 HTML Entry 后，会创建当前子应用的 `proxy`，再把普通脚本包装在 `with (window)` 的 IIFE 自执行函数中，通过 `eval` 执行。

```ts
eval(`
  (function (window, self, globalThis) {
    with (window) {
      // 子应用 JS 文本
    }
  }).bind(window.proxy)(window.proxy, window.proxy, window.proxy)
`)
```

两种沙箱模式：

- **`LegacyProxySandbox`（单实例）**：代理真实 window。
- **`ProxySandbox`（多实例）**：每个子应用创建独立的 `fakeWindow` 作为代理目标，普通全局属性写入保存在自身，读取时先查自身，再回退到真实 `window`。

### 副作用补丁

代理 `window` 只能限制属性读写，无法自动清理浏览器 API 创建的资源，因此 qiankun 通过 patcher 包装相关 API，按子应用追踪和处理副作用：

- `setInterval` 定时器
- `window` 全局事件监听
- 拦截 `document.body` 动态插入 `<script>` 脚本，使普通脚本通过沙箱执行。
- 拦截 `document.head` 动态插入 `<style>` / `<link>` 样式，将样式挂载到子应用容器，并在容器卸载时一并移除。

`unmount` 时清理这些副作用；未被补丁追踪的副作用仍需子应用主动清理。

::: warning 无法通过劫持进行收集的副作用：持久化存储与跨应用状态

- `localStorage` / `sessionStorage`
- `cookie`
- `IndexedDB`

:::

## 7. 副作用有哪些？Vite 中 JS 沙箱隔离失效如何解决？

qiankun + Vite 项目中，原生 ESM 由浏览器加载执行，会绕过 qiankun 的 JS 沙箱。

副作用主要包括：

- 全局变量；
- 定时器；
- 全局事件监听；
- `document.body` / `document.head` 动态插入的 DOM 和样式；
- 浏览器存储，如 `localStorage`、cookie。

解决方案：

- **避免创建全局变量**：全局变量容易出现命名冲突，来源不清晰，维护和调试成本高。
- **遵循谁创建、谁释放原则**：在组件销毁或子应用卸载时，释放对应资源。
- **浏览器存储使用命名空间**：区分不同应用的数据，避免 key 冲突。

**如果副作用不清理，会有什么问题？**

- 定时器和监听器反复挂载，会造成**重复执行**。
- 回调持续引用组件、状态或 DOM，让本该释放的对象无法被 GC 回收，造成**内存泄漏**。严重时可能导致页面卡顿、内存溢出，甚至页面崩溃。

## 8. CSS 样式隔离

qiankun 主要有三种处理方式：

1. **默认方式**

   qiankun 在加载阶段会把外部 CSS 拉取下来并内联成 `<style>` 节点，挂到子应用容器内，卸载子应用时随容器清理。

   **缺点**：
   - 样式可能会污染其他应用。
   - Vite 构建后的原生 ESM 在 qiankun 沙箱外执行，动态样式通过 `document.head.appendChild` 插入；副作用补丁无法识别所属子应用，因此无法插入对应的子应用容器，也无法在卸载时清理。
     - 开发环境由 HMR 客户端动态插入 `<style>`。
     - 生产环境默认开启 `cssCodeSplit` 懒加载路由 CSS 会被提取为独立文件，由 `__vitePreload` 随异步 chunk 动态插入 `<link rel="stylesheet">`。

2. CSS 命名空间 **`experimentalStyleIsolation`**

   给选择器加上应用容器前缀，SCSS 嵌套或 PostCSS 也可以在编译期实现类似效果。

   **缺点**：
   - 无法阻止主应用样式影响子应用；
   - 挂在 `document.body` 上的弹出层样式失效；需要将 DOM 挂到子应用容器内
   - 运行时改写，首屏有一次额外开销；

3. **`strictStyleIsolation`**

   利用浏览器原生 Shadow DOM 隔离。隔离节点内的样式不会受到外部影响，也不会影响外部节点，在隔离节点内的事件最终都只会冒泡到隔离节点中

   **缺点**：适配成本较高。
   - 挂在 `document.body` 上的弹出层样式失效；需要将 DOM 挂到子应用容器内
   - 可能会导致部分组件库或基础库无法正常运行（不支持放置 ShadowDom 内）

实际接入时，我会根据技术栈选择样式方案：

- **Vue `scoped`**：给组件样式添加作用域属性，限制样式的匹配范围。
- **React CSS-in-JS / CSS Modules 方案**：通过自动生成类名减少组件样式的命名冲突。
- **Tailwind CSS**：原子化CSS方案，减少自定义类名和重复 CSS。

由于整个项目的样式风格统一，reset 和通用第三方库样式由各子应用重复加载通常没有问题；如果第三方库存在差异化样式，可以配置样式前缀。

例如使用 Ant Design Vue 时，如果不同子应用需要不同主题，可以通过 `ConfigProvider` 的 `prefixCls` 配置不同的类名前缀，避免样式相互覆盖。

### 旧 Vue 2 项目有大量全局样式、未使用 `scoped`，弹窗又挂到 `body`，如何处理？

- CSS 命名空间
- 第三方库样式前缀
- 弹窗挂载位置

如果旧组件库无法调整挂载位置，改造成本又过高，我会考虑用 iframe 过渡。
