import { postDC } from '@/utils/request'

/** 登录 */
export const getEnumsApi = () => {
  return postDC(
    {
      actionName: 'candao.system.getEnums',
    },
    {
      useCache: true,
    },
  )
}
