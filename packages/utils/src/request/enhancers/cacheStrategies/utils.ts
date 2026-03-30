import md5 from 'crypto-js/md5'
import type { RequestConfig } from '../../types'
import { lruCacheStrategy } from './LRUCacheStrategy'
import { memoryCacheStrategy } from './MemoryCacheStrategy'

/**
 * 生成缓存键
 * @description 使用 MD5 对配置对象进行哈希，生成唯一的缓存键
 * @param config 请求配置对象
 * @returns MD5 哈希字符串
 */
export const generateCacheKey = (config: RequestConfig): string | null => {
  try {
    // 不要放时间戳、随机数等变化字段
    return md5(JSON.stringify(config)).toString()
  } catch {
    // 放弃缓存
    // JSON.stringify 可能因循环引用等原因失败
    return null
  }
}

/**
 * 清除所有缓存（包括内存缓存和 LRU 缓存）
 */
export const clearRequestStore = (): void => {
  memoryCacheStrategy.clear()
  lruCacheStrategy.clear()
}

/**
 * 根据配置清除特定缓存（同时清除两种缓存中的对应项）
 * @param config 请求配置
 */
export const clearRequestStoreByConfig = (config: RequestConfig): void => {
  const key = generateCacheKey(config)
  if (!key) return
  memoryCacheStrategy.delete(key)
  lruCacheStrategy.delete(key)
}
