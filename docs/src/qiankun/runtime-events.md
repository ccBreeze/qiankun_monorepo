---
title: 应用间的通信
outline: [2, 4]
---

<script setup>
import runtimeEventsCompleteFlowXml from './drawio/runtime-events-complete-flow.drawio?raw'
</script>

# 应用间的通信

在 qiankun 微前端架构中，主应用与子应用运行在同一个浏览器标签页，共享同一个 `window` 对象。本项目利用这一特性，在运行时内部借助浏览器全局对象复用同一个单例，建立了一条轻量的事件总线，实现双向通信。

## 通信基础设施

### 全局单例

事件总线的核心由 `@breeze/runtime` 导出的 `qiankunRuntime.channel` 提供，主子应用都应通过模块导入访问；只有运行时内部才需要感知浏览器全局对象。

```ts
import { qiankunRuntime } from '@breeze/runtime'

const channel = qiankunRuntime.channel
```

```ts [packages/runtime/src/QiankunRuntime.ts]
import { EventEmitter2 } from 'eventemitter2'

const RUNTIME_SINGLETON_KEY = Symbol.for('@breeze/runtime/QiankunRuntime')

class QiankunRuntime {
  private constructor() {}
  static getInstance() {
    const runtimeGlobal = globalThis as RuntimeGlobal
    return (runtimeGlobal[RUNTIME_SINGLETON_KEY] ??= new QiankunRuntime())
  }

  readonly channel = new EventEmitter2()
}

type RuntimeGlobal = typeof globalThis & {
  [key: symbol]: QiankunRuntime | undefined
}

export const qiankunRuntime = QiankunRuntime.getInstance()
```

`channel` 是一个 [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2) 实例。业务代码通过 `qiankunRuntime.channel` 相互监听和发出事件，而 `globalThis` 上通过 `Symbol.for(...)` 注册的私有 key 仅用于确保主应用与各子应用 bundle 之间共享同一个运行时实例。

### 事件约定

主子应用的事件名与 Payload 定义统一收敛在 `packages/runtime/src/events.ts` 中：

- 集中定义事件名常量及其对应的 Payload 类型；
- 主应用和子应用都只依赖这份共享定义，而不直接依赖彼此实现。

```ts [packages/runtime/src/events.ts]
export const RUNTIME_EVENTS = {
  /** 子应用请求主应用关闭 tab */
  TAB_REMOVE_REQUEST: 'tab:remove:request',
  /** 主应用关闭 tab 时通知子应用清除 KeepAlive 缓存 */
  TAB_REMOVE: 'tab:remove',
} as const

export interface TabRemoveRequestPayload {
  fullPath: string
  /** 关闭后跳转到该 tab 的来源页（由主应用 addTab 时记录） */
  goToSource?: boolean
}

export interface TabRemovePayload {
  fullPath: string
}
```

## Tab 管理通信

Tab 管理目前包含两类通信：

- 子应用请求主应用打开 / 跳转到某个目标路由
- 子应用请求主应用关闭某个 tab，主应用关闭后再通知子应用清理 KeepAlive 缓存

### 关闭 tab 通信流程

<ClientOnly>
  <DrawioViewer :data="runtimeEventsCompleteFlowXml" />
</ClientOnly>

### 主应用

- 主应用在 `App.vue` 启动时调用 `setupRuntimeChannels()` 注册监听。
- `removeTab()` 在删除 tab 后，会先调用 `emitTabRemove()` 通知子应用清理对应页面的 KeepAlive 缓存，再按 `activeRule` 判断是否需要回收整个子应用实例。详见 [标签栏状态管理](./tab-bar-store.md#removetab)。

```ts [apps/main-app/src/utils/channel.ts]
const channel = qiankunRuntime.channel

/** 注册主应用运行时通信监听 */
export const setupRuntimeChannels = () => {
  channel.on(
    RUNTIME_EVENTS.TAB_NAVIGATE_REQUEST,
    ({ fullPath, tabName }: TabNavigateRequestPayload) => {
      router.options.history.push(fullPath, {
        tabName,
      })
    },
  )

  channel.on(
    RUNTIME_EVENTS.TAB_REMOVE_REQUEST,
    (payload: TabRemoveRequestPayload) => {
      useTabBarStore().removeTab(payload)
    },
  )
}

/** @see {@link RUNTIME_EVENTS.TAB_REMOVE} */
export const emitTabRemove = (payload: TabRemovePayload) => {
  channel.emit(RUNTIME_EVENTS.TAB_REMOVE, payload)
}
```

### 子应用

子应用通过 `@breeze/bridge-vue` 提供的封装函数收发事件，无需直接操作 `qiankunRuntime.channel`。

#### `requestNavigateTab`

子应用请求主应用执行跨应用跳转时，直接通过共享事件总线发出 `TAB_NAVIGATE_REQUEST`：

```ts [packages/bridge-vue/src/hostBridge/tab.ts]
/** 按子应用路由位置请求主应用跳转 / 打开 tab */
export const requestNavigateTab = (payload: TabNavigateRequestPayload) => {
  qiankunRuntime.channel.emit(RUNTIME_EVENTS.TAB_NAVIGATE_REQUEST, payload)
}
```

`fullPath` 必须是主应用视角下可识别的完整路径，例如：

- History 模式子应用：`/vue3-history/KeepAliveDemo`
- Hash 模式子应用：`/ocrm/#/index/datainput/brand/42`

主应用收到事件后，会直接执行：

```ts [apps/main-app/src/utils/channel.ts]
router.options.history.push(fullPath, {
  tabName,
})
```

::: details KeepAliveDemo 中的跨应用示例

演示从 `vue3-history` 跳转到 OCRM：

```ts [apps/vue3-history/src/views/KeepAliveDemo/index.vue]
import { MICRO_APP_ACTIVE_RULE } from '@breeze/runtime'
import { requestNavigateTab } from '@breeze/bridge-vue'

const crossAppExampleFullPath = `${MICRO_APP_ACTIVE_RULE.OCRM}/index/datainput/brand/42`

requestNavigateTab({
  fullPath: crossAppExampleFullPath,
  tabName: '品牌详情 #42',
})
```

:::

#### `requestRemoveTabByRoute`

```ts [packages/bridge-vue/src/hostBridge/tab.ts]
/** 按子应用路由位置请求主应用关闭 tab */
export const requestRemoveTabByRoute = ({
  router,
  fullPath,
  ...payload
}: RequestRemoveTabByRouteOptions) => {
  // 默认关闭当前路由 // [!code focus]
  fullPath ??= router.currentRoute.value.fullPath // [!code focus]
  qiankunRuntime.channel.emit(RUNTIME_EVENTS.TAB_REMOVE_REQUEST, {
    fullPath: router.resolve(fullPath).href, // [!code focus]
    ...payload,
  })
}
```

**路径转换必要性**：子应用内的路径如 `/KeepAliveDemo`，挂载到主应用后对应 `/vue3-history/KeepAliveDemo`。主应用 `tabBar.tabs` 的 key 是主应用视角的完整路径，因此必须先转换再发送。

:::tip
使用 `router.resolve()` 包含一个包含任何现有 base 的 href 属性。详情查看 [vue-router](https://router.vuejs.org/zh/api/interfaces/Router.html#Methods-resolve)
:::

使用场景：点击表单页（创建兑换活动）底部的按钮关闭页面，需要返回（兑换活动）列表页（首次打开此 tab 时的来源路由）

<div style="display: flex; justify-content: center; align-items: center; gap: 4vw;">
  <img src="./imgs/couponExchangeActivityForm.png" style="width: 20vw;" />
  <img src="./imgs/couponExchangeActivity.png" style="width: 20vw;" />
</div>

```ts [apps/vue3-history/src/views/KeepAliveDemo/Detail.vue]
import { useRouter } from 'vue-router'

const router = useRouter()

requestRemoveTabByRoute({
  router,
  goToSource: true,
})
```

#### `useTabRemoveListener`

在子应用组件中监听主应用的关闭通知：

```ts [packages/bridge-vue/src/hostBridge/tab.ts]
/**
 * 监听主应用关闭 tab 事件
 *
 * 自动过滤非当前子应用的事件，并将主应用路径还原为子应用本地路径后回调。
 * 在组件 mounted 时注册监听，unmounted 时自动清除。
 */
export const useTabRemoveListener = (
  context: MicroAppContext,
  onRemove: (localFullPath: string) => void,
) => {
  const handler = ({ fullPath }: TabRemovePayload) => {
    const { activeRule } = context
    if (!matchActiveRule({ activeRule, fullPath })) return // [!code focus]
    onRemove(stripActiveRule(fullPath, activeRule)) // [!code focus]
  }

  onMounted(() => {
    qiankunRuntime.channel.on(RUNTIME_EVENTS.TAB_REMOVE, handler) // [!code focus]
  })
  onUnmounted(() => {
    qiankunRuntime.channel.off(RUNTIME_EVENTS.TAB_REMOVE, handler)
  })
}
```

`useTabRemoveListener` 做了两件关键的事：

1. **过滤**：多个子应用共享同一个 channel，每个子应用收到事件后先检查“事件里的 `fullPath` 是否属于自己的 `activeRule`”，非本应用的事件直接忽略
2. **路径还原**：主应用发出的 `fullPath` 带有 `activeRule` 前缀（如 `/vue3-history/KeepAliveDemo`），还原为子应用内的本地路径（如 `/KeepAliveDemo`）

这里显式把 `payload.fullPath` 传给 `matchActiveRule()` 很重要：关闭 tab 的通知是广播事件，不能依赖“当前浏览器正停留在哪个 URL”来做过滤，而要以事件本身携带的目标路径为准。
