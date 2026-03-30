/** 登录请求参数 */
export interface LoginParams {
  username: string
  password: string
}

/** 登录响应数据 */
export interface LoginResult {
  aid: string
  accountName: string
  userName: string
  roleName: string
  token: string
}
