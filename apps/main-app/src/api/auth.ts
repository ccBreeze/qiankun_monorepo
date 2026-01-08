import { postDC } from '@/utils/request'
import type { LoginParams, LoginResponse } from './types/auth'

/** 登录 */
export const loginApi = (content: LoginParams) => {
  return postDC<LoginResponse>(
    {
      actionName: 'candao.account.login',
      content,
    },
    {
      showSuccessMessage: true,
    },
  )
}
