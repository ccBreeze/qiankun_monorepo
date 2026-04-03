import type { MenuRoute } from '@breeze/router'

/**
 * 主应用通过 loadMicroApp({ props }) 传递给子应用的业务数据
 * 子应用可通过泛型参数 THostProps 扩展自定义字段
 *
 * @see https://qiankun.umijs.org/zh/api#loadmicroappapp-configuration
 */
export interface MicroAppHostProps {
  /** 微应用路由的 base 路径，对应主应用的 activeRule */
  baseUrl?: string
  /** 菜单标识，主应用透传，用于菜单权限过滤 */
  menuKey?: string
  /** 主应用注入的授权路由获取函数，子应用路由初始化时按需调用 */
  getAuthorizedRoutes?: () => MenuRoute[]
}

/**
 * qiankun 生命周期钩子接收的完整 props
 * = 用户自定义业务 props（THostProps）+ qiankun 框架注入字段
 */
export type QiankunLifecycleProps<
  THostProps extends MicroAppHostProps = MicroAppHostProps,
> = THostProps & {
  /** qiankun 框架注入的子应用容器 DOM 节点 */
  container?: HTMLElement
}

/**
 * 自定义 getter 映射
 *
 * key 对应 _props 中的字段，value 是接收当前 props 并返回处理结果的工厂函数：
 * - 返回函数 → 以方法形式对外暴露（需调用）
 * - 返回普通值 → 以属性形式对外暴露
 *
 * 未声明的字段由 Proxy 自动透传 _props 对应值，无需手写 getter。
 *
 * @example
 * createMicroAppContext<MyProps>({
 *   // 以方法暴露：屏蔽 undefined 并提供兜底
 *   getAuthorizedRoutes: (props) => () => props.getAuthorizedRoutes?.() ?? [],
 *   // 以属性暴露：对原始值做转换
 *   rawToken: (props) => props.rawToken ? atob(props.rawToken) : undefined,
 * })
 */
export type CustomGetters<
  THostProps extends MicroAppHostProps = MicroAppHostProps,
> = Partial<{
  [K in keyof QiankunLifecycleProps<THostProps>]: (
    props: QiankunLifecycleProps<THostProps>,
  ) => unknown
}>

/**
 * MicroAppContext 实例的对外类型
 *
 * = 生命周期方法（setProps / reset）
 * + _props 字段直接透传（Proxy 自动代理，无需手写 getter）
 * + 自定义 getter 覆盖（如将可选函数字段变为确定方法）
 */
export type MicroAppContextInstance<
  THostProps extends MicroAppHostProps = MicroAppHostProps,
> = Pick<MicroAppContext<THostProps>, 'setProps' | 'reset'> &
  Omit<QiankunLifecycleProps<THostProps>, 'getAuthorizedRoutes'> & {
    getAuthorizedRoutes: () => MenuRoute[]
  }

/** 内置自定义 getter：仅声明需要特殊处理的字段，其余由 Proxy 自动透传 */
const defaultCustomGetters: CustomGetters = {
  /** 调用注入的函数并提供空数组兜底，屏蔽调用方的 undefined 判断 */
  getAuthorizedRoutes: (props) => (): MenuRoute[] =>
    props.getAuthorizedRoutes?.() ?? [],
}

/**
 * 子应用 props 上下文基类
 *
 * 负责缓存 qiankun mount 阶段注入的 props，对外通过 `setProps` / `reset`
 * 管理生命周期。实例化时通过 {@link createMicroAppContext} 工厂函数创建，
 * 由 Proxy 将 _props 字段自动透传为实例属性，无需为每个字段手写 getter。
 */
export class MicroAppContext<
  THostProps extends MicroAppHostProps = MicroAppHostProps,
> {
  _props: QiankunLifecycleProps<THostProps> =
    {} as QiankunLifecycleProps<THostProps>

  /** 在 qiankun mount 生命周期中调用，缓存宿主注入的 props */
  setProps(p: QiankunLifecycleProps<THostProps>): void {
    this._props = p
  }

  /** 在 qiankun unmount 生命周期中调用，清除缓存的 props */
  reset(): void {
    this._props = {} as QiankunLifecycleProps<THostProps>
  }
}

/**
 * 创建子应用 props 上下文实例（工厂函数）
 *
 * 返回一个 Proxy 包装的实例，_props 的所有字段自动透传为实例属性，
 * 通过 customGetters 可对特定字段声明自定义处理逻辑。
 *
 * @param customGetters 需要特殊处理的字段映射，会与内置 getter 合并（优先级更高）
 *
 * @example
 * // 直接使用（_props 字段自动透传）
 * export const microAppContext = createMicroAppContext()
 * microAppContext.baseUrl             // string | undefined（自动透传）
 * microAppContext.getAuthorizedRoutes() // MenuRoute[]（内置自定义 getter）
 *
 * @example
 * // 扩展自定义字段与处理逻辑
 * interface MyHostProps extends MicroAppHostProps { rawToken?: string }
 *
 * export const microAppContext = createMicroAppContext<MyHostProps>({
 *   rawToken: (props) => props.rawToken ? atob(props.rawToken) : undefined,
 * }) as MicroAppContextInstance<MyHostProps> & { rawToken: string | undefined }
 */
export function createMicroAppContext<
  THostProps extends MicroAppHostProps = MicroAppHostProps,
>(
  customGetters?: CustomGetters<THostProps>,
): MicroAppContextInstance<THostProps> {
  const ctx = new MicroAppContext<THostProps>()
  const getters = {
    ...defaultCustomGetters,
    ...customGetters,
  } as CustomGetters<THostProps>

  return new Proxy(ctx, {
    get(target, key, receiver) {
      // Symbol 直接走类自身（避免干扰 Vue 响应式、迭代器等内部协议）
      if (typeof key === 'symbol') return Reflect.get(target, key, receiver)

      // 自定义 getter 优先：可覆盖 _props 字段的默认透传行为
      if (Object.prototype.hasOwnProperty.call(getters, key)) {
        const getter = (
          getters as Record<
            string,
            ((p: QiankunLifecycleProps<THostProps>) => unknown) | undefined
          >
        )[key]
        if (getter) return getter(target._props)
      }

      // 类自身方法与属性（setProps、reset、_props 等）
      if (key in target) return Reflect.get(target, key, receiver)

      // 其余字段直接透传 _props
      return Reflect.get(target._props as object, key)
    },
  }) as unknown as MicroAppContextInstance<THostProps>
}
