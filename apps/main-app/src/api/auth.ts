import { postDC } from '@/utils/request'

import type { LoginParams, LoginResult } from './types/auth'

/** 登录 */
export const loginApi = (content: LoginParams) => {
  return postDC<LoginResult>(
    {
      actionName: 'breeze.account.login',
      content,
    },
    {
      showSuccessMessage: true,
    },
  )
}
