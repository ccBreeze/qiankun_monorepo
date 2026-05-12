import { MicroAppContext } from '@breeze/runtime'
export type { MicroAppHostProps, QiankunLifecycleProps } from '@breeze/runtime'

/**
 * 子应用 props 上下文实例，供子应用业务代码使用
 */
export const microAppContext = new MicroAppContext()
