import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from '@/views/HomePage/index.vue'
import { microAppRegistry } from '@/views/MicroApp/utils/registry'
import { setupRouterGuard } from './guard'

/**
 * 根据微应用注册表动态生成路由别名
 *
 * 将微应用激活规则（如 `/vue3-history/`、`/ocrm/#/`）转换为
 * vue-router 通配别名（如 `/vue3-history/:subPath*`、`/ocrm/:subPath*`）
 */
const microAppAliases = [...microAppRegistry.values()].map(({ activeRule }) => {
  // `/ocrm/#/` → `ocrm`
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

setupRouterGuard(router)

export default router
