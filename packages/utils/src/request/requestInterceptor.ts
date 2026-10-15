import type { InternalAxiosRequestConfig } from 'axios'
import { USER_STORAGE_KEY } from '../constants'
import { grayDir as defaultGrayDir, isGray as defaultIsGray } from '../env'
import type { RequestData } from './types'

/** 请求拦截器配置选项 */
export interface RequestInterceptorOptions {
  /** 获取登录 token */
  getAuthToken?: () => string
  /** 系统码，默认为 'oms_crm' */
  systemCode?: string
  /** 获取是否为灰度环境，默认使用 env.ts 中的 isGray */
  getIsGray?: () => boolean
  /** 灰度目录前缀，默认使用 env.ts 中的 grayDir */
  grayDir?: string
}

type UserData = {
  token?: string
}

const getDefaultAuthToken = (): string => {
  try {
    const userData = JSON.parse(
      localStorage.getItem(USER_STORAGE_KEY) ?? '{}',
    ) as UserData
    return userData.token ?? ''
  } catch {
    return ''
  }
}

/** 创建请求拦截器 */
export const createRequestInterceptor = ({
  getAuthToken = getDefaultAuthToken,
  getIsGray = () => defaultIsGray,
  grayDir = defaultGrayDir,
  systemCode = 'oms_crm',
}: RequestInterceptorOptions = {}) => {
  return (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken()
    const isGray = getIsGray()
    const data = (config.data ?? {}) as RequestData

    config.headers.set('crm-token', token)
    // 改写 URL：拼接灰度目录前缀与 actionName 查询参数
    config.url = `${grayDir}${config.url}?_name=${data.actionName}`
    config.data = {
      clientIsGray: isGray ? 1 : 0, // 灰度标识
      token,
      systemCode,
      content: {},
      ...data,
    }

    return config
  }
}
