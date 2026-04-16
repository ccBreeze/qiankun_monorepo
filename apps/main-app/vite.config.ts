import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

const resolvePath = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
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
          // ant-design-vue v4 使用 CSS-in-JS，无需单独引入样式文件
          importStyle: false,
          resolveIcons: true,
        }),
      ],
    }),
    createSvgIconsPlugin({
      iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
    }),
  ],
  resolve: {
    alias: {
      '@': resolvePath('./src'),
    },
  },
  server: {
    port: 8100,
    cors: true,
    proxy: {
      // 代理 API 请求到 mock-server
      '/ManageAction': {
        target: 'http://localhost:8200',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 8100,
  },
})
