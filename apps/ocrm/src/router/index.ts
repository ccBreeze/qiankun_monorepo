import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 创建路由实例（hash 模式）
 *
 * 主应用注入的 activeRule 形如 `/ocrm/#`，作为 hash history 的 base 时
 * 需去掉末尾的 `#`，得到 pathname 前缀 `/ocrm/`。
 */
export const generateRouter = (activeRule?: string) => {
  const base = activeRule ? activeRule.split('#')[0] : undefined
  return createRouter({
    history: createWebHashHistory(base),
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
