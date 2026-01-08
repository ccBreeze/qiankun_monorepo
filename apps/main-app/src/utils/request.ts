import axios from 'axios'
import { message } from 'ant-design-vue'
import {
  attachRequestInterceptors,
  attachResponseInterceptors,
  createEnhanceRequest,
  type RequestData,
  type RequestConfig,
} from '@breeze/utils/request'
import { useAuthStore } from '@/stores/auth'
import { requestLoadingDelay } from '@/constant'
import loading from '@/components/LoadingFullscreen'

const instance = axios.create()

instance.interceptors.request.use(
  attachRequestInterceptors({
    getAuthToken: () => useAuthStore().accessToken ?? '',
    systemCode: 'oms_crm',
  }),
)

instance.interceptors.response.use(
  attachResponseInterceptors({
    onLoginExpired: (data) =>
      useAuthStore().showLogoutModal(data.msg ?? '登录已失效'),
  }) as Parameters<typeof instance.interceptors.response.use>[0],
)

/** 增强器配置 */
const enhanceRequest = createEnhanceRequest({
  showError: (error) => {
    const displayMsg = error?.msg || '未知错误'
    message.error(displayMsg)
  },
  showSuccess: (data) => void message.success(data?.msg),
  loadingController: {
    show: (options) => loading(options),
    hide: () => loading.close(),
  },
  loadingDelay: requestLoadingDelay,
})

/** 通用请求处理 */
export const handleRequest = <T = unknown>(
  config: RequestConfig,
): Promise<T> => {
  return enhanceRequest(() => instance.request<T, T>(config), config)
}

type PostConfig = Omit<RequestConfig, 'method' | 'url' | 'data'>

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
