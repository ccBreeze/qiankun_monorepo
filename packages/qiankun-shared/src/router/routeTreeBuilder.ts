/**
 * 路由树构建器
 * 负责将菜单数据转换为路由树结构
 */
import {
  ROOT_CODE,
  type FunctionListItem,
  type MenuMeta,
  type MenuParserOptions,
  type MenuRecord,
  type MenuTreeNode,
} from './dynamicRouteTypes'
import { parseUrl, resolveExtraInfo, type UrlParserConfig } from './urlUtils'

/**
 * 路由树构建结果
 */
export interface RouteTreeBuildResult {
  /** 路由树映射（code -> 路由节点） */
  treeCodeMap: Map<string, MenuTreeNode>
  /** 根路由列表 */
  rootRoutes: MenuRecord[]
  /** 所有路由列表 */
  allRoutes: MenuRecord[]
}

/**
 * 路由注册回调函数类型
 */
export type RouteRegisterCallback = (route: MenuRecord) => void

/**
 * 路由树构建器类
 * 负责将后端菜单数据转换为路由树结构
 */
export class RouteTreeBuilder {
  private urlParserConfig: UrlParserConfig

  constructor(options: MenuParserOptions = {}) {
    const { routeBase = '', transformParsedUrl, ...rest } = options
    this.urlParserConfig = {
      routeBase: routeBase.replace(/\/$/, ''),
      transformParsedUrl,
      options: { routeBase, transformParsedUrl, ...rest },
    }
  }

  /**
   * 构建路由树
   * @param list - 后端返回的菜单列表
   * @param onRouteCreated - 路由创建后的回调（用于注册到匹配器）
   * @returns 路由树构建结果
   */
  build(
    list: FunctionListItem[],
    onRouteCreated?: RouteRegisterCallback,
  ): RouteTreeBuildResult {
    const treeCodeMap = new Map<string, MenuTreeNode>([
      [ROOT_CODE, { children: [] }],
    ])

    const allRoutes: MenuRecord[] = []

    // 第一次遍历：创建所有节点并建立映射
    const nodeMap = new Map<
      string,
      { item: FunctionListItem; route: MenuRecord }
    >()

    for (const item of list) {
      const existing = nodeMap.get(item.code)
      if (existing) {
        console.warn(
          `[RouteTreeBuilder] 重复的路由 code，已覆盖: ${item.code}`,
          {
            previous: existing.item,
            current: item,
          },
        )
      }

      const route = this.createRouteNode(item)
      nodeMap.set(item.code, { item, route })
      treeCodeMap.set(item.code, route)
      allRoutes.push(route)

      // 通知外部注册路由
      onRouteCreated?.(route)
    }

    // 第二次遍历：建立父子关系
    for (const { item, route } of nodeMap.values()) {
      const parent = treeCodeMap.get(item.parentCode)
      if (!parent) {
        console.warn(
          `[RouteTreeBuilder] 不存在父路由: ${item.parentCode}`,
          item,
        )
        continue
      }
      this.buildParentChildRelation(route, parent)
    }

    // 排序
    this.sortRoutesByManualSort(treeCodeMap)

    const rootRoutes = treeCodeMap.get(ROOT_CODE)?.children || []

    return {
      treeCodeMap,
      rootRoutes,
      allRoutes,
    }
  }

  /**
   * 创建路由节点
   * @param item - 菜单项数据
   * @returns 路由节点
   */
  private createRouteNode(item: FunctionListItem): MenuRecord {
    const extraInfo = resolveExtraInfo(item.icon)
    const { componentName, ...routeInfo } = parseUrl(
      item.url,
      extraInfo,
      this.urlParserConfig,
    )

    // 精简 meta，只保留必要字段
    const meta: MenuMeta = {
      name: item.name,
      code: item.code,
      parentCode: item.parentCode,
      parentPath: undefined, // 暂时留空，建立父子关系时填充
      componentName,
      iconName: extraInfo.iconName,
      isHiddenMenu: extraInfo.isHiddenMenu,
      manualSort: item.manualSort,
    }

    return {
      ...routeInfo,
      meta,
    }
  }

  /**
   * 建立父子关系
   * @param route - 子节点
   * @param parent - 父节点
   */
  private buildParentChildRelation(
    route: MenuRecord,
    parent: MenuTreeNode,
  ): void {
    // 填充 parentPath
    route.meta.parentPath = parent.path

    const isHiddenMenu = route.meta.isHiddenMenu === true

    // 隐藏菜单不需要初始化父节点的 children
    if (!isHiddenMenu && !parent.children) {
      parent.children = []
      parent.redirect = route.path // 父路由重定向到第一个子路由
      parent.componentPath = undefined
    }
    parent.children?.push(route)
  }

  /**
   * 对路由树中每个父级下的子路由根据 manualSort 进行排序
   * @param treeCodeMap - 路由树映射
   */
  private sortRoutesByManualSort(treeCodeMap: Map<string, MenuTreeNode>): void {
    for (const [, route] of treeCodeMap.entries()) {
      // 对子路由进行排序
      if (route.children && route.children.length > 1) {
        route.children.sort((a, b) => {
          const sortA = a.meta.manualSort ?? 0
          const sortB = b.meta.manualSort ?? 0
          return sortA - sortB
        })
        // 更新父路由的重定向到排序后的第一个子路由
        route.redirect = route.children[0]?.path
      }
    }
  }
}
