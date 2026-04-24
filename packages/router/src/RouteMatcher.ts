/**
 * 路由匹配器
 * 负责路由查找和路径祖先链解析
 */
import { match } from 'path-to-regexp'
import type { MenuRoute } from './types'
import { normalizePath } from './parsers'

/** 动态路由匹配器（内部使用） */
interface DynamicRouteMatcher {
  matcher: (path: string) => boolean | object
  route: MenuRoute
}

/** 检测路径是否包含动态参数 */
export const isDynamicPath = (path: string) => /[:*]/.test(path)

/**
 * 路由匹配器类
 *
 * 根据 path 查找路由相关信息
 */
export class RouteMatcher {
  /** 路由编码映射表（用于沿父链回溯祖先节点） */
  private routeCodeMap = new Map<string, MenuRoute>()

  /** 静态路由映射表（精确匹配，O(1) 复杂度） */
  private staticRouteMap = new Map<string, MenuRoute>()
  /** 动态路由匹配器列表（需要正则匹配） */
  private dynamicRouteMatchers: DynamicRouteMatcher[] = []

  /**
   * 清空所有路由
   */
  clear() {
    this.staticRouteMap.clear()
    this.dynamicRouteMatchers = []
    this.routeCodeMap.clear()
  }

  /**
   * 批量注册路由（会先清空已有数据）
   * @param routes - 路由记录列表
   */
  registerAll(routes: MenuRoute[]) {
    this.clear()
    for (const route of routes) {
      this.register(route)
    }
  }

  /**
   * 注册路由
   * @param route - 路由记录
   */
  register(route: MenuRoute) {
    const { path } = route
    this.routeCodeMap.set(route.meta.code, route)

    // 静态路由：直接添加到 Map
    if (!isDynamicPath(path)) {
      this.staticRouteMap.set(path, route)
      return
    }
    // 动态路由：创建匹配器并添加到列表
    try {
      const matcherFn = match(path, { decode: decodeURIComponent })
      this.dynamicRouteMatchers.push({
        matcher: matcherFn,
        route,
      })
    } catch (error) {
      console.warn(`[RouteMatcher] 无效的动态路由模式: ${path}`, error)
    }
  }

  /**
   * 根据路径查找路由
   * @param path - 路由路径
   * @returns 匹配的路由记录
   */
  resolvePathToRoute(path: string | undefined) {
    if (!path) return undefined
    path = normalizePath(path)

    // 1. 精确匹配静态路由（O(1) 复杂度）
    const exactMatch = this.staticRouteMap.get(path)
    if (exactMatch) return exactMatch

    // 2. 动态路由匹配（只遍历动态路由列表）
    for (const { matcher, route } of this.dynamicRouteMatchers) {
      if (matcher(path)) return route
    }
    return undefined
  }

  /**
   * 解析路径对应路由的祖先链
   * @param path - 当前路径
   * @returns 从根到当前路径的菜单记录数组
   */
  resolvePathToRouteAncestors(path: string) {
    const ancestors: MenuRoute[] = []
    let currentRoute = this.resolvePathToRoute(normalizePath(path))

    while (currentRoute) {
      ancestors.push(currentRoute)
      const parentRoute = this.routeCodeMap.get(currentRoute.meta.parentCode)
      if (parentRoute) {
        currentRoute = parentRoute
        continue
      }
      break
    }

    return ancestors.reverse()
  }
}
