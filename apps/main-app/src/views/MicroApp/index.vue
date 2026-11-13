<template>
  <div class="micro-container">
    <div
      v-for="app in microAppConfigs"
      v-show="app.name === activeMicroApp?.name"
      :id="app.container.slice(1)"
      :key="app.name"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadMicroApp, type MicroApp } from 'qiankun'
import { useMenuStore } from '@/stores/menu'
import { useUserStore } from '@/stores/user'
import { microApps, type ResolvedMicroApp } from './utils/registry'
import { prefetchMicroApps } from './utils/prefetch'
import {
  RUNTIME_EVENTS,
  qiankunRuntime,
  type MicroAppHostProps,
  type TabRemovePayload,
} from '@breeze/runtime'
import type { UserData } from '@/types/user'

/** 运行时子应用配置 */
type MicroAppConfig = ResolvedMicroApp & {
  props: MicroAppHostProps & {
    userData: UserData // 收窄类型
  }
}

const route = useRoute()
const menuStore = useMenuStore()
const userStore = useUserStore()

/** 已加载的子应用实例，key 为应用 name */
const loadedMicroApps = new Map<string, MicroApp>()
/** 正在卸载中的子应用任务，避免并发重复卸载 */
const unmountingTasks = new Map<string, Promise<void>>()
let isUnmounting = false

const microAppConfigs = computed<MicroAppConfig[]>(() => {
  // 所有子应用共享同一份 userData 引用，避免重复 toRaw
  const userData = toRaw(userStore.userData)
  return microApps.map((app) => ({
    ...app,
    props: {
      activeRule: app.activeRule,
      authorizedRoutes:
        menuStore.authorizedRoutesByActiveRule.get(app.activeRule) ?? [],
      userData,
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
    } catch (error) {
      console.error(`[MicroApp] 子应用 ${appName} 卸载失败`, error)
    } finally {
      loadedMicroApps.delete(appName)
      unmountingTasks.delete(appName)
    }
  })()

  unmountingTasks.set(appName, task)
  await task
}

// 容器渲染完成后再监听路由并加载子应用
onMounted(() => {
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

      if (isUnmounting || !newApp || loadedMicroApps.has(newApp.name)) return
      try {
        const microApp = loadMicroApp(newApp, newApp.configuration)
        loadedMicroApps.set(newApp.name, microApp)
        await microApp.mountPromise
      } catch (error) {
        await unmountMicroAppInstance(newApp.name)
        console.error(`[MicroApp] 子应用 ${newApp.name} 挂载失败`, error)
      }
    },
    { immediate: true, flush: 'post' },
  )
})

/** 当最后一个使用某个子应用的 tab 被关闭时，卸载该子应用实例 */
const handleTabRemove = ({ activeRule, hasRemainingTab }: TabRemovePayload) => {
  if (!activeRule || hasRemainingTab !== false) return

  const microApp = microApps.find((app) => app.activeRule === activeRule)
  if (microApp) {
    void unmountMicroAppInstance(microApp.name)
  }
}
qiankunRuntime.channel.on(RUNTIME_EVENTS.TAB_REMOVE, handleTabRemove)

onBeforeUnmount(() => {
  isUnmounting = true
  qiankunRuntime.channel.off(RUNTIME_EVENTS.TAB_REMOVE, handleTabRemove)
  for (const appName of loadedMicroApps.keys()) {
    void unmountMicroAppInstance(appName)
  }
})

prefetchMicroApps()
</script>

<style lang="scss" scoped>
.micro-container {
  height: 100%;

  & > :deep(div) {
    height: 100%;
  }
}
</style>
