import {
  type RawMenuItem,
  type MenuRouteMeta,
  type DynamicRouteOptions,
  type MenuRoute,
} from './types'
import { resolveRoute, resolveExtraInfo } from './parsers'

/**
 * 路由树内部虚拟根节点编码
 *
 * 后端返回的一级菜单 parentCode 固定值
 */
const ROOT_CODE = 'ROOT' as const

/**
 * 路由树内部虚拟根节点
 * 仅用于统一承接顶层菜单，不属于对外菜单模型。
 */
interface VirtualRootNode {
  children: MenuRoute[]
  path?: string
  component?: string
}

type RouteTreeNode = MenuRoute | VirtualRootNode
/** 路由映射（code -> 路由节点） */
type CodeNodeMap = Map<string, RouteTreeNode>

/**
 * 路由树构建结果
 */
export interface RouteTreeBuildResult {
  /** 根级路由列表（树结构入口） */
  rootRoutes: MenuRoute[]
  /** 扁平路由列表 */
  flatRoutes: MenuRoute[]
  /**
   * 按 activeRule 分组的路由映射
   *
   * 注意：多个菜单模块共享同一 activeRule 时，后构建的会覆盖先构建的。
   */
  routesByActiveRule: Map<string, MenuRoute[]>
}

/**
 * 路由树构建器类
 *
 * 负责将后端菜单数据转换为路由树结构
 */
export class RouteTreeBuilder {
  private options: DynamicRouteOptions
  private menuKey?: string

  constructor(options: DynamicRouteOptions = {}) {
    this.options = options
    this.menuKey = options.menuKey
  }

  /**
   * 构建路由树
   * @param list - 后端返回的菜单列表
   * @returns 路由树构建结果
   */
  build(list: RawMenuItem[]): RouteTreeBuildResult {
    const codeNodeMap: CodeNodeMap = new Map([[ROOT_CODE, { children: [] }]])
    const flatRoutes: MenuRoute[] = []
    const routesByActiveRule = new Map<string, MenuRoute[]>()

    // 第一次遍历
    for (const item of list) {
      if (codeNodeMap.has(item.code)) {
        console.warn(
          `[RouteTreeBuilder] 重复的路由 code，已覆盖: ${item.code}`,
          item,
        )
      }
      // 创建节点
      const route = this.createRouteNode(item)
      // 建立 code -> 路由 映射
      codeNodeMap.set(item.code, route)
      flatRoutes.push(route)
      // 建立 activeRule -> 路由列表 映射
      const { activeRule } = route.meta
      let activeRuleRoutes = routesByActiveRule.get(activeRule)
      if (!activeRuleRoutes) {
        activeRuleRoutes = []
        routesByActiveRule.set(activeRule, activeRuleRoutes)
      }
      activeRuleRoutes.push(route)
    }

    // 第二次遍历
    for (const item of list) {
      const route = codeNodeMap.get(item.code) as MenuRoute
      const parent = codeNodeMap.get(item.parentCode)
      if (!parent) {
        console.warn(
          `[RouteTreeBuilder] 不存在父路由: ${item.parentCode}`,
          item,
        )
        continue
      }
      // 建立父子关系
      this.buildParentChildRelation(route, parent)
    }

    this.sortRoutesByManualSort(codeNodeMap)

    const rootRoutes = codeNodeMap.get(ROOT_CODE)?.children || []
    return {
      rootRoutes,
      flatRoutes,
      routesByActiveRule,
    }
  }

  /**
   * 创建路由节点
   * @param item - 菜单项数据
   * @returns 路由节点
   */
  private createRouteNode(item: RawMenuItem): MenuRoute {
    const { transformResolvedRoute } = this.options
    const extraInfo = resolveExtraInfo(item.icon)

    const resolvedRoute = resolveRoute({
      url: item.url,
      routeBase: extraInfo.routeBase,
      fallbackActiveRule: this.options.fallbackActiveRule,
      registeredActiveRules: this.options.registeredActiveRules,
    })
    // 业务自定义数据
    const { name, filePath, activeRule, ...routeInfo } = transformResolvedRoute
      ? transformResolvedRoute(resolvedRoute, extraInfo)
      : resolvedRoute

    const meta: MenuRouteMeta = {
      ...item,
      ...extraInfo,
      menuKey: this.menuKey,
      parentPath: undefined, // 暂时留空，建立父子关系时填充
      filePath,
      activeRule,
    }

    return {
      ...routeInfo,
      name,
      meta,
    }
  }

  /**
   * 建立父子关系
   * @param node - 子节点
   * @param parentNode - 父节点
   */
  private buildParentChildRelation(node: MenuRoute, parentNode: RouteTreeNode) {
    node.meta.parentPath = parentNode.path

    if (!parentNode.children) {
      parentNode.children = []
    }
    parentNode.children.push(node)
  }

  /**
   * 对路由树中每个父级下的子路由根据 manualSort 进行排序
   * @param codeNodeMap - 路由树映射
   */
  private sortRoutesByManualSort(codeNodeMap: CodeNodeMap) {
    for (const [, route] of codeNodeMap.entries()) {
      // 对子路由进行排序
      if (route.children && route.children.length > 1) {
        route.children.sort((a, b) => {
          const sortA = a.meta.manualSort ?? 0
          const sortB = b.meta.manualSort ?? 0
          return sortA - sortB
        })
      }
    }
  }
}
