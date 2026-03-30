import type { ApiFn, ApiResponse, EnhancerArgs } from '../types'

/**
 * 接口响应成功提示
 * @description 默认禁用
 */
export const withSuccessMessage = <T>({
  api,
  config,
  context,
}: EnhancerArgs<T>): ApiFn<T> => {
  // 没有提供成功处理器
  if (!context.onSuccess) return api
  // 配置中未启用
  if (!config.showSuccessMessage) return api

  return () =>
    api().then((res) => {
      context.onSuccess!(res as ApiResponse)
      return res
    })
}
