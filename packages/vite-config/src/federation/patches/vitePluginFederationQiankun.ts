import type { Plugin } from 'vite'

/** 1.23.0 的入口代理启动异步任务后立即返回，qiankun 则依赖 import 完成来读取生命周期。 */
export function awaitFederationBootstrap(code: string): string {
  return code.replace(
    '\n(async () => {\n  const __mfHostInit =',
    '\nawait (async () => {\n  const __mfHostInit =',
  )
}

export function federationQiankunPlugin(): Plugin {
  return {
    name: 'vite-plugin-breeze-federation-qiankun',
    enforce: 'post',
    transform(code) {
      if (!code.includes('const __mfHostInit =')) return
      return { code: awaitFederationBootstrap(code), map: null }
    },
    // 开发入口由联邦插件的 middleware 直接响应，不经过 Vite transform。
    configureServer: {
      order: 'pre',
      handler(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.includes('virtual:mf-html-entry-proxy?')) {
            const end = res.end.bind(res)
            res.end = function (chunk, ...args: unknown[]) {
              return Reflect.apply(end, res, [
                typeof chunk === 'string'
                  ? awaitFederationBootstrap(chunk)
                  : chunk,
                ...args,
              ])
            } as typeof res.end
          }
          next()
        })
      },
    },
  }
}
