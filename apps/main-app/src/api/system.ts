import { postDC } from '@/utils/request'

/** 登录 */
export const getEnumsApi = () => {
  return postDC(
    {
      actionName: 'breeze.system.getEnums',
    },
    {
      useCache: true,
    },
  )
}
