import type { RequestEnhancerConfig } from './enhancerTypes'

export type * from './enhancerTypes'

/** 请求数据结构 */
export interface RequestData<TContent = Record<string, unknown>> {
  /** 接口动作名 */
  actionName: string
  /** 请求体内容 */
  content?: TContent
}

/** 请求配置 */
export interface RequestConfig<
  TContent = Record<string, unknown>,
> extends RequestEnhancerConfig {
  method?: string
  url: string
  data: RequestData<TContent>
  headers?: Record<string, string>
  responseType?: 'blob' | 'json'
}

/** 标准 API 响应 */
export interface ApiResponse<T = unknown> {
  /** 响应状态码 */
  status: number
  /** 响应消息 */
  msg: string | null
  /** 响应数据 */
  data: T
}

/** 响应拦截器配置选项 */
export interface ResponseInterceptorOptions {
  /** 登录过期回调 */
  onLoginExpired: (data: ApiResponse) => void
  /** 成功状态码，默认为 RES_STATUS.SUCCESS */
  successStatus?: number
}
