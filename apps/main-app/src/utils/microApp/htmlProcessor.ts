import { normalizeMicroAppEntryBase } from './entryBase'

/** 判断 URL 是否需要改写为子应用绝对路径（仅处理根路径，排除 protocol-relative） */
const isRewritableUrl = (url: string) =>
  Boolean(url) && url.startsWith('/') && !url.startsWith('//')

/** 将根路径 URL 拼接为子应用绝对地址（调用方需确保 URL 通过 isRewritableUrl 检查） */
const toAbsoluteUrl = (entry: string, url: string) =>
  `${normalizeMicroAppEntryBase(entry)}${url}`

/**
 * 处理 HTML 标签属性中的静态资源路径。
 *
 * 典型场景：
 * - <script src="/assets/index.js">
 * - <link href="/assets/index.css">
 * - <link rel="modulepreload" href="/assets/vendor.js">
 */
const rewriteStaticAssetUrls = (tpl: string, entry: string) =>
  tpl.replace(/\b(href|src)=(["'])([^"']+)\2/g, (match, attr, quote, url) => {
    if (!isRewritableUrl(url)) return match
    return `${attr}=${quote}${toAbsoluteUrl(entry, url)}${quote}`
  })

/**
 * 处理 HTML 模板中 inline script 的动态 import() 路径。
 *
 * 典型场景：
 * - import('/assets/index.js')
 * - import("./chunk.js")
 */
const rewriteDynamicImportUrls = (tpl: string, entry: string) =>
  tpl.replace(
    /import\((["'])([^"']+)(["'])\)/g,
    (match, quote1, url, quote2) => {
      if (!isRewritableUrl(url)) return match
      return `import(${quote1}${toAbsoluteUrl(entry, url)}${quote2})`
    },
  )

/**
 * 处理子应用 HTML 模板中的资源路径。
 *
 * 当前会依次处理两类内容：
 * 1. HTML 标签属性中的静态资源 URL（href/src）
 * 2. inline script 中的动态 import() URL
 */
export const processDynamicImport = (tpl: string, entry: string): string => {
  const rewriters = [rewriteStaticAssetUrls, rewriteDynamicImportUrls]
  return rewriters.reduce((result, rewrite) => rewrite(result, entry), tpl)
}
