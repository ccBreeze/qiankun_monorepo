/**
 * 主子应用通信事件
 *
 * 通过 QiankunRuntime.channel（EventEmitter2）在主应用与子应用之间传递。
 */
export const RUNTIME_EVENTS = {
  /** 子应用请求主应用关闭 tab */
  TAB_REMOVE_REQUEST: 'tab:remove:request',
  /** 主应用关闭 tab 时通知子应用清除 KeepAlive 缓存 */
  TAB_REMOVE: 'tab:remove',
} as const

export interface TabRemoveRequestPayload {
  fullPath: string
  /** 关闭后跳转到该 tab 的来源页（由主应用 addTab 时记录） */
  goToSource?: boolean
}

export interface TabRemovePayload {
  fullPath: string
}
