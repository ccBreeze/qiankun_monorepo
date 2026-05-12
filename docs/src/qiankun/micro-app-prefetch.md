# 子应用资源预加载

本文说明本项目如何在 qiankun **手动加载模式**下做子应用资源预加载（prefetch），以及为什么不能直接用 `start({ prefetch })`。

## 背景：手动加载模式没有 `start()` 的预加载策略

qiankun 有两套使用方式：

| 方式                              | 触发机制                   | 内置预加载                               |
| --------------------------------- | -------------------------- | ---------------------------------------- |
| `registerMicroApps()` + `start()` | 路由匹配自动 mount/unmount | ✅ `start({ prefetch })` 全局策略        |
| `loadMicroApp()`                  | 业务代码自行控制加载时机   | ❌ 无，需手动调用独立 `prefetchApps` API |

本项目主应用走的是**手动加载模式**——`apps/main-app/src/stores/microApp.ts` 里 `watch(activeMicroApp)` 监听路由变化，自行调用 `loadMicroApp` / `unmount` 管理生命周期（详见[子应用状态管理](./micro-app-store)）。全局没有任何 `start()` 调用，因此 `start({ prefetch })` 那套预加载策略用不了，只能用 qiankun 单独导出的 `prefetchApps(apps, importEntryOpts?)`。

## `prefetchApps` 做了什么

`prefetchApps` 对每个传入的 `{ name, entry }`：

1. 在浏览器空闲时（`requestIdleCallback`，不支持时降级 `setTimeout`）调用 `import-html-entry` 拉取子应用 entry HTML；
2. 解析出其中的 `<script>` / `<link rel="stylesheet">` 等资源，通过 `<link rel="prefetch">` 预取到浏览器缓存；
3. 不执行任何子应用代码、不挂载组件，纯粹预热缓存。

因为走 `requestIdleCallback` 调度，不会和主应用首屏抢资源。

## 接入实现

### 预加载工具

```ts [apps/main-app/src/utils/microApp/prefetch.ts]
import { prefetchApps } from 'qiankun'
import { cssFetchInterceptor } from './cssProcessor'
import { microApps } from './registry'

/**
 * 预加载所有子应用的 HTML / JS / CSS 资源。
 *
 * - 本项目使用 `loadMicroApp` 手动加载模式，没有调用 `start()`，
 *   因此无法使用 `start({ prefetch })` 的全局预加载策略，需改用独立的 `prefetchApps`。
 * - `prefetchApps` 内部基于 `requestIdleCallback`（不支持时降级 `setTimeout`），不会阻塞主线程。
 * - `importEntryOpts` 为所有子应用共用，无法透传按 app 闭包的 `getTemplate`；
 *   但 `getTemplate` 处理的动态 import 改写发生在子应用运行时，预加载阶段不受影响。
 */
export const prefetchMicroApps = () => {
  prefetchApps(
    microApps.map(({ name, entry }) => ({ name, entry })),
    { fetch: cssFetchInterceptor },
  )
}
```

`microApps`（来自[子应用注册表](./micro-app-registry)）每一项已经带了 `name` / `entry`，正好就是 `prefetchApps` 需要的 `AppMetadata`，直接映射即可。

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

该组件是 `/microApp` 的布局容器，进入微应用区域时挂载一次、之后子应用切换不再重新挂载，所以这里调用天然只执行一次，不需要额外的「是否已预加载」标志位。

## 几个细节

### `getTemplate` 无法按 app 透传，但不影响预加载

注册表里每个子应用的 `configuration.getTemplate` 是闭包了各自 `entry` 的（`(tpl) => processDynamicImport(tpl, entry)`），而 `prefetchApps` 的第二个参数 `importEntryOpts` 是所有子应用**共用**的，没法把按 app 区分的 `getTemplate` 传进去。

但这不影响预加载效果：`processDynamicImport` 改写的是 inline script 里 `import('/assets/...')` 这类**子应用运行时**才执行的动态导入（详见 [Vite 动态修改 base](./asset-path)），而 prefetch 阶段只是把静态 `<script>` / `<link>` 资源塞进浏览器缓存，根路径资源由 `import-html-entry` 解析 entry 时本就会按子应用 origin 还原。所以 prefetch 不传 `getTemplate` 是安全的；`fetch: cssFetchInterceptor` 则照常传，保证内联 CSS 的路径改写一致。

### 与 `loadMicroApp` 重复加载？

预加载列表里包含了「当前即将激活的那个子应用」，看似和随后的 `loadMicroApp` 重复。实际上 `import-html-entry` 内部对 entry HTML 和资源有缓存，`loadMicroApp` 不会再发一次网络请求；唯一的「浪费」是多插了一个 `<link rel="prefetch">` 标签，可忽略。如果想更精细，可以给 `prefetchMicroApps` 加一个 `excludeNames` 参数，在调用处把 `activeMicroApp.name` 排除掉。

## 相关链接

- [qiankun prefetchApps](https://qiankun.umijs.org/zh/api#prefetchappsapps-importentryopts)
- [qiankun start — prefetch 策略](https://qiankun.umijs.org/zh/api#startopts)
- [import-html-entry](https://github.com/kuitos/import-html-entry)
- [子应用注册表](./micro-app-registry)
- [子应用状态管理](./micro-app-store)
- [Vite 动态修改 base](./asset-path)
