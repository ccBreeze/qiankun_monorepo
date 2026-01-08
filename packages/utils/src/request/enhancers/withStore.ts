import md5 from 'crypto-js/md5'
import { LRUCache } from 'lru-cache'
import type { ApiFn, EnhancerArgs } from '../types'

/** 缓存配置 */
const CACHE_OPTIONS = {
  /** 最大缓存数量 */
  max: 100,
  /** 默认 TTL：30 分钟（毫秒） */
  ttl: 30 * 60 * 1000,
} as const

/** LRU 缓存实例 */
const requestCache = new LRUCache<string, object>(CACHE_OPTIONS)

/**
 * 生成请求缓存键
 * @description 使用 MD5 对配置对象进行哈希，生成唯一的缓存键
 */
const generateRequestStoreKey = (config: unknown): string => {
  try {
    return md5(JSON.stringify(config)).toString()
  } catch {
    // JSON.stringify 可能因循环引用等原因失败，使用备选方案
    return md5(String(config)).toString()
  }
}

/**
 * 接口请求缓存增强器
 * @description 使用 LRU 策略缓存请求结果，自动淘汰最久未使用的缓存
 */
export const withStore = <T>({ api, config }: EnhancerArgs<T>): ApiFn<T> => {
  const key = generateRequestStoreKey(config)
  const cachedValue = requestCache.get(key)

  // 命中缓存，直接返回
  if (cachedValue) {
    return () => Promise.resolve(cachedValue as T)
  }

  // 未命中缓存，发起请求并缓存结果
  return () =>
    api().then((res) => {
      requestCache.set(key, res as object)
      return res
    })
}

/** 清除所有缓存 */
export const clearRequestStore = (): void => {
  requestCache.clear()
}

/** 根据配置清除特定缓存 */
export const clearRequestStoreByConfig = (config: unknown): void => {
  const key = generateRequestStoreKey(config)
  requestCache.delete(key)
}
