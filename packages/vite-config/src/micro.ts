import { defineConfig, loadEnv, mergeConfig } from 'vite'
import type { UserConfig } from 'vite'
import qiankun from 'vite-plugin-qiankun'

import { createVue3BaseConfig } from './base.ts'
import type { SharedVueOptions } from './base.ts'

/**
 * 创建 qiankun 子应用专用的 Vite 配置。
 */
export const createVue3MicroAppConfig = (options: SharedVueOptions) => {
  return defineConfig((env) => {
    const { port } = options
    const envMap = loadEnv(env.mode, process.cwd())

    // 提前校验，避免 appName 为 undefined 时产生静默 404
    const appName = envMap.VITE_APP_NAME
    if (!appName) {
      throw new Error(
        '[vite-config] VITE_APP_NAME is required in .env for micro app config',
      )
    }

    // 子应用专属配置：qiankun 插件 + 运行时资源路径 + server.origin
    const microAppConfig: UserConfig = {
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

    return mergeConfig(createVue3BaseConfig(options), microAppConfig)
  })
}
