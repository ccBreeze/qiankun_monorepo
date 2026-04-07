import { createRouter, createWebHistory } from 'vue-router'
import { setupDynamicRoute } from './guard/dynamicRouteGuard'

/** 创建路由实例 */
export const generateRouter = (base?: string) => {
  const router = createRouter({
    history: createWebHistory(base),
    routes: [],
  })

  setupDynamicRoute(router)

  return router
}

const router = generateRouter()

export default router
