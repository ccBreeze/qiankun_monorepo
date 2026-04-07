import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { microApps } from '@/utils/microAppRegistry'
import { createAuthGuard } from './guard/auth'

/**
 * 子应用路由别名列表，使主应用路由能匹配所有子应用的子路径。
 *
 * 从每个子应用的 activeRule 提取路径前缀，生成通配别名。
 * @example
 * activeRule: '/ocrm/#' → '/ocrm/:subPath*'
 * activeRule: '/vue3-history' → '/vue3-history/:subPath*'
 *
 * @see https://router.vuejs.org/zh/guide/essentials/redirect-and-alias.html#别名
 */
const microAppAliases = microApps.map(({ activeRule }) => {
  const segment = activeRule.split('/')[1]
  return `/${segment}/:subPath*`
})

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage/index.vue'),
  },
  {
    path: '/microApp',
    name: 'microApp',
    alias: microAppAliases,
    component: () => import('@/views/HomePage/index.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createAuthGuard(router)

export default router
