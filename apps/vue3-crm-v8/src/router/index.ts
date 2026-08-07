import { createRouter, createWebHistory } from 'vue-router'
import { NotFound } from '@breeze/components'

/** 创建路由实例（history 模式） */
export const generateRouter = (base?: string) => {
  return createRouter({
    history: createWebHistory(base),
    routes: [
      {
        path: '/',
        component: () => import('@/views/HomeView.vue'),
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        props: (route) => ({
          appName: import.meta.env.VITE_APP_NAME,
          path: route.fullPath,
        }),
        component: NotFound,
      },
    ],
  })
}

const router = generateRouter()

export default router
