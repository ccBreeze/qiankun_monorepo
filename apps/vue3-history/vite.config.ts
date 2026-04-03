import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import qiankun from 'vite-plugin-qiankun'

const resolvePath = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    build: {
      // 解决 CSS link 标签插入到主应用 head 问题
      cssCodeSplit: false,
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
  }
})
