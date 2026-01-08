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
