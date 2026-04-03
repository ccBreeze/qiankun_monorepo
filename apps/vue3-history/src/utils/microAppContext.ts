import { createMicroAppContext } from '@breeze/runtime'
export type { MicroAppHostProps, QiankunLifecycleProps } from '@breeze/runtime'

/**
 * 子应用 props 上下文单例
 *
 * 通过 Proxy 将宿主注入的 _props 字段自动透传为实例属性，无需手写 getter：
 *   microAppContext.baseUrl              // 自动透传
 *   microAppContext.getAuthorizedRoutes() // 内置自定义 getter（调用函数 + 空数组兜底）
 *
 * 如需扩展自定义字段或处理逻辑，传入 customGetters：
 * @example
 * interface MyHostProps extends MicroAppHostProps { rawToken?: string }
 * export const microAppContext = createMicroAppContext<MyHostProps>({
 *   rawToken: (props) => props.rawToken ? atob(props.rawToken) : undefined,
 * }) as MicroAppContextInstance<MyHostProps> & { rawToken: string | undefined }
 */
export const microAppContext = createMicroAppContext()
