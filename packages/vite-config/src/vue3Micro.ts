import { defineConfig, mergeConfig } from 'vite'

import { createQiankunConfig } from './qiankun.ts'
import { createVue3BaseConfig, type SharedVueOptions } from './vue3.ts'
import { createMicroFederationConfig } from './federation/micro.ts'
import { vue3FederationConfig } from './federation/vue3.ts'

/** 创建 Vue3 子应用配置 */
export const createVue3MicroAppConfig = (options: SharedVueOptions) => {
  return defineConfig(() =>
    mergeConfig(
      mergeConfig(
        createVue3BaseConfig(options),
        createQiankunConfig({ port: options.port }),
      ),
      createMicroFederationConfig(vue3FederationConfig),
    ),
  )
}
