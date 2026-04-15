import { defineStore, storeToRefs } from 'pinia'
import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import type { TabRemoveRequestPayload } from '@breeze/runtime'
import { useMenuStore } from '@/stores/menu'
import { useMicroAppStore } from '@/stores/microApp'
import { emitTabRemove } from '@/utils/channel'

type Tab = {
  code?: string
  title: string
  /**
   * 完整路由路径
   *
   * @example '/vue3-history/KeepAliveDemo?id=1&type=coupon#abc'
   */
  fullPath: string
  /** 子应用激活规则（用于应用维度的 tab 回收判定） */
  activeRule?: string
  /** 创建此 tab 时的来源路由（携带 activeRule） */
  source?: string
}

type RemoveTabOptions = TabRemoveRequestPayload & {
  to?: RouteLocationRaw
}

type ResolveTabCloseTargetOptions = Omit<RemoveTabOptions, 'fullPath'> & {
  tab: Tab
}

/**
 * tabs 的 key 使用 vue-router 的 fullPath（可能已经过 URI 编码）。
 * 如果外部传入未编码的中文路径，会导致 Map.get/delete 匹配失败，因此统一做一次编码归一化。
 */
const normalizeFullPath = (path: string) =>
  decodeURI(path) === path ? encodeURI(path) : path

export const useTabBarStore = defineStore('tabBar', () => {
  const route = useRoute()
  const router = useRouter()
  const microAppStore = useMicroAppStore()
  const { activeMenuRoute } = storeToRefs(useMenuStore())

  const tabs = useLocalStorage<Map<string, Tab>>('tabBar:tabs', new Map(), {
    serializer: StorageSerializers.map,
  })

  const addTab = (fullPath: string, previousFullPath?: string) => {
    const routeRecord = activeMenuRoute.value
    if (!routeRecord) return

    let tab = tabs.value.get(fullPath)
    if (!tab) {
      tab = {
        code: routeRecord.meta.code,
        // 子应用通过 router.push({ state: { tabName } }) 传递动态标题
        title: history.state?.tabName ?? routeRecord.meta.name,
        fullPath,
        activeRule: routeRecord.meta.activeRule,
        source: previousFullPath,
      }
      // key 为 fullPath，同一路由的不同参数（如 /user/123、/user/456）会产生多个同名 tab
      tabs.value.set(fullPath, tab)
    }

    // 无论 tab 是否新建，都要清除，
    // 避免刷新页面时 history.state 残留导致后续 addTab 读到脏数据
    if (history.state?.tabName) {
      history.replaceState({ ...history.state, tabName: undefined }, '')
    }
  }

  /** 关闭 tab 后应跳转的目标路由 */
  const resolveTabCloseTarget = ({
    tab,
    to,
    goToSource,
  }: ResolveTabCloseTargetOptions): RouteLocationRaw | undefined => {
    // 强制跳回首次打开时的来源页
    if (goToSource && tab.source) return tab.source

    // 显式指定目标
    if (to) {
      // hash 模式：to.path 中携带 # 片段（如 /base#/sub/route），需拆分后传给 router
      if (typeof to === 'object' && to.path?.includes('#')) {
        const [path, hash] = to.path.split('#')
        return {
          ...to,
          path,
          hash: `#${hash}`,
        }
      }
      return to
    }

    // 跳相邻 tab
    const list = [...tabs.value.keys()]
    const index = list.indexOf(tab.fullPath)
    // 优先右侧，已是最后一个则左侧
    const nextIndex = index + 1 < list.length ? index + 1 : index - 1
    return list[nextIndex] // 只剩一个 tab 时返回 undefined，不跳转
  }

  const removeTab = async ({ fullPath, ...options }: RemoveTabOptions) => {
    fullPath = normalizeFullPath(fullPath)
    const tab = tabs.value.get(fullPath)
    if (!tab) return

    if (fullPath === route.fullPath) {
      const target = resolveTabCloseTarget({ tab, ...options })
      if (target) {
        await router.push(target)

        // 当前先依赖 ConsoleTabs 内的 route watcher 调用 addTab()。
        // 若后续发现关闭当前 tab 后，releaseMicroAppIfOrphaned 拿到的 tabs
        // 快照偶发缺少目标页，可重新启用这里的显式补录逻辑。

        // 这里读取的 route.fullPath 来自 await router.push(target) 之后，
        // 因此是跳转完成后的最终路由。
        // const currentFullPath = normalizeFullPath(route.fullPath)
        // if (tabs.value.has(currentFullPath)) return
        // addTab(currentFullPath, fullPath)
      }
    }

    tabs.value.delete(fullPath)
    emitTabRemove({ fullPath })
    await microAppStore.releaseMicroAppIfOrphaned(tab.activeRule, [
      ...tabs.value.values(),
    ])
  }

  const clearTabs = () => {
    tabs.value.clear()
  }

  return {
    tabs,
    addTab,
    removeTab,
    clearTabs,
  }
})
