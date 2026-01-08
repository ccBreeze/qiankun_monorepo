import type { ApiResponse } from './types'

/** 请求函数类型 */
export type ApiFn<T> = () => Promise<T>

/** 请求配置选项（用于增强器） */
export interface RequestEnhancerConfig {
  /** 显示 loading 状态 */
  showLoading?: boolean
  /** 显示成功提示 */
  showSuccessMessage?: boolean
  /** 启用请求缓存 */
  useStore?: boolean
  /** 静默模式，不显示错误提示 */
  silent?: boolean
  /** 返回原始响应数据，不自动提取 data 字段 */
  rawResponse?: boolean
}

/** 消息提示函数类型 */
export type MessageFn = (error: ApiResponse | null) => void

/** 加载控制器接口 */
export interface LoadingController {
  show: (options?: { delay?: number }) => void
  hide: () => void
}

/** 增强器上下文配置 */
export interface EnhancerContext {
  showError?: MessageFn
  showSuccess?: MessageFn
  loadingController?: LoadingController
  loadingDelay?: number
}

/** 增强器入参 */
export interface EnhancerArgs<T> {
  api: ApiFn<T>
  config: RequestEnhancerConfig
  context: EnhancerContext
}
