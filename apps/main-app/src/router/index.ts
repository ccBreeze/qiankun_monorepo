import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { microApps } from '@/utils/microAppRegistry'
import { createAuthGuard } from './guard/auth'

/**
 * 子应用路由别名列表，使主应用路由能匹配所有子应用的子路径。
 *
 * @see https://router.vuejs.org/zh/guide/essentials/redirect-and-alias.html#别名
 */
const microAppAliases = microApps
  .filter(({ activeRule }) => {
    // 仅为具有独立 pathname 前缀的子应用生成 alias。

    // ⚠️ 不推荐使用 '/#/ocrm' 这类 hash 模式，主应用可见的 pathname 实际是 '/'
    // '/#/ocrm/' → 命中根路由 '/'，无需额外 alias
    const pathname = activeRule.split('#')[0] ?? ''
    return pathname !== '/'
  })
  .map(({ activeRule }) => {
    // '/ocrm/#' → '/ocrm/:subPath*'
    // '/vue3-history' → '/vue3-history/:subPath*'
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
