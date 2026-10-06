import type { UserConfig } from 'vite'
import qiankun from 'vite-plugin-qiankun'

/** qiankun 子应用配置参数 */
export type QiankunOptions = {
  /** 开发服务器端口，用于生成资源请求的 origin */
  port: number
}

/**
 * 创建 qiankun 子应用配置，供不同框架的应用组合使用。
 */
export const createQiankunConfig = (options: QiankunOptions): UserConfig => {
  const { port } = options

  // 提前校验，避免 appName 为 undefined 时产生静默 404
  const appName = process.env.npm_package_name
  if (!appName) {
    throw new Error(
      '[vite-config] 缺少 npm_package_name，请通过包管理器运行子应用脚本，以读取 package.json 中的应用名称。',
    )
  }

  return {
    define: {
      'import.meta.env.VITE_APP_NAME': JSON.stringify(appName),
    },
    experimental: {
      /**
       * 替代静态 base 配置，将资源路径解析推迟到运行时。
       * 主应用需在加载子应用前注入 window.__assetsPath。
       * @see apps/main-app/src/utils/microApp/assetsPath.ts
       */
      renderBuiltUrl(filename, { hostType }) {
        // CSS 中引用的图片保持相对路径
        // async chunk CSS 以 <link> 加载，url() 相对 CSS 文件自身 URL 解析，无需改写
        if (
          hostType === 'css' &&
          /\.(png|jpe?g|gif|svg|webp|woff2?|ttf|otf|eot)$/i.test(filename)
        ) {
          return { relative: true }
        }
        // JS/CSS 运行时动态路径
        if (hostType === 'js' || hostType === 'css') {
          return {
            runtime: `window.__assetsPath(
              ${JSON.stringify(appName)},
              ${JSON.stringify(filename)}
            )`,
          }
        }
        // hostType === 'html'
        // modulepreload/script src 等由 qiankun HTML fetcher 在运行时补全 origin
        return { relative: true }
      },
    },
    plugins: [
      qiankun(appName, {
        useDevMode: true,
      }),
    ],
    server: {
      origin: `http://localhost:${port}`,
    },
  }
}
