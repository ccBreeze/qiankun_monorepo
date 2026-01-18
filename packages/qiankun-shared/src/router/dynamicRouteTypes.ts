/**
 * 菜单解析相关类型定义
 */

/** 根路由常量 */
export const ROOT_CODE = 'ROOT' as const

/**
 * 后端返回的菜单/功能项
 * 对应 ocrmFunctionList / crmReadFunctionList 数据结构
 */
export interface FunctionListItem {
  id: number
  name: string
  code: string
  parentCode: string
  sort: number
  manualSort: number
  url: string
  /** JSON 字符串或图标名称 */
  icon: string
  status: number
}

/**
 * 菜单额外信息（从 icon 字段 JSON 解析）
 */
export interface MenuExtraInfo {
  /** 图标名称 */
  iconName?: string
  /** 是否隐藏菜单 */
  hiddenMenu?: boolean
  /** 是否隐藏的菜单（计算属性） */
  isHiddenMenu?: boolean
  /** 自定义路由基础路径 */
  routeBase?: string
}

/**
 * 菜单元信息（精简版，只保留必要字段）
 */
export interface MenuMeta {
  /** 菜单名称 */
  name: string
  /** 菜单编码 */
  code: string
  /** 父菜单编码 */
  parentCode: string
  /** 父菜单路径 */
  parentPath?: string
  /** 组件名称（用于 keep-alive） */
  componentName?: string
  /** 图标名称 */
  iconName?: string
  /** 是否隐藏的菜单 */
  isHiddenMenu?: boolean
  /** 手动排序 */
  manualSort?: number
}

/**
 * 解析后的菜单记录
 */
export interface MenuRecord {
  path: string
  name: string
  meta: MenuMeta
  /** 组件路径 */
  componentPath?: string
  redirect?: string
  children?: MenuRecord[]
}

/**
 * 菜单树节点（内部使用）
 */
export interface RootMenuTreeNode {
  children: MenuRecord[]
  path?: string
  redirect?: string
  componentPath?: string
}

export type MenuTreeNode = MenuRecord | RootMenuTreeNode

/**
 * 解析后的 URL 信息
 */
export interface ParsedUrlInfo {
  path: string
  name: string
  componentName: string
  /** 组件文件路径 */
  componentPath?: string
}

/**
 * URL 解析上下文
 * 提供给 transformParsedUrl 回调函数的完整上下文信息
 */
export interface ParseUrlContext {
  /** 原始菜单 URL 路径（如 /datainput/brand） */
  url: string
  /** 视图路径（首字母大写，如 Datainput/Brand） */
  viewPath: string
  /** 菜单额外信息 */
  extraInfo: MenuExtraInfo
  /** 路由基础路径（配置项） */
  routeBase: string
  /** 完整的配置选项（包含自定义配置） */
  options: MenuParserOptions
}

/**
 * 自定义 URL 解析结果转换函数类型
 */
export type TransformParsedUrlFn = (
  parsedInfo: ParsedUrlInfo,
  context: ParseUrlContext,
) => ParsedUrlInfo

/**
 * MenuParser 构造函数选项
 */
export interface MenuParserOptions {
  /** 路由基础路径 */
  routeBase?: string
  /**
   * 自定义 URL 解析结果转换函数
   * 在默认解析逻辑完成后调用，允许业务层完全自定义解析结果
   * @param parsedInfo - 默认解析后的 URL 信息
   * @param context - URL 解析上下文，包含原始数据和配置信息
   * @returns 转换后的 URL 信息
   * @example
   * ```ts
   * // 设置 componentPath
   * transformParsedUrl: (parsedInfo, context) => {
   *   return {
   *     ...parsedInfo,
   *     componentPath: `@/views/${context.viewPath}/index.vue`
   *   }
   * }
   *
   * // 完全自定义
   * transformParsedUrl: (parsedInfo, context) => {
   *   return {
   *     path: `/custom${parsedInfo.path}`,
   *     name: `custom-${parsedInfo.name}`,
   *     componentName: parsedInfo.componentName,
   *     componentPath: `@/views/${context.viewPath}.vue`
   *   }
   * }
   * ```
   */
  transformParsedUrl?: TransformParsedUrlFn
  /**
   * 额外的自定义配置
   * 可以在这里传入任意自定义数据，在 transformParsedUrl 中通过 context.options 访问
   */
  [key: string]: unknown
}

/**
 * 动态路由匹配器（内部使用）
 */
export interface DynamicRouteMatcher {
  pattern: string
  matcher: (path: string) => boolean | object
  route: MenuRecord
}
