import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { grayDir as defaultGrayDir, isGray as defaultIsGray } from '../env'
import { RES_STATUS } from './constants'
import type {
  ApiResponse,
  RequestData,
  ResponseInterceptorOptions,
} from './types'

export interface RequestInterceptorOptions {
  getAuthToken: () => string
  /** 获取是否为灰度环境，默认使用 env.ts 中的 isGray */
  getIsGray?: () => boolean
  /** 灰度目录前缀，默认使用 env.ts 中的 grayDir */
  grayDir?: string
  systemCode: string
  buildUrl?: (url: string, actionName?: string, grayDir?: string) => string
}

export const attachRequestInterceptors = (
  options: RequestInterceptorOptions,
) => {
  return (config: InternalAxiosRequestConfig) => {
    const token = options.getAuthToken()
    const isGray = options.getIsGray?.() ?? defaultIsGray
    const grayDir = options.grayDir ?? defaultGrayDir
    const data = (config.data ?? {}) as RequestData

    config.headers.set('crm-token', token)
    config.url = `${grayDir}${config.url}?_name=${data.actionName}`
    config.data = {
      clientIsGray: isGray ? 1 : 0,
      token,
      systemCode: options.systemCode,
      content: {},
      ...data,
    }

    return config
  }
}

export const attachResponseInterceptors = (
  options: ResponseInterceptorOptions,
) => {
  const successStatus = options.successStatus ?? RES_STATUS.SUCCESS

  return (
    response: AxiosResponse,
  ): AxiosResponse | ApiResponse | Promise<never> => {
    if (response.config.responseType === 'blob') return response

    const data = response.data as ApiResponse
    // 登录失效
    if (
      data.status === RES_STATUS.NO_LOGIN ||
      data.status === RES_STATUS.LOGIN_EXPIRED
    ) {
      options.onLoginExpired(data)
      return Promise.reject(data)
    }
    // 未知报错
    if (data.status !== successStatus) {
      return Promise.reject(data)
    }

    return data
  }
}
