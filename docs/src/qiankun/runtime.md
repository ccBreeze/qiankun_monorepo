---
title: '@breeze/runtime'
outline: [2, 4]
---

# @breeze/runtime

本文档说明 `packages/runtime` 的职责与实现。该包提供主子应用共享的运行时类型定义与上下文工具，是子应用感知 qiankun 注入数据的统一入口。

## 职责

- 定义主应用通过 qiankun `props` 传入子应用的标准字段类型（`MicroAppHostProps`）
- 提供 `MicroAppContext` 基类，子应用直接实例化或继承扩展，通过 `setProps` / `reset` 管理 props 生命周期
- 提供 `qiankunRuntime` 单例实例，通过 `channel`（EventEmitter2）实现主子应用双向事件通信
- 定义 `RUNTIME_EVENTS` 事件契约与类型安全的 Payload 接口，统一主子应用通信协议
- 提供 `MICRO_APP_ACTIVE_RULE` 等共享静态常量，避免主应用和子应用各自维护一份 `activeRule`

## MicroAppContext

`microAppContext` 是一个纯粹的 props 容器，消费方（路由守卫、业务代码）只与它交互，不感知当前运行环境。上下文的来源由启动方式决定：

- **qiankun 模式**

```ts [apps/vue3-history/src/main.ts]
renderWithQiankun({
  mount(props: QiankunLifecycleProps) {
    microAppContext.setProps(props)
    renderApp()
  },
  unmount() {
    app?.unmount()
    app = null
    microAppContext.reset()
  },
})
```

- **独立运行模式** (后续项目独立运行时)

```ts [apps/vue3-history/src/main.ts]
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  microAppContext.setProps({
    activeRule: import.meta.env.BASE_URL,
    authorizedRoutes: allRoutes,
  })
  renderApp()
}
```

### Type

主应用通过 `loadMicroApp({ props })` 传入子应用的标准业务字段：

```ts [packages/runtime/src/MicroAppContext.ts]
export interface MicroAppHostProps {
  /** 子应用路由的 base 路径，对应主应用的 activeRule */
  activeRule: string
  /** 主应用注入的授权路由列表 */
  authorizedRoutes: MenuRoute[]
  /** 主应用注入的用户数据，消费侧按需 override 收窄类型 */
  userData: unknown
}
```

`QiankunLifecycleProps` 在此基础上追加了 qiankun 框架本身注入的字段：

```ts
export type QiankunLifecycleProps<
  T extends MicroAppHostProps = MicroAppHostProps,
> = T & {
  /** qiankun 框架注入的子应用容器 DOM 节点 */
  container?: HTMLElement
}
```

:::details 为何不从 qiankun / vite-plugin-qiankun 导入类型？

`@breeze/runtime` 的定位是**纯运行时共享层**，刻意不依赖 `qiankun` 或 `vite-plugin-qiankun`，原因如下：

**1. 两者均未导出"子应用生命周期接收 props"的精确类型**

翻阅源码可以确认：

- **qiankun** 框架并未导出一个描述"子应用生命周期钩子入参"的命名类型。

  ```ts
  // qiankun/es/interfaces.d.ts
  export type ObjectType = Record<string, any>
  export type LoadableApp<T extends ObjectType> = AppMetadata & {
    props?: T // 仅供主应用侧使用，子应用侧无对应类型
  }
  ```

- **vite-plugin-qiankun**

  ```ts
  // vite-plugin-qiankun/dist/helper.d.ts
  export interface QiankunProps {
    container?: HTMLElement
    [x: string]: any // 索引签名，所有字段访问退化为 any
  }
  ```

**2. 依赖方向问题**

`qiankun` 是应用层依赖（仅 `apps/main-app` 直接使用），`vite-plugin-qiankun` 是构建时 Vite 插件（仅子应用开发环境依赖）。让共享包 `@breeze/runtime` 反向依赖它们会导致依赖方向倒置，并将构建工具绑定到共享层。

:::

### 类定义

```ts [packages/runtime/src/MicroAppContext.ts]
export class MicroAppContext<T extends MicroAppHostProps = MicroAppHostProps> {
  protected _props = {} as QiankunLifecycleProps<T>

  setProps(p: QiankunLifecycleProps<T>) {
    this._props = p
  }
  reset() {
    this._props = {} as QiankunLifecycleProps<T>
  }

  get activeRule() {
    return this._props.activeRule
  }

  get authorizedRoutes() {
    return this._props.authorizedRoutes
  }
}
```

### 扩展自定义字段

如果子应用有额外的业务 props 字段，继承 `MicroAppContext` 并添加 getter：

```ts
interface MyHostProps extends MicroAppHostProps {
  rawToken?: string
}

class MyMicroAppContext extends MicroAppContext<MyHostProps> {
  get rawToken() {
    return this._props.rawToken ? atob(this._props.rawToken) : undefined
  }
}

export const microAppContext = new MyMicroAppContext()
```

## qiankunRuntime

`@breeze/runtime` 对外暴露 `qiankunRuntime` 单例实例。

```ts
import { qiankunRuntime } from '@breeze/runtime'

qiankunRuntime.channel.emit(...)
```

::: info 共享单例的设计意图
主应用与所有子应用会共享同一个 `channel` 实例。底层会在浏览器全局对象上复用同一个运行时对象，但这是 `@breeze/runtime` 的内部实现细节，业务代码只应通过模块导出的 `qiankunRuntime` 访问。
:::

运行时内部实现如下：

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

这种做法兼顾了两层诉求：

- 业务层通过模块导入获得稳定 API，不需要显式读写 `window.QiankunRuntime`
- 运行时层仍然借助浏览器全局对象复用实例，并通过 `Symbol.for(...)` 避免使用裸字符串属性名，保证主应用和各个子应用最终拿到的是同一个 `channel`

## RUNTIME_EVENTS

应用间的通信的详细说明请参阅 [应用间的通信（RUNTIME_EVENTS）](./runtime-events.md)。

## MICRO_APP_ACTIVE_RULE

`@breeze/runtime` 现在同时承载主子应用共享的静态路由常量：

```ts [packages/runtime/src/microApps.ts]
export const MICRO_APP_ACTIVE_RULE = {
  OCRM: '/ocrm/#',
  VUE3_HISTORY: '/vue3-history',
  BREEZE_CRM_V8: '/crm-v8',
} as const
```

- 主应用用它构建 `microAppDefinitions`、菜单 `fallbackActiveRule`；
- 子应用则可直接用它拼接跨应用跳转目标路径：

```ts [apps/vue3-history/src/views/KeepAliveDemo/index.vue]
const crossAppExampleFullPath = `${MICRO_APP_ACTIVE_RULE.OCRM}/index/datainput/brand/42`
```
