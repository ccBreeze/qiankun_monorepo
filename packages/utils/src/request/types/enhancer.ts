/**
 * 增强器模块内部类型定义
 */

import { type CACHE_STRATEGY } from '../constants'
import type { ApiFn, ApiResponse, RequestConfig } from './common'

/** 重试配置选项 */
export interface RetryConfig {
  /** 最大重试次数 */
  count?: number
  /** 重试延迟时间 */
  delay?: number
  /** 是否使用指数退避 */
  exponential?: boolean
}

/** 请求配置选项（用于增强器） */
export interface RequestEnhancerConfig {
  /** 显示 loading 状态 */
  showLoading?: boolean
  /** 显示成功提示 */
  showSuccessMessage?: boolean
  /** 显示错误提示 */
  showErrorMessage?: boolean
  /**
   * 缓存策略
   * - `true`: 内存缓存（Map），页面刷新时重置
   * - `CACHE_STRATEGY.MEMORY`: 同 `true`
   * - `CACHE_STRATEGY.LRU`: LRU 缓存，支持最大数量限制和 TTL 过期
   * - `CACHE_STRATEGY.FORCE_REFRESH`: 强制刷新现有缓存（检测并更新之前的缓存，若无缓存则不创建）
   */
  useCache?: boolean | CACHE_STRATEGY
  /** 自动提取响应的 data 字段（默认 true，设为 false 返回完整响应） */
  rawResponse?: boolean
  /**
   * 请求失败重试配置
   * - `true`: 使用默认配置（重试 3 次，间隔 1 秒）
   * - `RetryConfig`: 自定义重试配置
   */
  retry?: boolean | RetryConfig
}

/** 消息提示函数类型 */
export type MessageFn = (res: ApiResponse | null) => void

/** 加载控制器接口 */
export interface LoadingController {
  show: (options?: { delay?: number }) => void
  hide: () => void
}

/** 增强器上下文配置 */
export interface EnhancerContext {
  /** 错误消息处理器 */
  onError?: MessageFn
  /** 成功消息处理器 */
  onSuccess?: MessageFn
  /** Loading 控制器 */
  loadingController?: LoadingController
  /** Loading 延迟时间（毫秒） */
  loadingDelay?: number
}

/** 增强器入参 */
export interface EnhancerArgs<T> {
  api: ApiFn<T>
  config: RequestConfig
  context: EnhancerContext
}
