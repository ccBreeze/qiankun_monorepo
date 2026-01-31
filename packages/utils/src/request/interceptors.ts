import type {
  AxiosInterceptorManager,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { grayDir as defaultGrayDir, isGray as defaultIsGray } from '../env'
import { RES_STATUS } from './constants'
import type { ApiResponse, RequestData } from './types'

/** 响应拦截器函数类型，与 axios 响应拦截器 use 方法第一个参数类型一致 */
type ResponseInterceptorFulfilled = Parameters<
  AxiosInterceptorManager<AxiosResponse>['use']
>[0]

/** 请求拦截器配置选项 */
export interface RequestInterceptorOptions {
  getAuthToken: () => string
  /** 获取是否为灰度环境，默认使用 env.ts 中的 isGray */
  getIsGray?: () => boolean
  /** 灰度目录前缀，默认使用 env.ts 中的 grayDir */
  grayDir?: string
  systemCode: string
}

/** 响应拦截器配置选项 */
export interface ResponseInterceptorOptions {
  /** 登录过期回调 */
  onLoginExpired?: (data: ApiResponse) => void
  /** 成功状态码，默认为 RES_STATUS.SUCCESS */
  successStatus?: number
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
  options: ResponseInterceptorOptions = {},
): NonNullable<ResponseInterceptorFulfilled> => {
  const successStatus = options.successStatus ?? RES_STATUS.SUCCESS

  // 拦截器会将 AxiosResponse 转换为 ApiResponse，类型断言在此处理
  // 业务层无需再进行类型断言
  const interceptor = (
    response: AxiosResponse,
  ): AxiosResponse | ApiResponse | Promise<never> => {
    if (response.config.responseType === 'blob') return response

    const data = response.data as ApiResponse
    // 登录失效
    if (
      data.status === RES_STATUS.NO_LOGIN ||
      data.status === RES_STATUS.LOGIN_EXPIRED
    ) {
      options.onLoginExpired?.(data)
      return Promise.reject(data)
    }
    // 未知报错
    if (data.status !== successStatus) {
      return Promise.reject(data)
    }

    return data
  }

  return interceptor as NonNullable<ResponseInterceptorFulfilled>
}
