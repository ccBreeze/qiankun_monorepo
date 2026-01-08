/** 登录请求参数 */
export interface LoginParams {
  username: string
  password: string
  [key: string]: unknown
}

/** 登录响应数据 */
export interface LoginResponseData {
  aid: string
  accountName: string
  userName: string
  roleName: string
  token: string
  [key: string]: unknown
}

/** 登录 API 响应 */
export interface LoginResponse {
  status: number
  msg: string
  data: LoginResponseData | null
  [key: string]: unknown
}
