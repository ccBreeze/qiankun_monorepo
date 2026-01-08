/**
 * 菜单解析器
 * 根据后端返回的菜单数据生成通用的菜单/路由树（不依赖 vue / vue-router）
 */
import { match } from 'path-to-regexp'
import type { MatchFunction } from 'path-to-regexp'
import type {
  FunctionListItem,
  MenuExtraInfo,
  MenuMeta,
  MenuParserOptions,
  MenuRecord,
  MenuTreeNode,
  ParsedUrlInfo,
  ParseUrlContext,
} from './dynamicRouteTypes'

/** 根路由菜单 */
const ROOT_CODE = 'ROOT'

/**
 * 菜单解析类
 * 负责将后端菜单数据转换为菜单/路由树结构
 */
export class DynamicRoute {
  /** 解析后的菜单/路由列表（包含隐藏菜单） */
  routes: MenuRecord[] = []
  /** 根据 path 可以获取对应菜单/路由信息 */
  pathToRouteMap: Map<string, MenuRecord> = new Map()
  /** 路由基础路径 */
  private routeBase: string
  /** 自定义 URL 解析结果转换函数 */
  private transformParsedUrl?: (
    parsedInfo: ParsedUrlInfo,
    context: ParseUrlContext,
  ) => ParsedUrlInfo
  /** 完整的配置选项（包含自定义配置） */
  private options: MenuParserOptions
  /** path-to-regexp 匹配函数缓存 */
  private pathMatcherCache: Map<string, MatchFunction> = new Map()

  constructor(options: MenuParserOptions = {}) {
    const { routeBase = '', transformParsedUrl } = options
    this.options = options
    this.transformParsedUrl = transformParsedUrl
    // routeBase 最后一个字符是 / 就移除
    // /crm-v8/  ->  /crm-v8
    this.routeBase = routeBase.replace(/\/$/, '')
  }

  /**
   * 规范化路径
   * @param path - 原始路径
   * @returns 规范化后的路径
   * @description 统一处理路径规范化：添加前导斜杠、移除 query、hash 和末尾斜杠
   * @example
   * normalizePath('path') => '/path'
   * normalizePath('/path?id=1#hash') => '/path'
   * normalizePath('/path/') => '/path'
   * normalizePath('/') => '/'
   */
  private normalizePath(path: string): string {
    // 确保以斜杠开头：path -> /path
    if (!path.startsWith('/')) {
      path = '/' + path
    }
    // 移除 query 和 hash：/xxx?id=1#hash -> /xxx
    path = path.replace(/[?#].*$/, '')
    // 移除末尾斜杠（但保留根路径 /）：/xxx/ -> /xxx
    if (path !== '/') {
      path = path.replace(/\/$/, '')
    }
    return path
  }

  /**
   * 解析 URL 并生成路径和组件信息
   * @param url - 菜单 url
   * @param extraInfo - 额外的路由信息
   */
  parseUrl(url: string, extraInfo: MenuExtraInfo): ParsedUrlInfo {
    // 规范化 URL（添加前导斜杠、移除 query、hash、末尾斜杠）
    url = this.normalizePath(url)

    // PascalCase + 连字符 -> Datainput-Brand
    const name = url
      .replace(/^\//, '')
      .replace(
        /(\/)?(\w)(\w*)/g,
        (_match, p1 = '', p2: string, p3: string) =>
          (p1 ? '-' : '') + p2.toUpperCase() + p3,
      )

    // 文件夹名称必须首字母大写 -> Datainput/Brand
    const viewPath = url
      .replace(/^\//, '')
      .replace(
        /(\/)?(\w)(\w*)/g,
        (_match, p1 = '', p2: string, p3: string) => p1 + p2.toUpperCase() + p3,
      )

    const routeBase = extraInfo.routeBase || this.routeBase
    const path = this.normalizePath(routeBase + url)
    const componentName = name

    // 默认解析结果（不包含 componentPath，由业务层自行处理）
    let parsedInfo: ParsedUrlInfo = {
      path,
      name,
      componentName,
    }

    // 如果提供了自定义转换函数，在返回前调用它进行转换
    if (this.transformParsedUrl) {
      const context: ParseUrlContext = {
        url,
        viewPath,
        extraInfo,
        routeBase,
        options: this.options,
      }
      parsedInfo = this.transformParsedUrl(parsedInfo, context)
    }

    return parsedInfo
  }

  /**
   * 创建路由节点
   * @param item - 菜单项数据
   * @returns 路由节点
   */
  private createRouteNode(item: FunctionListItem): MenuRecord {
    const extraInfo = this.resolveExtraInfo(item.icon)
    const { componentName, ...routeInfo } = this.parseUrl(item.url, extraInfo)

    return {
      ...routeInfo,
      meta: {
        ...item,
        ...extraInfo,
        parentPath: undefined, // 暂时留空，建立父子关系时填充
        componentName,
      } as MenuMeta,
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
    if (route.meta) {
      route.meta.parentPath = parent.path
    }

    const isHiddenMenu = route.meta?.isHiddenMenu === true

    // 隐藏菜单不需要初始化父节点的 children
    if (!isHiddenMenu && !parent.children) {
      parent.children = []
      parent.redirect = route.path // 父路由重定向到第一个子路由
      parent.componentPath = undefined
    }
    parent.children?.push(route)
  }

  /**
   * 根据菜单列表生成路由树
   * @param list - 后端返回的菜单列表
   */
  generateRoutes(list: FunctionListItem[]): Map<string, MenuTreeNode> {
    const treeCodeMap = new Map<string, MenuTreeNode>([
      [ROOT_CODE, { children: [] }],
    ])

    // 第一次遍历：创建所有节点并建立映射
    const nodeMap = new Map<
      string,
      { item: FunctionListItem; route: MenuRecord }
    >()
    list.forEach((item) => {
      const route = this.createRouteNode(item)
      nodeMap.set(item.code, { item, route })
      treeCodeMap.set(item.code, route)
      this.pathToRouteMap.set(route.path, route)
    })

    // 第二次遍历：建立父子关系
    nodeMap.forEach(({ item, route }) => {
      const parent = treeCodeMap.get(item.parentCode)
      if (!parent) {
        console.warn('不存在父路由 :', item.parentCode, item)
        return
      }
      this.buildParentChildRelation(route, parent)
    })

    this.sortRoutesByManualSort(treeCodeMap)

    this.routes = treeCodeMap.get(ROOT_CODE)!.children || []
    return treeCodeMap
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
          const sortA = a.meta?.manualSort ?? 0
          const sortB = b.meta?.manualSort ?? 0
          return sortA - sortB
        })
        // 更新父路由的重定向到排序后的第一个子路由
        route.redirect = route.children[0]?.path
      }
    }
  }

  /**
   * 解析路由额外（自定义）信息
   */
  resolveExtraInfo(iconStr: string | undefined | null): MenuExtraInfo {
    if (!iconStr) return {}

    try {
      // 只支持 JSON 对象字符串
      const parsed = JSON.parse(iconStr)
      const extra = parsed as MenuExtraInfo
      extra.isHiddenMenu = extra.hiddenMenu === true
      return extra
    } catch {
      // JSON 解析失败，返回空对象
      return {}
    }
  }

  /**
   * 解析 route.path 获取路由信息
   */
  resolvePathToRoute(path: string | undefined): MenuRecord | undefined {
    if (!path) return
    path = this.normalizePath(path)

    // 精确匹配
    const exactMatch = this.pathToRouteMap.get(path)
    if (exactMatch) return exactMatch

    // 动态路由匹配
    for (const [routePath, routeRecord] of this.pathToRouteMap.entries()) {
      let matcher = this.pathMatcherCache.get(routePath)
      if (!matcher) {
        try {
          matcher = match(routePath, { decode: decodeURIComponent })
          this.pathMatcherCache.set(routePath, matcher)
        } catch (error) {
          console.warn(`无效的路由模式: ${routePath}`, error)
          continue
        }
      }
      // 尝试匹配
      const result = matcher(path)
      if (result) {
        return routeRecord
      }
    }
  }
}
