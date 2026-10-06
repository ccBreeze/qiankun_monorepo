import type { ModuleFederationOptions } from '@module-federation/vite'

const vue3Shared = [
  'vue',
  'vue-router',
  'pinia',
  'vue-i18n',
  'ant-design-vue',
  '@ant-design/icons-vue',
]

/** 主应用与子应用共用的 Vue 3 依赖共享配置。 */
export const vue3FederationConfig = {
  shareScope: ['default', 'vue3'],
  shared: Object.fromEntries(
    vue3Shared.map((name) => [
      name,
      {
        shareScope: 'vue3',
        singleton: true,
      },
    ]),
  ),
} as Partial<ModuleFederationOptions>
