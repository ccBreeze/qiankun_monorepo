import { onMounted, onUnmounted } from 'vue'
import type { Router } from 'vue-router'
import { matchActiveRule, stripActiveRule } from '@breeze/router'
import {
  RUNTIME_EVENTS,
  qiankunRuntime,
  type MicroAppContext,
  type TabNavigateRequestPayload,
  type TabRemovePayload,
  type TabRemoveRequestPayload,
} from '@breeze/runtime'

type RequestRemoveTabByRouteOptions = Omit<
  TabRemoveRequestPayload,
  'fullPath'
> & {
  router: Router
  fullPath?: string
}

/**
 * 监听主应用关闭 tab 事件，子应用清除 KeepAlive 缓存
 */
export const useTabRemoveListener = (
  context: MicroAppContext,
  onRemove: (localFullPath: string) => void,
) => {
  const handler = ({ fullPath }: TabRemovePayload) => {
    const { activeRule } = context
    if (!matchActiveRule({ activeRule, fullPath })) return
    onRemove(stripActiveRule(fullPath, activeRule))
  }

  onMounted(() => {
    qiankunRuntime.channel.on(RUNTIME_EVENTS.TAB_REMOVE, handler)
  })
  onUnmounted(() => {
    qiankunRuntime.channel.off(RUNTIME_EVENTS.TAB_REMOVE, handler)
  })
}

/** 按子应用路由位置请求主应用跳转 / 打开 tab */
export const requestNavigateTab = (payload: TabNavigateRequestPayload) => {
  qiankunRuntime.channel.emit(RUNTIME_EVENTS.TAB_NAVIGATE_REQUEST, payload)
}

/** 按子应用路由位置请求主应用关闭 tab */
export const requestRemoveTabByRoute = ({
  router,
  fullPath,
  ...payload
}: RequestRemoveTabByRouteOptions) => {
  fullPath ??= router.currentRoute.value.fullPath
  qiankunRuntime.channel.emit(RUNTIME_EVENTS.TAB_REMOVE_REQUEST, {
    fullPath: router.resolve(fullPath).href,
    ...payload,
  })
}
