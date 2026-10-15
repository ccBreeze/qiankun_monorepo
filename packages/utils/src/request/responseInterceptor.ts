import type { AxiosInterceptorManager, AxiosResponse } from 'axios'
import type { ApiResponse } from './types'

/** 接口响应状态 */
export const enum RES_STATUS {
  SUCCESS = 1,
  /** 暂无权限 */
  NO_PERMISSION = 2,
  /** 没有登入 */
  NO_LOGIN = 4,
  /** 登入过期 */
  LOGIN_EXPIRED = 9,
  /** 切换环境( 灰度<->正式 ) - 切换URL /new/ */
  GRAY = 1001,
}

/** 响应拦截器函数类型，与 axios 响应拦截器 use 方法第一个参数类型一致 */
type ResponseInterceptorFulfilled = Parameters<
  AxiosInterceptorManager<AxiosResponse>['use']
>[0]

/** 响应拦截器配置选项 */
export interface ResponseInterceptorOptions {
  /** 登录过期回调 */
  onLoginExpired?: (data: ApiResponse) => void
  /** 成功状态码，默认为 RES_STATUS.SUCCESS */
  successStatus?: number
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
