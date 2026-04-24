import { resolve } from 'node:path'

import type { UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

/** 基础 Vue3 配置参数 */
export type SharedVueOptions = {
  /** 开发服务器端口（同时用作 preview 端口） */
  port: number
}

/**
 * 创建 Vue3 + Vite 基础配置。
 * 适用于主应用 / 子应用。
 */
export const createVue3BaseConfig = (options: SharedVueOptions): UserConfig => {
  const { port } = options

  return {
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
        dirs: [], // 关闭目录扫描，组件需显式 import；仅保留 resolver 按需注册 antd 组件
        dts: 'src/types/components.d.ts',
        resolvers: [
          AntDesignVueResolver({
            // ant-design-vue v4 使用 CSS-in-JS，无需单独引入样式文件
            importStyle: false,
            resolveIcons: true,
          }),
        ],
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(process.cwd(), 'src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (/node_modules\/(vue|vue-router|pinia)\//.test(id)) {
              return 'vue-vendor'
            }
            if (
              /node_modules\/(ant-design-vue|@ant-design\/icons-vue)\//.test(id)
            ) {
              return 'antd'
            }
            return 'vendor'
          },
        },
      },
    },
    server: {
      port,
      strictPort: true,
      cors: true,
    },
    preview: {
      port,
      strictPort: true,
    },
  }
}
