import { defineConfig, loadEnv, mergeConfig } from 'vite'

import { createQiankunConfig } from './qiankun.ts'
import { createVue3BaseConfig, type SharedVueOptions } from './vue3.ts'
import { createMicroFederationConfig } from './federation/micro.ts'
import { vue3FederationConfig } from './federation/vue3.ts'

/** 创建 Vue3 子应用配置 */
export const createVue3MicroAppConfig = (options: SharedVueOptions) => {
  return defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd())

    return mergeConfig(
      mergeConfig(
        createVue3BaseConfig(options),
        createQiankunConfig({ port: options.port }),
      ),
      createMicroFederationConfig(
        mergeConfig(vue3FederationConfig, {
          // 共享依赖统一由主应用提供，避免初始化时互相选中对方的本地回退。
          shared: Object.fromEntries(
            Object.keys(vue3FederationConfig.shared ?? {}).map((name) => [
              name,
              { import: false },
            ]),
          ),
          remotes: {
            shell: {
              type: 'module',
              name: 'main-app',
              // 部署和独立运行均可通过环境变量指定主应用模块入口。
              entry:
                env.VITE_SHELL_REMOTE_ENTRY ||
                'http://localhost:8100/remoteEntry.js',
              // 与 Vue 的共享域一致，确保启动时先初始化远程提供者。
              shareScope: 'vue3',
            },
          },
          // 消费者通过 federation.d.ts 复用 workspace 中的组件类型。
          dts: false,
        }),
      ),
    )
  })
}
