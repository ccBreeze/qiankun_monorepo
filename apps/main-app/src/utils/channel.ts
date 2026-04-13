import {
  RUNTIME_EVENTS,
  type TabNavigateRequestPayload,
  type TabRemovePayload,
  type TabRemoveRequestPayload,
} from '@breeze/runtime'
import router from '@/router'
import { useTabBarStore } from '@/stores/tabBar'

const channel = window.QiankunRuntime.channel

/** 注册主应用运行时通信监听 */
export const setupRuntimeChannels = () => {
  channel.on(
    RUNTIME_EVENTS.TAB_NAVIGATE_REQUEST,
    ({ fullPath, tabName }: TabNavigateRequestPayload) => {
      router.options.history.push(fullPath, {
        tabName,
      })
    },
  )

  channel.on(
    RUNTIME_EVENTS.TAB_REMOVE_REQUEST,
    (payload: TabRemoveRequestPayload) => {
      useTabBarStore().removeTab(payload)
    },
  )
}

/** @see {@link RUNTIME_EVENTS.TAB_REMOVE} */
export const emitTabRemove = (payload: TabRemovePayload) => {
  channel.emit(RUNTIME_EVENTS.TAB_REMOVE, payload)
}
