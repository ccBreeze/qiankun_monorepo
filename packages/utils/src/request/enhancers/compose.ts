import type {
  ApiFn,
  EnhancerArgs,
  EnhancerContext,
  RequestConfig,
} from '../types'
import { withLoading } from './withLoading'
import { withSuccessMessage } from './withSuccessMessage'
import { withErrorMessage } from './withErrorMessage'
import { withCache } from './withCache'
import { withRawResponse } from './withRawResponse'
import { withRetry } from './withRetry'

/** 增强器函数类型 */
type EnhancerFn = <T>(args: EnhancerArgs<T>) => ApiFn<T>

/**
 * 增强器列表（按执行顺序）
 */
const enhancers: EnhancerFn[] = [
  withLoading,
  withSuccessMessage,
  withErrorMessage,
  withCache,
  withRetry,
  // 数据提取增强器放最后，确保其他增强器能访问完整响应
  withRawResponse,
]

/**
 * 创建增强请求函数
 */
export const createEnhanceRequest = (context: EnhancerContext) => {
  return <T>(api: ApiFn<T>, config: RequestConfig): Promise<T> => {
    // 依次应用所有增强器
    // 每个增强器内部自行判断是否应该生效，并管理自己的默认值
    const enhanced = enhancers.reduce(
      (acc, enhancer) => enhancer({ api: acc, config, context }),
      api,
    )

    return enhanced()
  }
}
