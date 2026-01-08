import { DynamicRoute } from '@breeze/qiankun-shared'
import type { FunctionListItem } from '@breeze/qiankun-shared'

export interface MenuParserConfig {
  /** 路由基础路径 */
  routeBase?: string
  /** 菜单数据 */
  menuData: FunctionListItem[]
}

/**
 * 解析菜单数据生成路由和菜单树
 */
export function parseMenuData(config: MenuParserConfig) {
  const { routeBase = '', menuData } = config

  const parser = new DynamicRoute({
    routeBase,
  })
  const treeCodeMap = parser.generateRoutes(menuData)

  return {
    /** 所有路由（包含隐藏路由） */
    routes: parser.routes,
    /** 路由映射表 */
    pathToRouteMap: parser.pathToRouteMap,
    /** 路由树映射 */
    treeCodeMap,
    /** 根路由（用于菜单渲染） */
    rootRoutes: treeCodeMap.get('ROOT')?.children || [],
    /** DynamicRoute 实例（用于其他方法调用） */
    dynamicRoute: parser,
  }
}
