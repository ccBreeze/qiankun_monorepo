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
import { shallowRef, watch } from 'vue'
import { loadMicroApp } from 'qiankun'
import type { MicroApp } from 'qiankun'
import { storeToRefs } from 'pinia'
import { useMicroAppStore } from '@/stores/microApp'

const { activeMicroApp, microAppConfigs } = storeToRefs(useMicroAppStore())

/** 已加载的子应用实例，key 为应用 name */
const loadedApps = shallowRef(new Map<string, MicroApp>())

const clearMicroApp = async (appName: string) => {
  const app = loadedApps.value.get(appName)
  if (!app) return

  loadedApps.value.delete(appName)
  await app.unmount()
}

watch(
  activeMicroApp,
  async (newApp, oldApp) => {
    // 等待前一个应用挂载完成，防止切换过快导致加载失败
    // TODO: #31: Lifecycle function's promise did not resolve or reject
    if (oldApp?.name) {
      await loadedApps.value.get(oldApp.name)?.mountPromise.catch(async () => {
        await clearMicroApp(oldApp.name)
      })
    }

    if (!newApp || loadedApps.value.has(newApp.name)) return
    try {
      const microApp = loadMicroApp(newApp)
      loadedApps.value.set(newApp.name, microApp)
      await microApp.mountPromise
    } catch (error) {
      await clearMicroApp(newApp.name)
      console.error(`[MicroApp] 子应用 ${newApp.name} 挂载失败`, error)
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.micro-container {
  height: 100%;

  & > :deep(div) {
    height: 100%;
  }
}
</style>
