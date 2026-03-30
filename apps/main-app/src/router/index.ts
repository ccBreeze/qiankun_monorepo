import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from '@/views/HomePage/index.vue'
import { microAppRegistry } from '@/views/MicroApp/utils/registry'

/**
 * 根据微应用注册表动态生成路由别名
 *
 * 将 pathPrefix（如 `/crm/`、`/ocrm/#/`）转换为
 * vue-router 通配别名（如 `/crm/:subPath*`、`/ocrm/:subPath*`）
 */
const microAppAliases = [...microAppRegistry.keys()].map((pathPrefix) => {
  // `/ocrm/#/` → `ocrm`
  const segment = pathPrefix.split('/')[1]
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

export default router
