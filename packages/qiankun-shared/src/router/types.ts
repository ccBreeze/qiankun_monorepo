/**
 * 菜单解析相关类型定义
 */

/**
 * 后端返回的菜单（原始数据）
 * 对应 ocrmFunctionList / crmReadFunctionList 数据结构
 */
export interface RawMenuItem {
  id: number
  name: string
  code: string
  parentCode: string
  sort: number
  manualSort?: number
  url: string
  /** JSON 字符串 */
  icon: string
  status: number
}

/**
 * 路由额外信息
 */
export interface MenuExtra {
  /** 图标名称 */
  iconName?: string
  /** 是否隐藏菜单（不会出现在侧边菜单中） */
  isHiddenMenu?: boolean
  /** 指定激活时应选中的菜单路径（定义后 isHiddenMenu = true） */
  activeMenuPath?: string
  /** @deprecated 使用 isHiddenMenu 代替 */
  hiddenMenu?: boolean
  /** @deprecated 应直接在 url 中拼接完整路径，无需单独指定 pathPrefix */
  pathPrefix?: string
}

/**
 * 菜单元信息
 */
export interface MenuRouteMeta
  extends RawMenuItem, MenuExtra, Pick<DynamicRouteOptions, 'menuKey'> {
  /** 父菜单路径 */
  parentPath?: string
  /** 组件名称（用于 keep-alive） */
  componentName?: string
}

/**
 * 解析后的菜单数据
 */
export interface MenuRoute {
  path: string
  meta: MenuRouteMeta
  /** 组件路径 */
  component?: string
  children?: MenuRoute[]
}

/**
 * 从菜单 URL 解析出的路由信息（纯路由字段）
 * 作为 transformResolvedRoute 的返回值类型
 */
export interface ResolvedRouteInfo {
  /** 规范化后的原始菜单 URL（如 /datainput/brand） */
  url: string
  /** 路由路径（含前缀），用于 router 跳转 */
  path: string
  /** 文件路径（首字母大写，如 Datainput/Brand） */
  filePath: string
  /** 组件名称（PascalCase，用于 keep-alive，如 UserProfile） */
  componentName: string
  /** 组件文件路径，业务层可通过 transformResolvedRoute 覆盖 */
  component?: string
}

/**
 * 自定义路由解析结果转换函数类型
 * @typeParam T - 返回类型，默认为 ResolvedRouteInfo，业务方可扩展返回额外属性
 */
export type TransformResolvedRoute<
  T extends ResolvedRouteInfo = ResolvedRouteInfo,
> = (resolvedRoute: ResolvedRouteInfo, extraInfo: MenuExtra) => T

/**
 * DynamicRoute 构造函数选项
 */
export interface DynamicRouteOptions {
  // TODO: 需要兼容旧的系统路由
  // TODO: 如果是 hashHistory 如何处理
  /** @deprecated 应直接在 url 中拼接完整路径，无需单独指定 pathPrefix */
  pathPrefix?: string
  /** 菜单分组标识，写入每条路由的 meta 中，主应用据此判断当前路由属于哪个菜单分组 */
  menuKey?: string
  /**
   * 自定义 URL 解析结果转换函数
   * 在默认解析逻辑完成后调用，允许业务层完全自定义解析结果
   */
  transformResolvedRoute?: TransformResolvedRoute
}
