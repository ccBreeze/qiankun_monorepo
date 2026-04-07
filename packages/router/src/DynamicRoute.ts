import type { RawMenuItem, DynamicRouteOptions, MenuRoute } from './types'
import { RouteMatcher } from './RouteMatcher'
import { RouteTreeBuilder } from './RouteTreeBuilder'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type RouteTreeBuildResult } from './RouteTreeBuilder'

/**
 * 动态路由类（外观模式）
 *
 * 对外统一封装路由树构建与路径匹配能力
 */
export class DynamicRoute {
  /** @see {@link RouteTreeBuildResult.rootRoutes} */
  rootRoutes: MenuRoute[] = []
  /** @see {@link RouteTreeBuildResult.flatRoutes} */
  flatRoutes: MenuRoute[] = []
  /** @see {@link RouteTreeBuildResult.routesByActiveRule} */
  routesByActiveRule: Map<string, MenuRoute[]> = new Map()

  /** 路由匹配器 */
  private matcher = new RouteMatcher()

  /** 配置选项 */
  private options: DynamicRouteOptions

  constructor(options: DynamicRouteOptions = {}) {
    this.options = options
  }

  /**
   * 创建并初始化一个就绪的 DynamicRoute 实例
   * @param list - 后端返回的菜单列表
   * @param options - 配置选项
   */
  static create(list: RawMenuItem[], options: DynamicRouteOptions = {}) {
    const instance = new DynamicRoute(options)
    instance.generateRoutes(list)
    return instance
  }

  /**
   * 根据菜单列表生成路由树
   * @param list - 后端返回的菜单列表
   */
  generateRoutes(list: RawMenuItem[]) {
    const result = new RouteTreeBuilder(this.options).build(list)
    this.matcher.registerAll(result.flatRoutes)

    this.rootRoutes = result.rootRoutes
    this.flatRoutes = result.flatRoutes
    this.routesByActiveRule = result.routesByActiveRule
  }

  /** @see {@link RouteMatcher.resolvePathToRoute} */
  resolvePathToRoute(path: string | undefined) {
    return this.matcher.resolvePathToRoute(path)
  }

  /** @see {@link RouteMatcher.resolvePathToRouteAncestors} */
  resolvePathToRouteAncestors(path: string) {
    return this.matcher.resolvePathToRouteAncestors(path)
  }
}
