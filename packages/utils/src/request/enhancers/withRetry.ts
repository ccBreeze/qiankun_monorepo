import type { ApiFn, EnhancerArgs } from '../types'

/** 默认重试次数 */
const DEFAULT_RETRY_COUNT = 3

/** 默认重试延迟（毫秒） */
const DEFAULT_RETRY_DELAY = 1000

/**
 * 延迟执行
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 计算重试延迟时间
 * @param baseDelay 基础延迟时间
 * @param attempt 当前重试次数（从 1 开始）
 * @param useExponential 是否使用指数退避
 */
const getRetryDelay = (
  baseDelay: number,
  attempt: number,
  useExponential: boolean,
): number => {
  if (!useExponential) return baseDelay
  // 指数退避：delay * 2^(attempt-1)，例如 1000, 2000, 4000...
  return baseDelay * Math.pow(2, attempt - 1)
}

/**
 * 请求重试增强器
 * @description 默认禁用，需显式配置 retry 选项启用
 */
export const withRetry = <T>({ api, config }: EnhancerArgs<T>): ApiFn<T> => {
  // 未启用重试
  if (!config.retry) return api

  const retryConfig = config.retry === true ? {} : config.retry
  const maxRetries = retryConfig.count ?? DEFAULT_RETRY_COUNT
  const retryDelay = retryConfig.delay ?? DEFAULT_RETRY_DELAY
  const useExponential = retryConfig.exponential ?? false

  return async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await api()
      } catch (error) {
        // 已达最大重试次数，直接抛出
        if (attempt >= maxRetries) {
          throw error
        }

        // 计算延迟时间并等待
        const waitTime = getRetryDelay(retryDelay, attempt + 1, useExponential)
        await delay(waitTime)
      }
    }

    // 永远不会到达这里，仅为 TypeScript 类型推断
    throw new Error('Unexpected: retry loop exited without result')
  }
}
