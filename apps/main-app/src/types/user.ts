import type { FunctionListItem } from '@breeze/qiankun-shared'

/**
 * 用户数据类型
 */
export interface UserData {
  /** 用户 ID */
  aid?: string
  /** 账户名称 */
  accountName?: string
  /** 登录 token */
  token?: string
  /** 用户名首字母 */
  usernameFirstChar?: string
  /** 头像背景图片 */
  avatarBackgroundImage?: string
  /** CRM 菜单列表 */
  crmReadFunctionList?: FunctionListItem[]
  /** OCRM 菜单列表 */
  ocrmReadFunctionList?: FunctionListItem[]
  /** 其他扩展属性 */
  [key: string]: unknown
}

/**
 * 登出选项
 */
export interface LogoutOptions {
  /** 是否调用登出 API */
  shouldCallLogoutApi?: boolean
}
