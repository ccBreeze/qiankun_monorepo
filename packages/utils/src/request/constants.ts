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

/** 缓存策略 */
export enum CACHE_STRATEGY {
  /** 内存缓存（Map）- 页面刷新时重置，无过期和数量限制 */
  MEMORY,
  /** LRU 缓存 - 支持最大数量限制和 TTL 过期 */
  LRU,
  /** 强制刷新 - 忽略现有缓存强制请求，若之前有缓存则更新，否则不创建缓存 */
  FORCE_REFRESH,
}
