import type { MenuRoute } from '@breeze/router'

/**
 * 主应用通过 loadMicroApp({ props }) 传递给子应用的业务数据
 *
 * @see https://qiankun.umijs.org/zh/api#loadmicroappapp-configuration
 */
export interface MicroAppHostProps {
  /** 子应用路由的 base 路径，对应主应用的 activeRule */
  activeRule: string
  /** 主应用注入的授权路由列表 */
  authorizedRoutes: MenuRoute[]
  /** 主应用注入的用户数据，消费侧按需 override 收窄类型 */
  userData: unknown
}

/**
 * qiankun 生命周期钩子接收的完整 props
 * = 用户自定义业务 props（T）+ qiankun 框架注入字段
 */
export type QiankunLifecycleProps<
  T extends MicroAppHostProps = MicroAppHostProps,
> = T & {
  /** qiankun 框架注入的子应用容器 DOM 节点 */
  container?: HTMLElement
}

/**
 * 子应用 props 上下文基类
 *
 * 负责缓存 qiankun mount 阶段注入的 props，对外通过 `setProps` / `reset`
 * 管理生命周期。子应用可继承此类并重写 getter/方法以实现自定义处理逻辑。
 */
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
