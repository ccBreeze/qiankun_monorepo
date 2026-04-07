import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMenuStore } from '@/stores/menu'
import { useUserStore } from '@/stores/user'
import { microApps } from '@/utils/microAppRegistry'
import type { ResolvedMicroApp } from '@/utils/microAppRegistry'
import type { MicroAppHostProps } from '@breeze/runtime'
import type { UserData } from '@/types/user'

/** 运行时子应用配置 */
type MicroAppConfig = ResolvedMicroApp & {
  props: MicroAppHostProps & {
    userData: UserData // 收窄类型
  }
}

export const useMicroAppStore = defineStore('microApp', () => {
  const route = useRoute()
  const menuStore = useMenuStore()
  const userStore = useUserStore()

  const microAppConfigs = computed<MicroAppConfig[]>(() => {
    return microApps.map((app) => ({
      ...app,
      props: {
        activeRule: app.activeRule,
        authorizedRoutes:
          menuStore.authorizedRoutesByActiveRule.get(app.activeRule) ?? [],
        userData: userStore.userData,
      },
    }))
  })

  /** 根据当前路由自动匹配激活的子应用 */
  const activeMicroApp = computed(() => {
    return microAppConfigs.value.find((app) =>
      route.fullPath.startsWith(app.activeRule),
    )
  })

  return {
    microAppConfigs,
    activeMicroApp,
  }
})
