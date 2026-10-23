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
          ...mergeConfig(vue3FederationConfig, {
            shared: {
              // 同时暴露组件时，确保应用入口与远程组件使用同一份 Vue。
              vue: { eager: true },
              // antd 在模块求值时调用 dayjs.extend，插件必须同步就绪。
              dayjs: { eager: true },
              'dayjs/': { eager: true },
            },
          }),
          filename: 'remoteEntry.js',
          exposes: {
            './NotFound': './src/federation/notFound.ts',
          },
          // 当前远程组件的类型由消费者直接复用 workspace 声明。
          dts: false,
        }),
      ],
      server: {
        origin: 'http://localhost:8100',
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
