/**
 * 请求模块公共类型定义
 * 包含被多处引用、需导出给外部的类型
 */

import type { AxiosRequestConfig } from 'axios'
import type { RequestEnhancerConfig } from './enhancer'

/** 请求函数类型 */
export type ApiFn<T> = () => Promise<T>

/** 请求数据结构 */
export interface RequestData<TContent extends object = object> {
  /** 接口动作名 */
  actionName: string
  /** 请求体内容 */
  content?: TContent
}

/** 请求配置 */
export type RequestConfig<TContent extends object = object> =
  AxiosRequestConfig<RequestData<TContent>> & RequestEnhancerConfig

/** 标准 API 响应 */
export interface ApiResponse<T = unknown> {
  /** 响应状态码 */
  status: number
  /** 响应消息 */
  msg: string | null
  /** 响应数据 */
  data: T
}
