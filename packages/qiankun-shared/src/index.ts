// 门面类（推荐使用）
export { DynamicRoute } from './router/dynamicRoute'

// 独立模块（按需使用）
export { RouteMatcher } from './router/routeMatcher'
export { RouteTreeBuilder } from './router/routeTreeBuilder'
export { normalizePath, parseUrl, resolveExtraInfo } from './router/urlUtils'

// 常量
export { ROOT_CODE } from './router/dynamicRouteTypes'

// 类型
export type * from './router/dynamicRouteTypes'
export type { UrlParserConfig } from './router/urlUtils'
export type {
  RouteTreeBuildResult,
  RouteRegisterCallback,
} from './router/routeTreeBuilder'
