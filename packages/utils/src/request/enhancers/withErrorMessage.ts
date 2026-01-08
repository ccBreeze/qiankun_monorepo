import type { ApiFn, EnhancerArgs } from '../types'

/** 接口响应失败提示（需要提供 showError 函数） */
export const withErrorMessage = <T>({
  api,
  context,
}: EnhancerArgs<T>): ApiFn<T> => {
  const { showError } = context
  if (!showError) return api

  return () =>
    api().catch((error) => {
      showError(error)
      return Promise.reject(error)
    })
}
