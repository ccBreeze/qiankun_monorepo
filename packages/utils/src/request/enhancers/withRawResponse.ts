import type { ApiResponse, EnhancerArgs } from '../types'

/**
 * 数据提取
 * @description
 * - 默认启用
 * - 提取响应的 data 字段，简化业务层调用
 */
export const withRawResponse = <T>({ api, config }: EnhancerArgs<T>) => {
  // 如果配置中明确获取完整响应
  if (config.rawResponse === true) return api

  return async () => {
    const res = await api()
    // 提取 data 字段
    return (res as ApiResponse<T>).data
  }
}
