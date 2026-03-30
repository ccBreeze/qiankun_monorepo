import type { RawMenuItem } from '@breeze/qiankun-shared'

/**
 * 用户数据类型
 */
export interface UserData {
  /** 用户 ID */
  aid?: string
  /** 账户名称 */
  accountName?: string
  /** 用户名 */
  userName?: string
  /** 角色名称 */
  roleName?: string
  /** 登录 token */
  token?: string
  /** 用户名首字母 */
  usernameFirstChar?: string
  /** 头像背景图片 */
  avatarBackgroundImage?: string
  /** CRM 菜单列表 */
  crmReadFunctionList?: RawMenuItem[]
  /** OCRM 菜单列表 */
  coms8ReadFunctionList?: RawMenuItem[]
}

/**
 * 登出选项
 */
export interface LogoutOptions {
  /** 是否调用登出 API */
  shouldCallLogoutApi?: boolean
}
