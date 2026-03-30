import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { microAppRegistry } from '@/views/MicroApp/utils/registry'

/** 根据路由路径匹配对应的微应用配置 */
const findMicroAppByPath = (path: string) => {
  for (const [pathPrefix, microApp] of microAppRegistry) {
    if (path.startsWith(pathPrefix)) {
      return microApp
    }
  }
}

export const useMicroAppStore = defineStore('microApp', () => {
  const route = useRoute()

  /** 根据当前路由自动匹配激活的微应用 */
  const activeMicroApp = computed(() => findMicroAppByPath(route.fullPath))

  return {
    activeMicroApp,
  }
})
