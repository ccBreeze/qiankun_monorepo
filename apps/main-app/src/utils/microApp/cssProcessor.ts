/**
 * 替换 base: './' 生成的 CSS 资源路径（仅处理 url()、@import 中 ./ 开头的地址）。
 * @param css - CSS 文本
 * @param mapFn - 路径转换函数
 */
export const replacePathInCSS = (
  css: string,
  mapFn: (path: string, quote: string) => string,
): string => {
  const hasQuote = /^\s*('|")/
  const patterns = [
    /(@import\s+)(')(\.\/[^']*)(')/gi,
    /(@import\s+)(")(\.\/[^"]*)(")/gi,
    /(url\s*\()(\s*')(\.\/[^']*)(')/gi,
    /(url\s*\()(\s*")(\.\/[^"]*)(")/gi,
    /(url\s*\()(\s*)(\.\/[^\s'")]*)(\s*\))/gi,
  ]

  return patterns.reduce((result, reg) => {
    return result.replace(reg, (_all, lead, quote1, path, quote2) => {
      const ret = mapFn(path, quote1)
      const q1 = hasQuote.test(ret) && hasQuote.test(quote1) ? '' : quote1
      const q2 = hasQuote.test(ret) && hasQuote.test(quote1) ? '' : quote2
      return lead + q1 + ret + q2
    })
  }, css)
}

/**
 * 拦截子应用 CSS 文件的 fetch 请求，将其中 ./ 开头的资源地址补全为绝对路径。
 *
 * 解决问题：qiankun 将子应用 CSS 注入主应用 document 后，CSS 内的相对路径
 * （如 url(./image.png)）会相对于主应用页面解析，导致资源 404。
 *
 * 以 CSS 文件 URL 为基准，通过 new URL() 保留其原有的资源解析目录。
 */
export const cssFetchInterceptor: typeof window.fetch = (url, ...args) => {
  if (import.meta.env.DEV || typeof url !== 'string' || !url.endsWith('.css')) {
    return window.fetch(url, ...args)
  }

  return Promise.resolve({
    async text() {
      const res = await window.fetch(url, ...(args as [RequestInit?]))
      const css = await res.text()
      return replacePathInCSS(css, (path) => new URL(path, url).href)
    },
  } as unknown as Response)
}
