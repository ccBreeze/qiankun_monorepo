import axios from 'axios'
import { message } from 'ant-design-vue'
import {
  createRequestInterceptor,
  createResponseInterceptor,
  createEnhanceRequest,
  type RequestData,
  type RequestConfig,
} from '@breeze/utils/request'
import { useAuthStore } from '@/stores/auth'
import loading from '@/components/LoadingFullscreen'

type PostConfig = Omit<RequestConfig, 'method' | 'url' | 'data'>

const instance = axios.create()

/** 请求拦截器 */
instance.interceptors.request.use(
  createRequestInterceptor({
    getAuthToken: () => useAuthStore().accessToken ?? '',
  }),
)

/** 响应拦截器 */
instance.interceptors.response.use(
  createResponseInterceptor({
    onLoginExpired: (data) => {
      const msg = data.msg ?? '登录已失效'
      useAuthStore().showLogoutModal(msg)
    },
  }),
)

/** 增强器配置 */
const enhanceRequest = createEnhanceRequest({
  onError: (error) => {
    const msg = error?.msg || '未知错误'
    message.error(msg)
  },
  onSuccess: (data) => {
    message.success(data?.msg)
  },
  loadingController: {
    show: (options) => loading(options),
    hide: () => loading.close(),
  },
})

/** 创建通用请求（应用增强器） */
export const handleRequest = <T = unknown>(
  config: RequestConfig,
): Promise<T> => {
  return enhanceRequest(() => instance.request<T, T>(config), config)
}

/** POST 请求 */
export const post = <T = unknown>(
  url: string,
  data: RequestData,
  config: PostConfig = {},
) => {
  return handleRequest<T>({
    method: 'post',
    url,
    data,
    ...config,
  })
}

/** 创建绑定 URL 的 POST 请求函数 */
const createBoundPost =
  (url: string) =>
  <T = unknown>(data: RequestData, config: PostConfig = {}) =>
    post<T>(url, data, config)

export const postDC = createBoundPost('/ManageAction')
export const postAction = createBoundPost('/Action')
