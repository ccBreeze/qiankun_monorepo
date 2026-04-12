---
title: '@breeze/runtime'
outline: [2, 4]
---

# @breeze/runtime

本文档说明 `packages/runtime` 的职责与实现。该包提供主子应用共享的运行时类型定义与上下文工具，是子应用感知 qiankun 注入数据的统一入口。

## 职责

- 定义主应用通过 qiankun `props` 传入子应用的标准字段类型（`MicroAppHostProps`）
- 提供 `MicroAppContext` 基类，子应用直接实例化或继承扩展，通过 `setProps` / `reset` 管理 props 生命周期
- 维护 `window.QiankunRuntime` 全局单例，通过 `channel`（EventEmitter2）实现主子应用双向事件通信
- 定义 `RUNTIME_EVENTS` 事件契约与类型安全的 Payload 接口，统一主子应用通信协议

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

## QiankunRuntime

`QiankunRuntime` 是挂载在 `window` 上的全局运行时对象。

```ts [packages/runtime/src/instance.ts]
import { QiankunRuntime } from './QiankunRuntime'

declare global {
  interface Window {
    QiankunRuntime: QiankunRuntime
  }
}

export const createContext = () => {
  if (typeof window === 'undefined') {
    throw new Error('[QiankunRuntime] 浏览器环境不可用')
  }

  return (window.QiankunRuntime ??= new QiankunRuntime()) // [!code focus]
}

createContext() // [!code focus]
```

```ts [packages/runtime/src/QiankunRuntime.ts]
export class QiankunRuntime {
  public channel = new EventEmitter2()
}
```

::: info 全局单例的设计意图
`window.QiankunRuntime` 保证主应用与所有子应用共享同一个 `channel` 实例。无论谁先执行，都只会创建一次实例。

模块加载时自动调用 `createContext()`，消费方直接通过 `window.QiankunRuntime.channel` 访问事件总线，无需再导入实例变量。
:::

## RUNTIME_EVENTS

应用间的通信的详细说明请参阅 [应用间的通信（RUNTIME_EVENTS）](./runtime-events.md)。
