import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadMicroApp, type MicroApp } from 'qiankun'
import { useMenuStore } from '@/stores/menu'
import { useUserStore } from '@/stores/user'
import { microApps, type ResolvedMicroApp } from '@/utils/microApp/registry'
import type { MicroAppHostProps } from '@breeze/runtime'
import type { UserData } from '@/types/user'

/** 运行时子应用配置 */
export type MicroAppConfig = ResolvedMicroApp & {
  props: MicroAppHostProps & {
    userData: UserData // 收窄类型
  }
}

export const useMicroAppStore = defineStore('microApp', () => {
  const route = useRoute()
  const menuStore = useMenuStore()
  const userStore = useUserStore()

  /** 已加载的子应用实例，key 为应用 name */
  const loadedMicroApps = new Map<string, MicroApp>()
  /** 正在卸载中的子应用任务，避免并发重复卸载 */
  const unmountingTasks = new Map<string, Promise<void>>()

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

  const unmountMicroAppInstance = async (appName: string) => {
    const runningTask = unmountingTasks.get(appName)
    if (runningTask) {
      await runningTask
      return
    }

    const app = loadedMicroApps.get(appName)
    if (!app) return

    const task = (async () => {
      try {
        await app.unmount()
      } finally {
        loadedMicroApps.delete(appName)
        unmountingTasks.delete(appName)
      }
    })()

    unmountingTasks.set(appName, task)
    await task
  }

  const releaseMicroAppIfOrphaned = async (
    activeRule: string | undefined,
    tabs: Array<{
      activeRule?: string
    }>,
  ) => {
    if (!activeRule) return

    const hasRemainingTab = tabs.some((item) => item.activeRule === activeRule)
    if (hasRemainingTab) return

    const microApp = microApps.find((app) => app.activeRule === activeRule)
    await unmountMicroAppInstance(microApp!.name)
  }

  watch(
    activeMicroApp,
    async (newApp, oldApp) => {
      // 等待前一个应用挂载完成，防止切换过快导致加载失败
      // TODO: #31: Lifecycle function's promise did not resolve or reject
      if (oldApp?.name) {
        await loadedMicroApps.get(oldApp.name)?.mountPromise.catch(async () => {
          await unmountMicroAppInstance(oldApp.name)
        })
      }

      if (!newApp || loadedMicroApps.has(newApp.name)) return
      try {
        const microApp = loadMicroApp(newApp, newApp.configuration)
        loadedMicroApps.set(newApp.name, microApp)
        await microApp.mountPromise
      } catch (error) {
        await unmountMicroAppInstance(newApp.name)
        console.error(`[MicroApp] 子应用 ${newApp.name} 挂载失败`, error)
      }
    },
    { immediate: true },
  )

  return {
    microAppConfigs,
    activeMicroApp,
    releaseMicroAppIfOrphaned,
    unmountMicroAppInstance,
  }
})
