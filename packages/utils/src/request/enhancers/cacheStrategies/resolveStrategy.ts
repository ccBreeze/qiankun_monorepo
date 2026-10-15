import type { CacheStrategy } from './CacheStrategy'
import { forceRefreshStrategy } from './ForceRefreshStrategy'
import { lruCacheStrategy } from './LRUCacheStrategy'
import { memoryCacheStrategy } from './MemoryCacheStrategy'

/** 缓存策略 */
export enum CACHE_STRATEGY {
  /** 内存缓存（Map）- 页面刷新时重置，无过期和数量限制 */
  MEMORY,
  /** LRU 缓存 - 支持最大数量限制和 TTL 过期 */
  LRU,
  /** 强制刷新 - 忽略现有缓存强制请求，若之前有缓存则更新，否则不创建缓存 */
  FORCE_REFRESH,
}

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
