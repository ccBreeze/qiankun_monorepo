# 子应用资源预加载

本文说明本项目在 qiankun **手动加载模式**下的资源预取实现、预取与正式加载共用的 HTML 改写逻辑，以及 Vite 构建产物中 `import()`、`modulepreload` 和懒加载资源的覆盖范围。

本文源码结论基于本地安装的 **qiankun 2.10.16、import-html-entry 1.17.0、vite-plugin-qiankun 1.0.15**；OCRM 资源示例来自 2026-09-30 检查的构建产物，文件 hash 会随重新构建变化。

## 背景：手动加载模式没有 `start()` 的预加载策略

qiankun 有两套使用方式：

| 方式                              | 触发机制                   | 预加载策略                     |
| --------------------------------- | -------------------------- | ------------------------------ |
| `registerMicroApps()` + `start()` | 路由匹配自动 mount/unmount | `start({ prefetch })` 全局策略 |
| `loadMicroApp()`                  | 业务代码自行控制加载时机   | 单独调用 `prefetchApps` API    |

本项目主应用走的是**手动加载模式**——`apps/main-app/src/stores/microApp.ts` 里 `watch(activeMicroApp)` 监听路由变化，自行调用 `loadMicroApp` / `unmount` 管理生命周期（详见[子应用状态管理](./micro-app-store)）。全局没有任何 `start()` 调用，因此 `start({ prefetch })` 那套预加载策略用不了，只能用 qiankun 单独导出的 `prefetchApps(apps, importEntryOpts?)`。

## `prefetchApps` 做了什么

qiankun 的导出入口将 `prefetchImmediately` 命名为 `prefetchApps`。它对每个传入的 `{ name, entry }` 执行以下流程：

1. 在浏览器空闲时调用 `importEntry(entry, opts)`，获取子应用 HTML，先执行 `getTemplate`，再由 `processTpl` 收集脚本和样式；其中的外部 stylesheet 会在生成内联样式模板时通过 `fetch` 下载。
2. 再通过空闲回调调用 `getExternalStyleSheets()` 和 `getExternalScripts()`，获取解析器收集到的资源；已下载的样式命中内部缓存。
3. 缓存处理后的入口结果及外部 JS/CSS 文本，不调用 `execScripts()`，不创建子应用 DOM，也不挂载组件。

```ts [qiankun@2.10.16/src/prefetch.ts]
requestIdleCallback(async () => {
  const { getExternalScripts, getExternalStyleSheets } = await importEntry(
    entry,
    opts,
  )
  requestIdleCallback(getExternalStyleSheets)
  requestIdleCallback(getExternalScripts)
})
```

这里没有插入 `<link rel="prefetch">`。下载由 `import-html-entry` 的 `fetch` 完成，入口结果按 URL 存入 `embedHTMLCache`，外部 JS/CSS 文本分别存入 `scriptCache` 和 `styleCache`。

调度优先使用 `requestIdleCallback`，不支持时依次降级为 `MessageChannel`、`setTimeout`。空闲调度可以降低对首屏的影响，但已经发出的资源请求仍可能竞争网络带宽；离线、启用 `saveData` 或源码判定为慢网络时会跳过预取。

::: info 预取的资源范围
`prefetchApps` 不解析 JavaScript 模块依赖图，不执行内联 `import()`，也不主动处理 `<link rel="modulepreload">`。对于当前 OCRM 构建产物，预取仅覆盖入口 HTML 和入口 CSS。
:::

## 接入实现

### 预加载工具

```ts [apps/main-app/src/utils/microApp/prefetch.ts]
import { prefetchApps } from 'qiankun'
import { cssFetchInterceptor } from './cssProcessor'
import { processDynamicImport } from './htmlProcessor'
import { microApps } from './registry'

/**
 * 空闲时预加载所有子应用资源
 *
 */
export const prefetchMicroApps = () => {
  // import-html-entry 按 URL 缓存处理后的 HTML，预取必须使用与正式加载相同的入口改写。
  for (const { name, entry } of microApps) {
    prefetchApps([{ name, entry }], {
      fetch: cssFetchInterceptor,
      getTemplate: (tpl: string) => processDynamicImport(tpl, entry),
    })
  }
}
```

这里的“所有子应用”指遍历注册表中的全部应用，不代表能够预取每个应用的所有资源。

| 配置或调用方式                                           | 作用                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 遍历 `microApps`，每次传入 `[{ name, entry }]`           | 从[子应用注册表](./micro-app-registry)取得元数据，并为每个应用创建绑定自身 `entry` 的配置 |
| `getTemplate: (tpl) => processDynamicImport(tpl, entry)` | 与正式加载共用 HTML URL 改写，处理根路径 `href/src` 和内联动态 `import()`                 |
| `fetch: cssFetchInterceptor`                             | 与正式加载共用 CSS 文本路径改写，保证缓存的内联样式使用正确资源地址                       |

循环中的调用只是分别调度空闲任务，并没有等待上一个应用下载完成，因此不是串行下载。`prefetchApps` 本身返回 `void`，调用结束也不代表所有资源已经预取完成。

### 调用时机：微应用布局组件

在 `/microApp` 布局组件的 `<script setup>` 里调用一次：

```vue [apps/main-app/src/views/MicroApp/index.vue]
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMicroAppStore } from '@/stores/microApp'
import { installMicroAppAssetRuntime } from '@/utils/microApp/assetsPath'
import { prefetchMicroApps } from '@/utils/microApp/prefetch'

const { activeMicroApp, microAppConfigs } = storeToRefs(useMicroAppStore())

installMicroAppAssetRuntime()
prefetchMicroApps()
</script>
```

该组件是 `/microApp` 的布局容器，`<script setup>` 在组件每次挂载时调用预取。子应用切换时复用同一个布局实例，不会因此重复执行；如果布局被销毁后重新挂载，则会再次调用，由 `import-html-entry` 的缓存复用入口和已获取资源。

## 为什么预取必须传入 `getTemplate`

注册表里每个子应用的 `configuration.getTemplate` 都绑定自己的 `entry`，用于正式 `loadMicroApp()` 时改写 HTML。`prefetchApps` 不会自动读取元数据中的 `configuration`，需要通过第二个参数显式传入。

虽然单次 `prefetchApps(apps, opts)` 的 `opts` 由该次调用中的所有应用共用，但可以逐个应用调用，为各自的 `getTemplate` 创建闭包。当前代码正是采用这种方式。

`import-html-entry` 的 `embedHTMLCache[url]` 缓存的是首次 `importEntry()` 产生的结果，包含处理后的模板和脚本、样式获取函数，而不只是原始 HTML。缓存键只包含入口 URL，不包含 `getTemplate` 或 `fetch` 配置。

因此，如果预取先完成入口缓存，而预取时没有传入 `getTemplate`，后续正式加载同一个 URL 会复用缓存，不会再执行注册表里的 HTML 改写。内联 `import('/assets/...')` 和保留的 modulepreload 根路径可能据此解析到主应用 origin，造成错误请求。

以 OCRM 为例，`processDynamicImport` 在预取时将以下地址改写为子应用绝对 URL：

| HTML 中的原地址                       | 改写后的地址                                               |
| ------------------------------------- | ---------------------------------------------------------- |
| `import('/assets/index-Dv_dfzQg.js')` | `import('http://localhost:8102/assets/index-Dv_dfzQg.js')` |
| `href="/assets/vendor-BjMLmHxp.js"`   | `href="http://localhost:8102/assets/vendor-BjMLmHxp.js"`   |

::: tip URL 改写与资源预取是两件事
传入 `getTemplate` 解决的是预取与正式加载之间的 URL 和缓存一致性，不会使 qiankun 执行 `import()`，也不会把 modulepreload 模块加入预取队列。具体改写规则见 [Vite 动态修改 base](./asset-path)。
:::

## OCRM 构建产物的资源覆盖范围

### 入口模块为什么没有被预取

`vite-plugin-qiankun` 的 `module2DynamicImport` 会移除入口 `<script type="module" src="...">` 的 `src`、`type` 属性，将其改成内联动态导入，并追加生命周期绑定逻辑。当前 OCRM 的 HTML 核心结构如下，生命周期代码已省略：

```html [apps/ocrm/dist/index.html]
<script crossorigin="">
  import('/assets/index-Dv_dfzQg.js').finally(() => {
    /* 绑定 qiankun 生命周期 */
  })
</script>
<link rel="modulepreload" crossorigin="" href="/assets/vendor-BjMLmHxp.js" />
<link
  rel="modulepreload"
  crossorigin=""
  href="/assets/vue-vendor-C52hOLvq.js"
/>
<link rel="stylesheet" crossorigin="" href="/assets/index-Co4-63nd.css" />
```

`processTpl` 收集外部 `<script src>` 的 URL，遇到内联 `<script>` 则保存整段脚本字符串。OCRM 的 `scripts` 列表包含两个内联脚本：动态导入及生命周期绑定脚本、生命周期代理脚本，没有外部脚本 URL。

`getExternalScripts()` 对内联脚本只返回 `getInlineCode()` 取得的正文，不执行代码，也不扫描其中的 `import()`。所以即使动态导入的地址已经改写正确，入口 `index-Dv_dfzQg.js` 仍不会在预取阶段下载。

### `modulepreload` 为什么没有被预取

`processTpl` 将 `rel="stylesheet"` 的地址加入 `styles`，将普通 `rel="preload"` / `rel="prefetch"` 标签替换为注释，但匹配规则不包含 `modulepreload`。因此两个 modulepreload 标签会保留在改写后的模板里，不会加入 `scripts` 或 `styles`。

预取期间模板只是字符串，没有插入主文档，浏览器不会据此发起 modulepreload 请求。正式加载创建并插入子应用 DOM 后，保留的标签才由浏览器处理；执行内联脚本后，原生 `import()` 再加载入口模块及其静态依赖。这些请求不经过 `cssFetchInterceptor`。

### 当前产物的请求范围

| 资源                            | 当前预取是否覆盖 | 正式加载时的触发方式                                        |
| ------------------------------- | ---------------- | ----------------------------------------------------------- |
| `index.html`                    | 是               | `importEntry()` 获取 HTML                                   |
| `assets/index-Co4-63nd.css`     | 是               | HTML 中的 stylesheet，由 `import-html-entry` 下载并内联     |
| `assets/index-Dv_dfzQg.js`      | 否               | 执行内联 `import()`                                         |
| `assets/vendor-BjMLmHxp.js`     | 否               | 浏览器 modulepreload、入口模块的静态 import                 |
| `assets/vue-vendor-C52hOLvq.js` | 否               | 浏览器 modulepreload、入口模块的静态 import                 |
| `assets/HomeView-tbh3vycV.js`   | 否               | 路由懒加载 `import()`                                       |
| `assets/HomeView-GL75HHSA.css`  | 否               | HomeView 加载时，由 Vite 预加载辅助函数插入 link            |
| `assets/antd-BZ2f2lWc.js`       | 否               | 当前 HTML 和其他 chunk 均未引用它，不属于当前入口的可达依赖 |

入口 JS 静态导入两个 vendor chunk，并在路由组件函数中动态导入 HomeView。其 `__vite__mapDeps` 包含 HomeView JS、两个 vendor JS 和 HomeView CSS；这个依赖列表只有在路由组件加载函数执行时才会使用，不会被 qiankun 的预取函数遍历。

本次使用当前 `dist`、本地真实 qiankun/import-html-entry 依赖和最小浏览器环境桩，借助 mock fetch 记录请求；在全新缓存、在线环境中调用 `prefetchImmediately`，只记录到：

```text
http://localhost:8102
http://localhost:8102/assets/index-Co4-63nd.css
```

解析结果保留了两个已改写为子应用绝对 URL 的 modulepreload 标签；再次调用同一入口的 `importEntry()` 时，命中入口缓存，不再执行新的 `getTemplate`。这是库调用验证，不是浏览器实测网络记录。

## 缓存复用与补充预取方案

### 与 `loadMicroApp` 重复加载？

预取列表包含当前即将激活的应用时，同一个入口 URL 会复用 `embedHTMLCache`，已获取的外部资源会复用 `scriptCache` / `styleCache`。缓存中保存的是 Promise，因此正在进行中的相同请求也可以复用；这里不存在额外插入 prefetch 标签的开销。

这只保证 qiankun 已获取资源的复用。OCRM 的入口模块、vendor 模块和路由懒加载资源仍由浏览器在正式加载时请求，不能据此认为子应用所有资源都已经缓存。CSS 文本中的图片、字体和 `@import` 也不会被预取函数递归下载。

### 如果需要提前加载 ESM 和路由资源

以下是补充方案，当前 `prefetchMicroApps()` 尚未实现：

1. 保留现有 `getTemplate` 和 CSS fetch 配置，继续保证预取与正式加载的入口处理一致。
2. 在空闲时将入口模块和 HTML 中已有 modulepreload 依赖的绝对 URL，以 `<link rel="modulepreload" crossorigin="">` 加入主文档。modulepreload 会下载、解析模块并放入文档的 module map，不执行模块正文。
3. 若要覆盖路由懒加载，启用 Vite `build.manifest`，根据 `imports`、`dynamicImports` 和 `css` 选择并去重目标资源；浏览器不保证递归预加载全部模块依赖，需覆盖的模块应明确列出。异步 CSS 可单独下载预热，避免提前应用路由样式。

qiankun 的 `scriptCache` 保存的是 JS 文本，浏览器的原生 `import()` 使用模块加载机制和 module map，两者不能直接互相替代。单独 fetch 模块可能通过 HTTP 缓存帮助后续请求，但不等同于 modulepreload；直接执行 `import()` 则会求值模块正文，也不符合当前只获取资源的预取行为。

## 相关链接

- [qiankun prefetchApps](https://qiankun.umijs.org/zh/api#prefetchappsapps-importentryopts)
- [qiankun start — prefetch 策略](https://qiankun.umijs.org/zh/api#startopts)
- [qiankun 2.10.16 预取源码](https://github.com/umijs/qiankun/blob/v2.10.16/src/prefetch.ts)
- [import-html-entry](https://github.com/kuitos/import-html-entry)
- [import-html-entry 1.17.0 HTML 解析源码](https://raw.githubusercontent.com/kuitos/import-html-entry/v1.17.0/src/process-tpl.js)
- [import-html-entry 1.17.0 资源获取与缓存源码](https://raw.githubusercontent.com/kuitos/import-html-entry/v1.17.0/src/index.js)
- [HTML Standard — modulepreload](https://html.spec.whatwg.org/multipage/links.html#link-type-modulepreload)
- [Vite 7 manifest 与模块依赖](https://v7.vite.dev/guide/backend-integration)
- [子应用注册表](./micro-app-registry)
- [子应用状态管理](./micro-app-store)
- [Vite 动态修改 base](./asset-path)
