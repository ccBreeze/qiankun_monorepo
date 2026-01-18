/**
 * 动态路由门面类
 * 组合 URL 解析、路由树构建和路由匹配功能
 * 提供统一的 API 接口
 */
import type {
  FunctionListItem,
  MenuParserOptions,
  MenuRecord,
  MenuTreeNode,
} from './dynamicRouteTypes'
import { RouteMatcher } from './routeMatcher'
import { RouteTreeBuilder } from './routeTreeBuilder'
import { parseUrl } from './urlUtils'

/**
 * 动态路由类（门面模式）
 * 整合 URL 解析、路由树构建和路由匹配功能
 *
 * @example
 * ```ts
 * const dynamicRoute = new DynamicRoute({ routeBase: '/crm-v8' })
 * const treeCodeMap = dynamicRoute.generateRoutes(menuList)
 *
 * // 获取路由
 * const route = dynamicRoute.resolvePathToRoute('/crm-v8/home')
 *
 * // 获取面包屑
 * const breadcrumb = dynamicRoute.getBreadcrumb('/crm-v8/user/profile')
 *
 * ```
 */
export class DynamicRoute {
  /** 根路由列表（用于菜单渲染） */
  rootRoutes: MenuRecord[] = []

  /** 解析后的菜单/路由列表（包含隐藏菜单） */
  allRoutes: MenuRecord[] = []

  /** 路由树构建器 */
  private treeBuilder: RouteTreeBuilder

  /** 路由匹配器 */
  private matcher: RouteMatcher

  /** 配置选项 */
  private options: MenuParserOptions

  constructor(options: MenuParserOptions = {}) {
    this.options = options
    this.treeBuilder = new RouteTreeBuilder(options)
    this.matcher = new RouteMatcher()
  }

  /**
   * 根据菜单列表生成路由树
   * @param list - 后端返回的菜单列表
   * @returns 路由树映射（code -> 路由节点）
   */
  generateRoutes(list: FunctionListItem[]): Map<string, MenuTreeNode> {
    // 清空之前的数据
    this.matcher.clear()

    // 构建路由树，同时注册到匹配器
    const result = this.treeBuilder.build(list, (route) => {
      this.matcher.register(route)
    })

    this.rootRoutes = result.rootRoutes
    this.allRoutes = result.allRoutes
    return result.treeCodeMap
  }

  /**
   * 根据路径查找路由
   * @param path - 路由路径
   * @returns 匹配的路由记录
   */
  resolvePathToRoute(path: string | undefined): MenuRecord | undefined {
    return this.matcher.resolve(path)
  }

  /**
   * 获取路径的祖先链（面包屑）
   * @param path - 当前路径
   * @returns 从根到当前路径的菜单记录数组
   */
  getBreadcrumb(path: string): MenuRecord[] {
    return this.matcher.getBreadcrumb(path)
  }

  /**
   * 解析 URL 并生成路径和组件信息
   * @description 暴露给需要自定义解析的场景
   */
  parseUrl(url: string, extraInfo: Parameters<typeof parseUrl>[1]) {
    const { routeBase = '', transformParsedUrl } = this.options
    return parseUrl(url, extraInfo, {
      routeBase,
      transformParsedUrl,
      options: this.options,
    })
  }
}
