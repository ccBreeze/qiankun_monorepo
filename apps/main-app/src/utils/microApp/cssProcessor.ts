/**
 * 替换 CSS 文本中的资源路径（url()、@import）。
 * @param css - CSS 文本
 * @param mapFn - 路径转换函数
 */
export const replacePathInCSS = (
  css: string,
  mapFn: (path: string, quote: string) => string,
): string => {
  const hasQuote = /^\s*('|")/
  const patterns = [
    /(@import\s+)(')(.+?)(')/gi,
    /(@import\s+)(")(.+?)(")/gi,
    /(url\s*\()(\s*')([^']+?)(')/gi,
    /(url\s*\()(\s*")([^"]+?)(")/gi,
    /(url\s*\()(\s*)([^\s'"].*?)(\s*\))/gi,
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
 * 拦截子应用 CSS 文件的 fetch 请求，将其中的相对路径改写为绝对路径。
 *
 * 解决问题：qiankun 将子应用 CSS 注入主应用 document 后，CSS 内的相对路径
 * （如 url(image.png)）会相对于主应用域名解析，导致资源 404。
 *
 * base URL 直接从 CSS 文件 URL 取目录部分推导，无需额外传入。
 */
export const cssFetchInterceptor: typeof window.fetch = (url, ...args) => {
  if (import.meta.env.DEV || typeof url !== 'string' || !url.endsWith('.css')) {
    return window.fetch(url, ...args)
  }

  const base = url.substring(0, url.lastIndexOf('/') + 1)
  return Promise.resolve({
    async text() {
      const res = await window.fetch(url, ...(args as [RequestInit?]))
      let css = await res.text()
      css = replacePathInCSS(css, (path) => {
        // base64 内嵌资源不处理
        if (path.startsWith('data:')) return path
        return base + path
      })
      return css
    },
  } as unknown as Response)
}
