/**
 * URL 解析工具函数
 * 提供路径规范化、URL 解析等纯函数
 */
import type {
  MenuExtraInfo,
  MenuParserOptions,
  ParsedUrlInfo,
  ParseUrlContext,
  TransformParsedUrlFn,
} from './dynamicRouteTypes'

/**
 * URL 解析器配置
 */
export interface UrlParserConfig {
  /** 路由基础路径 */
  routeBase: string
  /** 自定义 URL 解析结果转换函数 */
  transformParsedUrl?: TransformParsedUrlFn
  /** 完整的配置选项 */
  options: MenuParserOptions
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
export function normalizePath(path: string): string {
  // 确保以斜杠开头：path -> /path
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  // 移除 query 和 hash：/xxx?id=1#hash -> /xxx
  path = path.replace(/[?#].*$/, '')
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
 * @param iconStr - icon 字段的 JSON 字符串
 * @returns 解析后的额外信息
 */
export function resolveExtraInfo(
  iconStr: string | undefined | null,
): MenuExtraInfo {
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

const formatPathSegment = (url: string, separator: string): string =>
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

/**
 * 解析 URL 并生成路径和组件信息
 * @param url - 菜单 url
 * @param extraInfo - 额外的路由信息
 * @param config - 解析器配置
 * @returns 解析后的 URL 信息
 */
export function parseUrl(
  url: string,
  extraInfo: MenuExtraInfo,
  config: UrlParserConfig,
): ParsedUrlInfo {
  const { routeBase, transformParsedUrl, options } = config

  url = normalizePath(url)

  const name = formatPathSegment(url, '-')
  const viewPath = formatPathSegment(url, '/')

  const effectiveRouteBase = extraInfo.routeBase || routeBase
  const path = normalizePath(effectiveRouteBase + url)
  const componentName = name

  // 默认解析结果（不包含 componentPath，由业务层自行处理）
  let parsedInfo: ParsedUrlInfo = {
    path,
    name,
    componentName,
  }

  // 如果提供了自定义转换函数，在返回前调用它进行转换
  if (transformParsedUrl) {
    const context: ParseUrlContext = {
      url,
      viewPath,
      extraInfo,
      routeBase: effectiveRouteBase,
      options,
    }
    parsedInfo = transformParsedUrl(parsedInfo, context)
  }

  return parsedInfo
}
