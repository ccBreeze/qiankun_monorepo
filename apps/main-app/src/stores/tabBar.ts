import { defineStore, storeToRefs } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useMenuStore } from '@/stores/menu'

type Tab = {
  code?: string
  title: string
  fullPath: string
}

export const useTabBarStore = defineStore('tabBar', () => {
  const route = useRoute()
  const router = useRouter()
  const menuStore = useMenuStore()
  const { activeMenuRoute } = storeToRefs(menuStore)

  const tabs = useLocalStorage<Map<string, Tab>>('tabBar:tabs', new Map(), {
    serializer: {
      read: (value: string): Map<string, Tab> => {
        if (!value) return new Map()
        try {
          const parsed = JSON.parse(value) as [string, Tab][]
          return new Map(parsed)
        } catch {
          return new Map()
        }
      },
      write: (value: Map<string, Tab>): string =>
        JSON.stringify(value instanceof Map ? Array.from(value.entries()) : []),
    },
  })

  const addTab = (fullPath: string) => {
    const routeRecord = activeMenuRoute.value
    if (!routeRecord) return

    let tab = tabs.value.get(fullPath)
    if (!tab) {
      tab = {
        code: routeRecord.meta.code,
        title: routeRecord.meta.name,
        fullPath,
      }
      // 因为存储的是 fullPath 所以会出现多个同名的 tab
      tabs.value.set(fullPath, tab)
    }
    // 支持动态的 tabName
    if (window.history.state.tabName) {
      tab.title = window.history.state.tabName
    }
  }

  const removeTab = ({
    fullPath,
    to,
  }: {
    fullPath: string
    to?: { path: string }
  }) => {
    // tabs 的 key 使用的是 vue-router 的 fullPath（可能已经过 URI 编码）。
    // 如果外部传入未编码的中文路径，会导致 Map.get/delete 匹配失败，因此这里统一做一次编码归一化。
    const normalizeFullPath = (path: string) => {
      try {
        // decode 后与原值一致，说明未编码过
        return decodeURI(path) === path ? encodeURI(path) : path
      } catch {
        return encodeURI(path)
      }
    }
    fullPath = normalizeFullPath(fullPath)

    const tab = tabs.value.get(fullPath)
    if (!tab) return

    // 关闭当前标签，跳转下一个页面
    if (fullPath === route.fullPath) {
      if (!to) {
        const list = [...tabs.value.keys()]
        let index = list.indexOf(fullPath)
        index = index + 1 === list.length ? index - 1 : index + 1
        const nextPath = list[index]
        if (nextPath) void router.push(nextPath)
      }
      // router hash 模式
      else if (to.path && /#/.test(to.path)) {
        const [path, hash] = to.path.split('#')
        void router.push({
          ...to,
          path,
          hash: '#' + hash,
        } as RouteLocationRaw)
      }
      // router history 默认
      // to 是字符串直接跳转
      else void router.push(to)
    }

    tabs.value.delete(fullPath)
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
