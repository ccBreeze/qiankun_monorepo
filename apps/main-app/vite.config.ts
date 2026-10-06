import { resolve } from 'node:path'

import { defineConfig, mergeConfig } from 'vite'
import { federation } from '@module-federation/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { createVue3BaseConfig } from '@breeze/vite-config/vue3'
import { vue3FederationConfig } from '@breeze/vite-config/federation/vue3'

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
        federation({
          name: process.env.npm_package_name!,
          ...vue3FederationConfig,
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
