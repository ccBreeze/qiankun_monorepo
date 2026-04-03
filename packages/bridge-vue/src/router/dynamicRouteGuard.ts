import type { Router } from 'vue-router'
import type { MenuRoute, GlobPages } from '@breeze/router'

export interface DynamicRouteGuardOptions {
  router: Router
  /** 子应用通过 import.meta.glob 获取的页面组件映射表 */
  pages: GlobPages
  /** 获取当前用户权限路由的函数 */
  getAuthorizedRoutes: () => MenuRoute[]
  /** 子应用路由 base（qiankun 模式下传入） */
  base?: string
}

/**
 * 根据 filePath 从 pages 中匹配页面组件
 *
 * 示例（filePath = "CouponListTemp/CreatCouponTemp"）：
 *   1. 优先匹配 .../CouponListTemp/CreatCouponTemp/index.vue  ✗ 未命中
 *   2. 其次匹配 .../CouponListTemp/CreatCouponTemp.vue        ✓ 命中
 */
const resolveComponent = (pages: GlobPages, filePath: string) => {
  const key = Object.keys(pages).find(
    (key) =>
      key.endsWith(`/${filePath}/index.vue`) ||
      key.endsWith(`/${filePath}.vue`),
  )
  return key && pages[key]
}

/**
 * 移除路径中的 base 前缀
 *
 * createWebHistory(base) 已将 base 作为路由基础路径，
 * addRoute 注册时 path 需要是相对于 base 的路径。
 * 例如 base="/vue3-history/"，原始 path="/vue3-history/CouponListTemp" → "/CouponListTemp"
 */
const stripBase = (path: string, base?: string) => {
  if (!base) return path
  const normalizedBase = base.replace(/\/$/, '')
  return path.startsWith(normalizedBase)
    ? path.slice(normalizedBase.length) || '/'
    : path
}

interface RegisterDynamicRoutesOptions extends Pick<
  DynamicRouteGuardOptions,
  'router' | 'pages' | 'base'
> {
  flatRoutes: MenuRoute[]
}

/** 将权限路由列表注册到 vue-router */
const registerDynamicRoutes = (options: RegisterDynamicRoutesOptions) => {
  const { router, pages, flatRoutes, base } = options

  for (const route of flatRoutes) {
    const component = resolveComponent(pages, route.meta.filePath)
    if (!component) continue

    router.addRoute({
      path: stripBase(route.path, base),
      name: route.name,
      component,
    })
  }

  // 根路径重定向到第一个有效路由
  const firstRoute = router.getRoutes()[0]
  router.addRoute({ path: '/', redirect: stripBase(firstRoute.path, base) })
}

/**
 * 创建动态路由守卫
 *
 * 将菜单权限路由按需注册到 vue-router，适用于各子应用。
 */
export const createDynamicRouteGuard = (options: DynamicRouteGuardOptions) => {
  const { router, pages, getAuthorizedRoutes, base } = options

  let initialized = false
  router.beforeEach((to) => {
    // 首次进入：to.name 可能为 undefined（路由表为空无法匹配），需无条件尝试注册
    // 后续导航：仅当 to.name 不在路由表中时尝试注册，避免重复注册导致性能问题
    const hasRoute = typeof to.name === 'string' && router.hasRoute(to.name)
    if (initialized && hasRoute) return true

    // TODO: 如果 fullPath 前缀不是 base 则直接放行（其他微应用的路由），无需注册路由
    initialized = true
    const authorizedRoutes = getAuthorizedRoutes()
    if (!authorizedRoutes.length) return true

    registerDynamicRoutes({ router, pages, flatRoutes: authorizedRoutes, base })
    return to.fullPath
  })
}
