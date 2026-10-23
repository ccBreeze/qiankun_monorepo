import { createRouter, createWebHistory } from 'vue-router'
import { setupDynamicRoute } from './guard/dynamicRouteGuard'

/** 创建路由实例 */
export const generateRouter = (base?: string) => {
  const router = createRouter({
    history: createWebHistory(base),
    routes: [
      {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        props: (route) => ({
          appName: import.meta.env.VITE_APP_NAME,
          path: route.fullPath,
        }),
        component: () => import('shell/NotFound'),
      },
    ],
  })

  setupDynamicRoute(router)

  return router
}

const router = generateRouter()

export default router
