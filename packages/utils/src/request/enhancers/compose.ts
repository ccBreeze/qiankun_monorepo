import type {
  ApiFn,
  EnhancerArgs,
  EnhancerContext,
  RequestEnhancerConfig,
} from '../types'
import { withRawResponse } from './withRawResponse'
import { withErrorMessage } from './withErrorMessage'
import { withLoading } from './withLoading'
import { withStore } from './withStore'
import { withSuccessMessage } from './withSuccessMessage'

/** 增强器条件函数类型 */
type ConditionFn = (config: RequestEnhancerConfig) => boolean

/** 增强器函数类型 */
type EnhancerFn = <T>(args: EnhancerArgs<T>) => ApiFn<T>

/** 增强器映射配置 */
type EnhancerMapping = [condition: ConditionFn, enhancer: EnhancerFn]

/** 创建属性检查条件（检查指定属性是否为 truthy） */
const when = (key: keyof RequestEnhancerConfig): ConditionFn => {
  return (config) => Boolean(config[key])
}

/** 创建属性否定检查条件（检查指定属性是否为 falsy） */
const whenNot = (key: keyof RequestEnhancerConfig): ConditionFn => {
  return (config) => !config[key]
}

/** 增强器映射表 */
const enhancerMappings: EnhancerMapping[] = [
  [whenNot('silent'), withErrorMessage],
  [when('showLoading'), withLoading],
  [when('showSuccessMessage'), withSuccessMessage],
  [when('useStore'), withStore],
  // 原始响应增强器放最后，确保其他增强器能访问完整响应
  [whenNot('rawResponse'), withRawResponse],
]

/** 创建增强请求函数 */
export const createEnhanceRequest = (context: EnhancerContext) => {
  return <T>(api: ApiFn<T>, config: RequestEnhancerConfig): Promise<T> => {
    const enhanced = enhancerMappings.reduce(
      (acc, [condition, enhancer]) =>
        condition(config) ? enhancer({ api: acc, config, context }) : acc,
      api,
    )
    return enhanced()
  }
}
