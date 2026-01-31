// eslint-disable-next-line @typescript-eslint/no-unused-vars -- {@link} 引用需要
import type { RequestEnhancerConfig } from '../types'
import type { ApiFn, EnhancerArgs } from '../types'
import { generateCacheKey, resolveCacheStrategy } from './cacheStrategies'

/**
 * 接口请求缓存增强器
 * @description 默认禁用，支持多种缓存策略
 * @see {@link RequestEnhancerConfig.useCache} 缓存策略详细说明
 */
export const withCache = <T>({ api, config }: EnhancerArgs<T>): ApiFn<T> => {
  // 配置中未启用缓存
  if (!config.useCache) return api

  const key = generateCacheKey(config)
  const strategy = resolveCacheStrategy(config.useCache)
  const cachedValue = strategy.get(key)

  // 命中缓存，直接返回
  if (cachedValue) {
    return () => Promise.resolve(cachedValue as T)
  }

  // 未命中缓存，发起请求并缓存结果
  return () =>
    api().then((res) => {
      strategy.set(key, res)
      return res
    })
}
