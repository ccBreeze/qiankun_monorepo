import type { ApiFn, EnhancerArgs } from '../types'

/**
 * 接口响应失败提示
 * @description 默认启用
 */
export const withErrorMessage = <T>({
  api,
  config,
  context,
}: EnhancerArgs<T>): ApiFn<T> => {
  // 没有提供错误处理器
  if (!context.onError) return api
  // 配置中明确禁用错误提示
  if (config.showErrorMessage === false) return api

  return () =>
    api().catch((error) => {
      context.onError!(error)
      return Promise.reject(error)
    })
}
