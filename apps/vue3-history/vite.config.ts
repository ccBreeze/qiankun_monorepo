import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import qiankun from 'vite-plugin-qiankun'

const resolvePath = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    // base: 'http://localhost:8101', // 生产环境需要指定运行域名
    experimental: {
      /**
       * 替代静态 base 配置，将资源路径解析推迟到运行时。
       *
       * 主应用需在加载子应用前注入 window.__assetsPath。
       * @see apps/main-app/src/views/MicroApp/runtime/assetsPath.ts
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
              ${JSON.stringify(env.VITE_APP_NAME)},
              ${JSON.stringify(filename)}
            )`,
          }
        }
        return { relative: true }
      },
    },
    plugins: [
      vue(),
      vueJsx(),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/types/auto-imports.d.ts',
        eslintrc: {
          enabled: true,
          filepath: './.eslintrc-auto-import.json',
        },
        vueTemplate: true,
      }),
      Components({
        dirs: [],
        dts: 'src/types/components.d.ts',
        resolvers: [
          AntDesignVueResolver({
            importStyle: false,
            resolveIcons: true,
          }),
        ],
      }),
      qiankun(env.VITE_APP_NAME, {
        useDevMode: true,
      }),
    ],
    resolve: {
      alias: {
        '@': resolvePath('./src'),
      },
    },
    server: {
      port: 8101,
      cors: true,
      origin: 'http://localhost:8101',
    },
    preview: {
      port: 8101,
    },
  }
})
