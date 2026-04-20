import { resolve } from 'node:path'

import { defineConfig, mergeConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { createVue3BaseConfig } from '@breeze/vite-config/base'

export default defineConfig(
  mergeConfig(
    createVue3BaseConfig({
      port: 8100,
    }),
    {
      plugins: [
        vueDevTools(),
        createSvgIconsPlugin({
          iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
        }),
      ],
      server: {
        proxy: {
          // 代理 API 请求到 mock-server
          '/ManageAction': {
            target: 'http://localhost:8200',
            changeOrigin: true,
          },
        },
      },
    },
  ),
)
