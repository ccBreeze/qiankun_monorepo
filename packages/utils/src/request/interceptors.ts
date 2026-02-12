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
  /** 系统码，默认为 'oms_crm' */
  systemCode?: string
  /** 获取是否为灰度环境，默认使用 env.ts 中的 isGray */
  getIsGray?: () => boolean
  /** 灰度目录前缀，默认使用 env.ts 中的 grayDir */
  grayDir?: string
}

/** 响应拦截器配置选项 */
export interface ResponseInterceptorOptions {
  /** 登录过期回调 */
  onLoginExpired?: (data: ApiResponse) => void
  /** 成功状态码，默认为 RES_STATUS.SUCCESS */
  successStatus?: number
}

/** 创建请求拦截器 */
export const createRequestInterceptor = (
  options: RequestInterceptorOptions,
) => {
  return (config: InternalAxiosRequestConfig) => {
    const token = options.getAuthToken()
    const isGray = options.getIsGray?.() ?? defaultIsGray
    const grayDir = options.grayDir ?? defaultGrayDir
    const data = (config.data ?? {}) as RequestData

    config.headers.set('crm-token', token)
    // 改写 URL：拼接灰度目录前缀与 actionName 查询参数
    config.url = `${grayDir}${config.url}?_name=${data.actionName}`
    config.data = {
      clientIsGray: isGray ? 1 : 0, // 灰度标识
      token,
      systemCode: options.systemCode ?? 'oms_crm',
      content: {},
      ...data,
    }

    return config
  }
}

/** 创建响应拦截器 */
export const createResponseInterceptor = (
  options: ResponseInterceptorOptions = {},
): NonNullable<ResponseInterceptorFulfilled> => {
  // 拦截器会将 AxiosResponse 转换为 ApiResponse，类型断言在此处理
  // 业务层无需再进行类型断言
  const interceptor = (
    response: AxiosResponse,
  ): AxiosResponse | ApiResponse | Promise<never> => {
    // 非 JSON 响应直接透传（文件下载、文本流等场景）
    // responseType 为 undefined 或 'json' 时才按业务协议解析
    const { responseType } = response.config
    if (responseType && responseType !== 'json') return response

    const data = response.data as ApiResponse
    const successStatus = options.successStatus ?? RES_STATUS.SUCCESS

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
