import { CACHE_STRATEGY } from '../../constants'
import type { CacheStrategy } from './CacheStrategy'
import { forceRefreshStrategy } from './ForceRefreshStrategy'
import { lruCacheStrategy } from './LRUCacheStrategy'
import { memoryCacheStrategy } from './MemoryCacheStrategy'

/**
 * 解析缓存策略
 * @param useCache 缓存配置
 * @returns 对应的缓存策略实例
 */
export const resolveCacheStrategy = (
  useCache: boolean | CACHE_STRATEGY,
): CacheStrategy => {
  if (useCache === CACHE_STRATEGY.LRU) return lruCacheStrategy
  if (useCache === CACHE_STRATEGY.FORCE_REFRESH) return forceRefreshStrategy
  // true 或 CACHE_STRATEGY.MEMORY 都使用内存缓存
  return memoryCacheStrategy
}
