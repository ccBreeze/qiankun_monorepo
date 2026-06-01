import { createRouter, createWebHistory } from 'vue-router'

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
        component: () => import('@/views/NotFound.vue'),
      },
    ],
  })
}

const router = generateRouter()

export default router
