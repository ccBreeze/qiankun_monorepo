import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from '@/views/HomePage/index.vue'
import { resolvedMicroApps } from '@/utils/microAppRegistry'
import { createAuthGuard } from './guard/auth'

/**
 * 微应用路由别名列表，使主应用路由能匹配所有微应用的子路径。
 *
 * 从每个微应用的 activeRule 提取路径前缀，生成通配别名。
 * @example
 * activeRule: '/ocrm/#' → '/ocrm/:subPath*'
 * activeRule: '/vue3-history' → '/vue3-history/:subPath*'
 */
const microAppAliases = resolvedMicroApps.map(({ activeRule }) => {
  const segment = activeRule.split('/')[1]
  return `/${segment}/:subPath*`
})

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
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
    component: Home,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createAuthGuard(router)

export default router
