import { computed, h, ref, watch, type VNode } from 'vue'
import { useRoute } from 'vue-router'
import { matchActiveRule } from '@breeze/router'
import type { MicroAppHostProps } from '@breeze/runtime'

type KeepAliveWrapper = {
  name: string
  render: () => VNode | null | undefined
}

type KeepAliveContext = Pick<MicroAppHostProps, 'activeRule'>

export const useKeepAlive = (microAppContext?: KeepAliveContext) => {
  const route = useRoute()

  const wrapperMap = new Map<string, KeepAliveWrapper>()

  /** 当前已打开的 tab 的 fullPath 集合，驱动 KeepAlive include */
  const tabSet = ref(new Set<string>())
  /** 传给 `<KeepAlive :include>` 的缓存名列表 */
  const include = computed(() => Array.from(tabSet.value))

  /**
   * 将路由组件包装为以 fullPath 命名的组件，使 KeepAlive 按 fullPath 独立缓存
   *
   * @see https://github.com/vuejs/core/pull/4339#issuecomment-1238984279
   */
  const wrapKeepAliveComponent = (component: VNode | null | undefined) => {
    // 没有组件名的不需要缓存
    if (!component || !(component.type as { name?: string }).name) {
      return component
    }

    const wrapperName = route.fullPath
    let wrapper = wrapperMap.get(wrapperName)
    if (!wrapper) {
      wrapper = {
        name: wrapperName,
        render() {
          return component
        },
      }
      wrapperMap.set(wrapperName, wrapper)
    }
    return h(wrapper)
  }

  /**
   * 移除指定 tab 的缓存
   * 供外部调用（如主应用通过乾坤通信关闭 tab 时）
   */
  const removeTab = (fullPath: string) => {
    tabSet.value.delete(fullPath)
    wrapperMap.delete(fullPath)
  }

  watch(
    () => route.fullPath,
    (fullPath) => {
      if (!matchActiveRule({ activeRule: microAppContext?.activeRule })) return
      if (!route.name) return
      if (tabSet.value.has(fullPath)) return

      tabSet.value.add(fullPath)
    },
    { immediate: true },
  )

  return {
    include,
    wrapKeepAliveComponent,
    removeTab,
  }
}
