import type { CacheStrategy } from './CacheStrategy'
import { lruCacheStrategy } from './LRUCacheStrategy'
import { memoryCacheStrategy } from './MemoryCacheStrategy'

/**
 * 强制刷新策略
 * @description 忽略现有缓存强制请求，若之前有缓存则更新对应的缓存，否则不创建缓存
 */
export class ForceRefreshStrategy implements CacheStrategy {
  /**
   * 始终返回 undefined，强制重新请求
   */
  get(): undefined {
    return undefined
  }

  /**
   * 检测并更新之前使用的缓存
   * - 如果 LRU 缓存中存在，则更新 LRU 缓存
   * - 如果内存缓存中存在，则更新内存缓存
   * - 如果都不存在，则不做任何操作
   */
  set(key: string, value: object): void {
    if (lruCacheStrategy.has(key)) {
      lruCacheStrategy.set(key, value)
    } else if (memoryCacheStrategy.has(key)) {
      memoryCacheStrategy.set(key, value)
    }
    // 如果都没有缓存过，不做任何操作
  }

  /**
   * 始终返回 false，强制重新请求
   */
  has(): boolean {
    return false
  }

  /**
   * 无操作：ForceRefreshStrategy 不维护独立缓存，删除操作由原始缓存策略处理
   */
  delete(): void {
    // 强制刷新策略不维护独立缓存，此方法无操作
  }

  /**
   * 无操作：ForceRefreshStrategy 不维护独立缓存，清除操作由原始缓存策略处理
   */
  clear(): void {
    // 强制刷新策略不维护独立缓存，此方法无操作
  }
}

/** 全局强制刷新策略实例（单例） */
export const forceRefreshStrategy = new ForceRefreshStrategy()
