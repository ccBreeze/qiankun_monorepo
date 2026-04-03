import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { MenuRoute } from '@breeze/router'
import { useMenuStore } from '@/stores/menu'
import { useUserStore } from '@/stores/user'
import type { UserData } from '@/types/user'
import {
  resolvedMicroApps,
  type ResolvedMicroApp,
} from '@/utils/microAppRegistry'

const createHostProps = (
  app: ResolvedMicroApp,
  deps: {
    getUserData: () => UserData
    getAuthorizedRoutes: (activeRule: string) => MenuRoute[]
  },
) => {
  return {
    baseUrl: app.activeRule,
    menuKey: app.menuKey,
    // TODO: 通用的内容，是否还需要通过 props 传递？
    // 如果使用 EventEmitter 是否可以解耦？
    getAuthorizedRoutes() {
      return deps.getAuthorizedRoutes(app.activeRule)
    },
    get userData() {
      return deps.getUserData()
    },
  }
}

export const useMicroAppStore = defineStore('microApp', () => {
  const route = useRoute()
  const menuStore = useMenuStore()
  const userStore = useUserStore()

  const qiankunApps = computed(() => {
    return resolvedMicroApps.map((app) => ({
      ...app,
      entry: app.entry!,
      props: createHostProps(app, {
        getUserData: () => userStore.userData,
        getAuthorizedRoutes: (activeRule) =>
          menuStore.authorizedRoutesByActiveRule.get(activeRule) ?? [],
      }),
    }))
  })

  /** 根据当前路由自动匹配激活的微应用（运行时注册对象） */
  const activeMicroApp = computed(() => {
    return qiankunApps.value.find((app) =>
      route.fullPath.startsWith(app.activeRule),
    )
  })

  return {
    qiankunApps,
    activeMicroApp,
  }
})
