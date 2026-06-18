import type { ApiFn, EnhancerArgs } from '../types'

/** 每个 key 对应上一个请求的 cleanup，用于标记旧请求过期并取消 HTTP 请求 */
const cleanupMap = new Map<string, () => void>()

const createAbortError = () =>
  new DOMException('请求已被竞态防护取消', 'AbortError')

/**
 * 竞态防护增强器
 * @description 开启后，相同接口的新请求会取消前一个未完成请求。默认禁用。
 */
export const withRaceGuard = <T>({
  api,
  config,
}: EnhancerArgs<T>): ApiFn<T> => {
  if (!config.raceGuard) return api
  // 以 actionName 作为竞态分组 key，确保只有同一接口的请求互相竞争
  const key = config.data?.actionName ?? config.url
  if (!key) return api

  return async () => {
    // 执行同 key 上一个请求的 cleanup，标记旧请求过期并取消 HTTP 请求
    cleanupMap.get(key)?.()
    const controller = new AbortController()
    let expired = false
    const cleanup = () => {
      expired = true
      controller.abort()
    }
    cleanupMap.set(key, cleanup)

    config.signal = controller.signal

    let result: T
    try {
      result = await api()
    } catch (err) {
      // api() 自身抛错时，若当前请求已过期，优先以竞态取消上报
      if (expired) {
        throw createAbortError()
      }
      throw err
    } finally {
      if (config.signal === controller.signal) {
        delete config.signal
      }
      if (cleanupMap.get(key) === cleanup) {
        cleanupMap.delete(key)
      }
    }

    // HTTP 完成后检查是否已过期（等价于 Vue onCleanup 的 expired 标志）
    if (expired) {
      throw createAbortError()
    }
    return result
  }
}
