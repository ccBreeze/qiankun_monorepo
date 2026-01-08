import type { ApiResponse, EnhancerArgs } from '../types'

/**
 * 原始响应增强器
 * 默认提取 res.data，当 rawResponse 为 true 时不应用此增强器
 */
export const withRawResponse = <T>(args: EnhancerArgs<T>) => {
  const { api } = args

  return async () => {
    const res = await api()
    // 提取 data 字段
    return (res as ApiResponse<T>).data
  }
}
