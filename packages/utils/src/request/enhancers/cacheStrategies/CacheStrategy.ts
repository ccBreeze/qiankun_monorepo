/**
 * 缓存策略接口
 * @description 定义缓存策略的通用接口，所有具体策略都需要实现此接口
 */
export interface CacheStrategy {
  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存的值，如果不存在则返回 undefined
   */
  get(key: string): unknown

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 要缓存的值
   */
  set(key: string, value: unknown): void

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在缓存
   */
  has(key: string): boolean

  /**
   * 删除指定缓存
   * @param key 缓存键
   */
  delete(key: string): void

  /**
   * 清除所有缓存
   */
  clear(): void
}
