import { normalizeMicroAppEntryBase } from './entryBase'

/** 基于子应用入口目录补全 ./ 开头的资源地址 */
const toAbsoluteUrl = (entry: string, url: string) =>
  new URL(url, `${normalizeMicroAppEntryBase(entry)}/`).href

/**
 * 处理 HTML 标签属性中的静态资源路径。
 *
 * 典型场景：
 * - <script src="./assets/index.js">
 * - <link href="./assets/index.css">
 * - <link rel="modulepreload" href="./assets/vendor.js">
 */
const rewriteStaticAssetUrls = (tpl: string, entry: string) =>
  tpl.replace(
    /\b(href|src)=(["'])(\.\/[^"']*)\2/g,
    (_match, attr, quote, url) =>
      `${attr}=${quote}${toAbsoluteUrl(entry, url)}${quote}`,
  )

/**
 * 处理 HTML 模板中 inline script 的动态 import() 路径。
 *
 * 典型场景：
 * - import('./assets/index.js')
 * - import("./chunk.js")
 */
const rewriteDynamicImportUrls = (tpl: string, entry: string) =>
  tpl.replace(
    /\bimport\s*\(\s*(["'])(\.\/[^"']*)\1\s*\)/g,
    (_match, quote, url) =>
      `import(${quote}${toAbsoluteUrl(entry, url)}${quote})`,
  )

/**
 * 处理 base: './' 生成的子应用 HTML 模板资源路径。
 *
 * 当前会依次处理两类内容：
 * 1. HTML 标签属性中的静态资源 URL（href/src）
 * 2. inline script 中的动态 import() URL
 */
export const processDynamicImport = (tpl: string, entry: string): string => {
  const rewriters = [rewriteStaticAssetUrls, rewriteDynamicImportUrls]
  return rewriters.reduce((result, rewrite) => rewrite(result, entry), tpl)
}
