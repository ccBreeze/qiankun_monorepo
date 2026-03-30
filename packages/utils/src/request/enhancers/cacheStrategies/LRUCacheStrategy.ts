import { LRUCache } from 'lru-cache'

/** LRU 缓存配置 */
const LRU_CACHE_OPTIONS = {
  /** 最大缓存数量 */
  max: 100,
  /** 默认 TTL：30 分钟（毫秒） */
  ttl: 30 * 60 * 1000,
} as const

/**
 * LRU 缓存策略
 * @description 使用 LRU 算法实现的缓存，支持最大数量限制和 TTL 过期
 */
export const lruCacheStrategy = new LRUCache(LRU_CACHE_OPTIONS)
