/**
 * URL 解析工具函数
 * 提供路径规范化、URL 解析等纯函数
 */
import type { MenuExtra, ResolveRouteParams, ResolvedRouteInfo } from './types'

/**
 * 规范化路径
 *
 * @example
 * normalizePath('path') => '/path'
 * normalizePath('/path?id=1') => '/path'
 * normalizePath('/path/') => '/path'
 * normalizePath('/') => '/'
 */
export function normalizePath(path: string) {
  // 确保以斜杠开头：path -> /path
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  // 移除 query
  // /xxx?id=1 -> /xxx
  path = path.replace(/\?.*$/, '')
  // 合并连续斜杠：/a//b -> /a/b
  path = path.replace(/\/{2,}/g, '/')
  // 移除末尾斜杠（但保留根路径 /）：/xxx/ -> /xxx
  if (path !== '/') {
    path = path.replace(/\/$/, '')
  }
  return path
}

/**
 * 解析路由额外（自定义）信息
 * @param str - JSON 字符串
 * @returns 解析后的对象
 */
export function resolveExtraInfo(str: string | undefined | null): MenuExtra {
  if (!str) return {}

  try {
    // 只支持 JSON 对象字符串
    const extra = JSON.parse(str) as MenuExtra
    // 兼容旧字段：hiddenMenu → isHiddenMenu
    // 定义了 activeMenuPath 的菜单项自动隐藏
    extra.isHiddenMenu =
      extra.isHiddenMenu ||
      extra.hiddenMenu === true ||
      Boolean(extra.activeMenuPath)

    return extra
  } catch {
    return {}
  }
}

const formatPathSegment = (url: string, separator: string = '') => {
  return (
    url
      // 去掉前导斜杠，避免生成空的首段
      // "/user/profile" -> "user/profile"
      .replace(/^\//, '')
      // 将每段首字母大写（文件夹名称必须首字母大写），并把路径分隔符替换为指定的 separator
      // "user/profile" -> "User-Profile"
      .replace(
        /(\/)?(\w)(\w*)/g,
        (_match, p1 = '', p2: string, p3: string) =>
          (p1 ? separator : '') + p2.toUpperCase() + p3,
      )
  )
}

/**
 * 解析激活规则
 *
 * 优先从 url 中匹配已注册的微应用激活规则（如 /coms/#/、/crm/），
 * 未匹配到时按优先级取兜底值 routeBase > fallbackActiveRule。
 */
export function resolveActiveRule(params: {
  url: string
  fallbackActiveRule?: string
  routeBase?: string
  registeredActiveRules?: string[]
}): string {
  const url = normalizePath(params.url)
  const matchedActiveRule = params.registeredActiveRules?.find((activeRule) =>
    url.startsWith(activeRule),
  )
  const activeRule =
    matchedActiveRule ?? params.routeBase ?? params.fallbackActiveRule ?? ''
  // 移除尾部斜杠，避免拼接路径时出现双斜杠：/vue3-history/ + /foo → //foo
  return activeRule.replace(/\/$/, '')
}

/**
 * 解析 URL 并生成路径和组件信息
 */
export function resolveRoute(params: ResolveRouteParams): ResolvedRouteInfo {
  const url = normalizePath(params.url)
  const activeRule = resolveActiveRule(params)
  const path = normalizePath(activeRule + url)

  // 基于 path 计算，但需移除 activeRule
  const pathWithoutPrefix = normalizePath(path.replace(activeRule, ''))
  const filePath = formatPathSegment(pathWithoutPrefix, '/')
  const name = formatPathSegment(pathWithoutPrefix)

  return {
    name,
    path,
    filePath,
    activeRule,
  }
}
