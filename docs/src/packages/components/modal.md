# Modal 弹窗

模态对话框。封装在 [antdv `a-modal`](https://antdv.com/components/modal-cn) 之上，提供：

- **`BaseModal`**：项目级通用壳，固化尺寸预设、loading 处理与样式；
- **`openModal`**：命令式调用入口，业务以 `await` 的方式拿到弹窗结果；
- **`ModalContainer`**：根应用级弹窗渲染容器，通过 `Teleport` 把命令式弹窗渲染到 `body`；
- **内置弹窗注册表（`ModalEnum` / `ModalMap`）**：通过枚举派发常用业务弹窗，并自动推导 props 与结果类型。

## 何时使用

- 需要一个轻量入口承载用户输入或确认、并在关闭后继续后续流程时（典型："弹窗 → 等结果 → 继续操作"）。
- 业务方不希望在父组件维护 `visible`、`onOk`、`onCancel` 等 props，希望像调用接口一样调用弹窗。
- 需要多个弹窗按调用顺序串行展示，避免出现"同屏堆叠"。

## 代码演示

### 在根应用挂载 ModalContainer

命令式弹窗需要先在应用根组件内挂载一次 `ModalContainer`。它必须放在 `AntConfigProvider` 内部，这样 `openModal` 打开的弹窗可以直接继承当前应用的主题、语言包和其他 app-level provide。

```vue [apps/main-app/src/App.vue]
<template>
  <AntConfigProvider>
    <router-view />
    <ModalContainer />
  </AntConfigProvider>
</template>

<script setup lang="ts">
import { AntConfigProvider, ModalContainer } from '@breeze/components'
</script>
```

`ModalContainer` 内部会使用 `Teleport to="body"`，所以弹窗最终仍然渲染在 `body` 下，不会被页面局部容器的 `overflow`、`z-index` 或布局层级影响。

### 命令式打开内置弹窗

通过 `ModalEnum` 派发到内置弹窗，TypeScript 会根据枚举值自动推导 `props` 与返回类型。

```ts
import { openModal, ModalEnum } from '@breeze/components'

const result = await openModal(ModalEnum.DemoActionModal, {
  title: '处理工单',
  description: '确认要处理这条工单吗？',
  initialRemark: '默认备注',
})

// 用户点击确定后才会 resolve；点击取消会 reject
console.log(result?.ticketId)
```

### 用 cancel 阻断后续业务流

`openModal` 在用户点取消时会 **`reject`** Promise，业务侧可以借此天然阻断后续流程——只要把弹窗调用串在 `await` 链上，取消即抛出，自然不会执行后续逻辑。

```ts
import { openModal, ModalEnum } from '@breeze/components'

async function handleAudit() {
  // 用户点取消 → openModal reject → 抛出后中断 handleAudit，
  // submitAudit / showSuccess 都不会执行。
  const result = await openModal(ModalEnum.DemoActionModal, {
    title: '审核确认',
    description: '确认通过该工单吗？',
  })

  await submitAudit(result)
  showSuccess('已审核')
}
```

需要在取消时执行收尾逻辑（例如埋点、回滚 UI 状态）时，再用 `try/catch` 拦：

```ts
try {
  const result = await openModal(ModalEnum.DemoActionModal, payload)
  await submitAudit(result)
} catch (cancelPayload) {
  // 用户主动取消，不需要再走后续业务
  trackCancel(cancelPayload)
}
```

> 这套行为由 `Modal/render.ts` 决定：`onOk` 触发 `resolve(payload)`，`onCancel` 触发 `reject(payload)`。换句话说"cancel = reject"是显式契约，业务侧应当依赖它来组织流程，不需要自己再维护一个"取消标记"。

### 命令式打开自定义业务弹窗

直接传组件即可，泛型用来标注 props 与返回值。

```ts
import { openModal } from '@breeze/components'
import MyBusinessModal from './MyBusinessModal.vue'

interface MyProps {
  title: string
  userId: number
}
interface MyResult {
  ok: true
  remark: string
}

const result = await openModal<MyProps, MyResult>(MyBusinessModal, {
  title: '业务弹窗',
  userId: 123,
})
```

业务弹窗内部用 `BaseModal` 包一层即可，框架会注入 `onOk` / `onCancel` / `afterClose` 三个字段。

```vue
<script setup lang="ts">
import { BaseModal, type ModalInjectedProps } from '@breeze/components'

interface Result {
  ok: true
  remark: string
}

const props = defineProps<
  {
    title: string
    userId: number
  } & Pick<ModalInjectedProps<Result>, 'onOk'>
>

const handleConfirm = async () => {
  // 模拟接口
  await new Promise((r) => setTimeout(r, 500))
  props.onOk({ ok: true, remark: '已处理' })
}
</script>

<template>
  <BaseModal :title="title" :onOk="handleConfirm">
    <p>当前用户：{{ userId }}</p>
  </BaseModal>
</template>
```

### 声明式使用 BaseModal

把 `BaseModal` 作为普通组件渲染也行，常用于嵌入在某个 Drawer / Tab 里、由外层控制状态的场景。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { BaseModal } from '@breeze/components'

const open = ref(false)
const handleOk = async () => {
  await save()
}
</script>

<template>
  <BaseModal v-if="open" title="编辑信息" size="medium" :onOk="handleOk">
    <FormPanel />
  </BaseModal>
</template>
```

### 不同尺寸预设

```ts
openModal(MyTipsModal, { title: '提示', size: 'tips' }) // 400 × 84
openModal(MyEditModal, { title: '编辑', size: 'small' }) // 536 × 260（默认）
openModal(MyEditModal, { title: '编辑', size: 'medium' }) // 776 × 420
openModal(MyEditModal, { title: '编辑', size: 'large' }) // 1056 × 476
```

## API

### `openModal(component, props?)`

命令式打开弹窗，串行执行（按调用顺序排队展示），返回 `Promise<TResult | undefined>`。

#### 参数

| 参数        | 说明                                                                                                                                                            | 类型                               | 默认值 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------ |
| `component` | 内置弹窗枚举（`ModalEnum`）或任意 Vue 组件                                                                                                                      | `ModalEnum \| Component`           | -      |
| `props`     | 透传给弹窗组件的 props。**传枚举时是否可省略由该弹窗的 props 类型决定**（含必填字段 → 强制必传，全可选 → 可省略）；传组件时由泛型 `TProps` 决定，签名上始终可选 | `BuiltinModalProps<T>` 或 `TProps` | -      |

##### `props` 是否必填的推导规则

枚举重载用 `HasRequired<T>` 条件类型分流参数元组：

```ts
type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K
}[keyof T]

type HasRequired<T> = [RequiredKeys<T>] extends [never] ? false : true

type OpenModalArgs<T extends ModalEnum> =
  HasRequired<BuiltinModalProps<T>> extends true
    ? [component: T, props: BuiltinModalProps<T>] // 含必填 → props 必传
    : [component: T, props?: BuiltinModalProps<T>] // 全可选 → props 可省略
```

效果（以 `DemoActionModal` 为例，`description` 是必填字段）：

```ts
openModal(ModalEnum.DemoActionModal) // ❌ TS 报错
openModal(ModalEnum.DemoActionModal, {}) // ❌ TS 报错（缺 description）
openModal(ModalEnum.DemoActionModal, { description: '...' }) // ✅
```

非枚举重载（自定义业务弹窗）保持 `props?: TProps`，是否传由调用方泛型决定。

#### 返回值

| 类型                            | 说明                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `Promise<TResult \| undefined>` | 用户点击确定时调用 `onOk(payload)` 后 resolve；点击取消时调用 `onCancel(payload)` 后 reject |

#### 内置枚举

| 枚举值                      | 对应组件          | props 类型               | 结果类型                | props 是否必填         |
| --------------------------- | ----------------- | ------------------------ | ----------------------- | ---------------------- |
| `ModalEnum.DemoActionModal` | `DemoActionModal` | `DemoActionModalRequest` | `DemoActionModalResult` | 是（含 `description`） |

`DemoActionModalRequest` 实际类型：

```ts
// packages/components/src/Modal/components/DemoActionModal.vue
export interface DemoActionModalOwnProps {
  description: string // 必填
  initialRemark?: string
}

/** 命令式入参 = 业务字段 + 透传给 BaseModal 的 props */
export type DemoActionModalRequest = DemoActionModalOwnProps & BaseModalProps
```

> 新增内置弹窗时，需要在 `packages/components/src/Modal/open.ts` 同时维护 `ModalEnum`、`ModalMap` 与 `BuiltinModalContractMap` 三处。`HasRequired` 会自动根据契约 props 是否含必填字段推导调用方是否必须传第二参数，无需手动重载。

### `BaseModal`

底层弹窗壳，所有非约束字段透传给 `a-modal`。

#### Props

`BaseModal` 自身的 props：

| 参数            | 说明                                                                                     | 类型                                       | 默认值    |
| --------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ | --------- |
| `size`          | 弹窗尺寸预设，决定 `width` 与 body `min-height`                                          | `'tips' \| 'small' \| 'medium' \| 'large'` | `'small'` |
| `okButtonReady` | `false` 时确定按钮显示置灰样式但仍可点击，便于业务侧拦截校验                             | `boolean`                                  | `true`    |
| `centered`      | 是否垂直居中（覆盖 antdv 默认）                                                          | `boolean`                                  | `true`    |
| `width`         | 弹窗宽度；不传时由 `size` 计算                                                           | `number \| string`                         | -         |
| `bodyStyle`     | body 样式；会和 `size` 计算的 `min-height` 合并                                          | `CSSProperties`                            | -         |
| `onOk`          | 点击确定回调，返回 Promise 时按钮自动进入 loading；resolve 后弹窗关闭，reject 时保持打开 | `() => unknown \| Promise<unknown>`        | -         |
| `onCancel`      | 点击取消回调，行为与 `onOk` 一致                                                         | `() => unknown \| Promise<unknown>`        | -         |
| 其他            | 任意 antdv `ModalProps`（除 `confirmLoading` / `open` 由内部接管）                       | `ModalProps`                               | -         |

`MODAL_SIZES` 常量：

| size     | width  | min-height |
| -------- | ------ | ---------- |
| `tips`   | `400`  | `84`       |
| `small`  | `536`  | `260`      |
| `medium` | `776`  | `420`      |
| `large`  | `1056` | `476`      |

#### 行为

- `confirmLoading` 由 `BaseModal` 内部托管：`onOk` / `onCancel` 是 Promise 时自动加 loading；
- `onOk` / `onCancel` 抛错时保持弹窗打开，业务侧可用 `try/catch` 自行提示；
- `.pack-modal` 类前缀作用于 teleport 后的 DOM，不会污染外部样式。

#### Slots

| 名称      | 说明                                             |
| --------- | ------------------------------------------------ |
| `default` | 弹窗主体内容                                     |
| 其他      | 全部转发给底层 `a-modal`，例如 `title`、`footer` |

### `ModalInjectedProps<TResult>`

框架在渲染弹窗时注入到组件上的回调字段。

```ts
export interface ModalInjectedProps<TResult = never> {
  /** 实例销毁后调用，由框架自动绑定到 antdv afterClose */
  afterClose: () => void
  /** 点击确定，payload 会作为 openModal 的 resolve 值 */
  onOk: (payload?: TResult) => void
  /** 点击取消，payload 会作为 openModal 的 reject 值 */
  onCancel: (payload?: TResult) => void
}
```

业务弹窗的 props 一般写成：

```ts
type Props = MyOwnProps & Pick<ModalInjectedProps<MyResult>, 'onOk'>
```

只声明需要的字段（通常只关心 `onOk`），其余由框架注入。

## 工作机制

`openModal` 内部分三层：

1. **`open.ts`**：负责类型分发，把枚举映射成 `ModalMap` 中的异步组件，再交给 `openModalRequest`；
2. **`manager.ts`**：维护一个 `Promise` 队列，让多个 `openModal` 调用按顺序展示，避免堆叠；
3. **`render.ts`**：为单个弹窗生成唯一 `id`，把组件、props 和注入回调写入 `modalStore`；
4. **`ModalContainer.vue`**：订阅 `modalStore`，通过 `Teleport to="body"` 渲染当前弹窗实例；容器卸载时清空 store，避免 qiankun 子应用卸载后遗留 pending 弹窗。

`render.ts` 在创建 Promise 时把 `onOk` 绑到 `resolve`、把 `onCancel` 绑到 `reject`，并把 `afterClose` 绑到 `removeModalInstance(id)`：

```ts
// packages/components/src/Modal/render.ts（节选）
addModalInstance({
  id,
  component,
  props: {
    ...(props as Record<string, unknown>),
    onOk: (payload?: TResult) => resolve(payload),
    onCancel: (payload?: TResult) => reject(payload),
    afterClose: () => removeModalInstance(id),
  },
})
```

`ModalContainer.vue` 只负责把 store 中的弹窗实例渲染出来：

```vue
<template>
  <Teleport to="body">
    <component
      :is="instance.component"
      v-for="instance in modalStore.values()"
      :key="instance.id"
      v-bind="instance.props"
    />
  </Teleport>
</template>
```

这是 `openModal` 对调用方的核心契约：**取消即抛出**。业务侧可以借此让 `await` 链在用户取消时自然中断，无需在父组件维护"取消标记"或额外回调。

和早期每次 `openModal` 都创建独立 Vue app 的方案不同，现在命令式弹窗仍在根应用组件树里，只是 DOM 位置被 `Teleport` 到 `body`。因此它可以自然继承根应用上安装的能力，例如 `AntConfigProvider`、`vue-i18n`、主题配置和依赖注入；不需要再额外维护 `configureModalApp()`。

## Teleport 方案的接入约束

每个应用根组件只挂载一个 `ModalContainer`，通常放在应用级 provider 内部、页面主体之后：

```vue [apps/vue3-history/src/App.vue]
<script setup lang="ts">
import { AntConfigProvider, ModalContainer } from '@breeze/components'
</script>

<template>
  <AntConfigProvider>
    <RouterView />
    <ModalContainer />
  </AntConfigProvider>
</template>
```

`ModalContainer` 必须位于 `AntConfigProvider`、`vue-i18n`、store 等应用级上下文内部。下面这种写法不推荐，因为命令式弹窗虽然会被渲染到 `body`，但组件树上已经离开了应用 provider：

```vue
<template>
  <AntConfigProvider>
    <RouterView />
  </AntConfigProvider>

  <!-- 不推荐：弹窗组件拿不到 AntConfigProvider 内部提供的上下文 -->
  <ModalContainer />
</template>
```

`openModal` 只负责把实例写入 `modalStore`，真正渲染依赖根组件里的 `ModalContainer`。如果忘记挂载容器，Promise 会被创建，但页面不会出现弹窗：

```ts [packages/components/src/Modal/render.ts]
addModalInstance({
  id,
  component,
  props: {
    ...(props as Record<string, unknown>),
    onOk: (payload?: TResult) => resolve(payload),
    onCancel: (payload?: TResult) => reject(payload),
    afterClose: () => removeModalInstance(id),
  },
})
```

`ModalContainer` 卸载时会清空 store，用于处理 qiankun 子应用 unmount、根应用销毁等场景，避免仍未关闭的 pending 弹窗残留：

```vue [packages/components/src/Modal/ModalContainer.vue]
<script setup lang="ts">
import { onUnmounted } from 'vue'
import { modalStore, resetModalStore } from './modalStore'

onUnmounted(() => {
  resetModalStore()
})
</script>

<template>
  <Teleport to="body">
    <component
      :is="instance.component"
      v-for="instance in modalStore.values()"
      :key="instance.id"
      v-bind="instance.props"
    />
  </Teleport>
</template>
```

`modalStore` 保存组件时使用 `markRaw(component)`，避免 Vue 把组件定义转成深层响应式对象：

```ts [packages/components/src/Modal/modalStore.ts]
export function addModalInstance(instance: ModalInstance) {
  modalStore.set(instance.id, {
    ...instance,
    component: markRaw(instance.component),
  })
}
```

## 注意事项

- **不要直接 `new` 一个 `BaseModal`** 或自行 `createApp(BaseModal)`，要么用声明式渲染、要么用 `openModal`，否则会绕过主题底座。
- **`openModal` 是串行的**——下一个弹窗会等上一个 resolve / reject 后再渲染。如果出现"用户点了按钮但弹窗一直没出现"，先确认上一个 Promise 是否已结束。
- **业务弹窗里要主动调用 `props.onOk(payload)`**，否则 `openModal` 永远不会 resolve；不需要再手动改 `visible`，关闭由 `BaseModal` 内部处理。
- **取消会 `reject`，不会 `resolve(undefined)`**。把弹窗调用挂在 `await` 链上即可天然阻断后续业务；如需在取消分支做收尾，使用 `try/catch` 拦截，不要写"判断 result 是否为 undefined"这类代码。
- 弹窗回调里抛错不会破坏队列（队列内部已 `catch`），但抛错时弹窗保持打开，需要在业务侧提示用户。

## 如果使用 createApp 应该怎么实现

当前推荐使用 `ModalContainer + Teleport`，因为它能复用根应用上下文。若某个场景必须回到独立 `createApp` 方案，需要显式补齐 app 级依赖，并在关闭后销毁独立实例：

```ts
import { createApp, h } from 'vue'
import type { App as VueApp, Component } from 'vue'
import AntConfigProvider from '../AntConfigProvider/index.vue'

type ModalAppSetup = (app: VueApp) => void

let modalAppSetup: ModalAppSetup | null = null

export function configureModalApp(setup: ModalAppSetup) {
  modalAppSetup = setup
}

export function renderModalWithCreateApp<TResult>(
  component: Component,
  props: Record<string, unknown>,
) {
  return new Promise<TResult | undefined>((resolve, reject) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    let app: VueApp<Element> | null = null
    const cleanup = () => {
      app?.unmount()
      container.remove()
    }

    const modalProps = {
      ...props,
      afterClose: cleanup,
      onOk: (payload?: TResult) => resolve(payload),
      onCancel: (payload?: TResult) => reject(payload),
    }

    app = createApp({
      render() {
        return h(AntConfigProvider, null, {
          default: () => h(component, modalProps),
        })
      },
    })

    modalAppSetup?.(app)
    app.mount(container)
  })
}
```

使用这种方案时，应用初始化阶段要把根 app 上用到的插件同步注册给命令式弹窗的独立 app，例如：

```ts
setupComponentsI18n(app, localeModules)
configureModalApp((modalApp) => {
  modalApp.use(i18n)
  modalApp.use(router)
  modalApp.provide('xxx', xxx)
})
```

这种写法的关键是：**独立 app 不会自动继承根应用上下文**。凡是弹窗里依赖的 `i18n`、router、store、provide 或组件库配置，都必须通过 `configureModalApp` 重新安装；否则弹窗可能出现语言包缺失、注入为空或主题不一致的问题。
