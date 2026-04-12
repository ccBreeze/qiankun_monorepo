import type { Router, RouteMeta } from 'vue-router'
import { matchActiveRule, stripActiveRule } from '@breeze/router'
import type { MicroAppHostProps } from '@breeze/runtime'

/** import.meta.glob 返回的页面组件映射表类型 */
export type GlobPages = Record<string, () => Promise<unknown>>

export interface DynamicRouteGuardOptions extends Pick<
  MicroAppHostProps,
  'authorizedRoutes' | 'activeRule'
> {
  router: Router
  /** 子应用通过 import.meta.glob 获取的页面组件映射表 */
  pages: GlobPages
}

/**
 * 根据 filePath 从 pages 中匹配页面组件
 *
 * 示例（filePath = "/CouponListTemp/CreatCouponTemp"）：
 *   1. 优先匹配 .../CouponListTemp/CreatCouponTemp/index.vue  ✗ 未命中
 *   2. 其次匹配 .../CouponListTemp/CreatCouponTemp.vue        ✓ 命中
 */
const resolveComponent = (
  pages: DynamicRouteGuardOptions['pages'],
  filePath: string,
) => {
  const key = Object.keys(pages).find(
    (key) =>
      key.endsWith(`${filePath}/index.vue`) || key.endsWith(`${filePath}.vue`),
  )
  return key && pages[key]
}

/** 注册动态路由 */
const registerDynamicRoutes = (options: DynamicRouteGuardOptions) => {
  const { router, pages, authorizedRoutes, activeRule } = options

  for (const route of authorizedRoutes) {
    const component = resolveComponent(pages, route.meta.filePath)
    if (!component) continue

    router.addRoute({
      path: stripActiveRule(route.path, activeRule),
      name: route.name,
      meta: route.meta as unknown as RouteMeta,
      component,
    })
  }

  // 根路径重定向到第一个有效路由
  const firstRoutePath = router.getRoutes()[0]?.path
  if (firstRoutePath) {
    router.addRoute({
      path: '/',
      redirect: firstRoutePath,
    })
  }
}

/**
 * 创建动态路由守卫
 */
export const createDynamicRouteGuard = (options: DynamicRouteGuardOptions) => {
  const { router, authorizedRoutes, activeRule } = options

  let initialized = false
  router.beforeEach((to) => {
    // qiankun 多应用场景：当前 URL 不属于本应用（其他子应用的路由），直接放行无需注册
    if (!matchActiveRule(activeRule)) return

    if (!authorizedRoutes.length) return

    // 路由未注册
    // 首次进入 to.name 为 undefined 无法通过 router.hasRoute() 判断
    if (!initialized) {
      initialized = true
      registerDynamicRoutes(options) // 全量路由注册
      return to.fullPath
    }
  })
}
