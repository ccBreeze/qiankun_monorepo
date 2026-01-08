import type { ApiFn, ApiResponse, EnhancerArgs } from '../types'

/** 接口响应成功提示（需要提供 showSuccess 函数） */
export const withSuccessMessage = <T>({
  api,
  context,
}: EnhancerArgs<T>): ApiFn<T> => {
  const { showSuccess } = context
  if (!showSuccess) return api

  return () =>
    api().then((res) => {
      showSuccess(res as ApiResponse)
      return res
    })
}
