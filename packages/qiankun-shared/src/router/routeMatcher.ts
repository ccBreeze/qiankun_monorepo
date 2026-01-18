/**
 * 路由匹配器
 * 负责路由查找和面包屑生成
 */
import { match } from 'path-to-regexp'
import type { DynamicRouteMatcher, MenuRecord } from './dynamicRouteTypes'
import { normalizePath } from './urlUtils'

/** 检测路径是否包含动态参数 */
export const isDynamicPath = (path: string): boolean => /[:*]/.test(path)

/**
 * 路由匹配器类
 * 负责路由查找和面包屑生成
 */
export class RouteMatcher {
  /** 静态路由映射表（精确匹配，O(1) 复杂度） */
  private staticRouteMap: Map<string, MenuRecord> = new Map()

  /** 动态路由匹配器列表（需要正则匹配） */
  private dynamicRouteMatchers: DynamicRouteMatcher[] = []

  /** 路由编码映射表（用于面包屑回溯） */
  private routeCodeMap: Map<string, MenuRecord> = new Map()

  /**
   * 清空所有路由
   */
  clear(): void {
    this.staticRouteMap.clear()
    this.dynamicRouteMatchers = []
    this.routeCodeMap.clear()
  }

  /**
   * 注册路由
   * @param route - 路由记录
   */
  register(route: MenuRecord): void {
    const { path } = route

    this.routeCodeMap.set(route.meta.code, route)

    if (isDynamicPath(path)) {
      // 动态路由：创建匹配器并添加到列表
      try {
        const matcherFn = match(path, { decode: decodeURIComponent })
        this.dynamicRouteMatchers.push({
          pattern: path,
          matcher: matcherFn,
          route,
        })
      } catch (error) {
        console.warn(`[RouteMatcher] 无效的动态路由模式: ${path}`, error)
      }
    } else {
      // 静态路由：直接添加到 Map
      this.staticRouteMap.set(path, route)
    }
  }

  /**
   * 根据路径查找路由
   * @description 优化后的路由匹配：先精确匹配静态路由，再匹配动态路由
   * @param path - 路由路径
   * @returns 匹配的路由记录
   */
  resolve(path: string | undefined): MenuRecord | undefined {
    if (!path) return undefined

    path = normalizePath(path)

    // 1. 精确匹配静态路由（O(1) 复杂度）
    const exactMatch = this.staticRouteMap.get(path)
    if (exactMatch) return exactMatch

    // 2. 动态路由匹配（只遍历动态路由列表）
    for (const { matcher, route } of this.dynamicRouteMatchers) {
      const result = matcher(path)
      if (result) {
        return route
      }
    }

    return undefined
  }

  /**
   * 获取路径的祖先链（面包屑）
   * @param path - 当前路径
   * @returns 从根到当前路径的菜单记录数组
   */
  getBreadcrumb(path: string): MenuRecord[] {
    const breadcrumb: MenuRecord[] = []
    let currentRoute = this.resolve(normalizePath(path))

    while (currentRoute) {
      breadcrumb.push(currentRoute)

      const { parentCode } = currentRoute.meta
      const parentRoute = this.routeCodeMap.get(parentCode)
      if (parentRoute) {
        currentRoute = parentRoute
        continue
      }

      break
    }

    return breadcrumb.reverse()
  }
}
