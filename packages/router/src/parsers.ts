/**
 * URL 解析工具函数
 * 提供路径规范化、URL 解析等纯函数
 */
import { upperFirst } from 'lodash-es'
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

/**
 * 解析激活规则
 *
 * 优先从 url 中匹配已注册的子应用激活规则（如 /coms/#/、/crm/），
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

  // 移除 activeRule 前缀
  const pathWithoutPrefix = normalizePath(path.replace(activeRule, ''))
  const segments = pathWithoutPrefix
    .split('/')
    .filter(Boolean) // 过滤掉空字符串
    .map(upperFirst)
  const filePath = '/' + segments.join('/')
  const name = segments.join('-')

  return {
    name,
    path,
    filePath,
    activeRule,
  }
}

/**
 * 判断当前页面是否属于指定 activeRule 的子应用
 */
export const matchActiveRule = ({
  activeRule,
  fullPath,
}: {
  activeRule?: string
  fullPath?: string
}) => {
  // 未配置 activeRule 时默认匹配（兼容独立运行模式）
  if (!activeRule) return true
  fullPath ??= `${location.pathname}${location.search}${location.hash}`
  return fullPath.startsWith(activeRule)
}

/**
 * 移除路径中的 activeRule 前缀
 *
 * createWebHistory(activeRule) 已将 activeRule 作为路由基础路径，
 * addRoute 注册时 fullPath 需要是相对于 activeRule 的路径。
 *
 * @example
 * stripActiveRule('/vue3-history/CouponListTemp', '/vue3-history') // → '/CouponListTemp'
 */
export const stripActiveRule = (fullPath: string, activeRule?: string) => {
  if (!activeRule) return fullPath
  if (fullPath.startsWith(activeRule)) {
    return fullPath.slice(activeRule.length) || '/'
  }
  return fullPath
}
