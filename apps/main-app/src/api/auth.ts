import { postDC } from '@/utils/request'

import type { LoginParams, LoginResult } from './types/auth'

/** 登录 */
export const loginApi = (content: LoginParams) => {
  return postDC<LoginResult>(
    {
      actionName: 'candao.account.login',
      content,
    },
    {
      showSuccessMessage: true,
    },
  )
}
