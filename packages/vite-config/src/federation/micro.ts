import type { UserConfig } from 'vite'
import {
  federation,
  type ModuleFederationOptions,
} from '@module-federation/vite'

import { createFederationPlaceholderExposes } from './patches/sharedFallback.ts'
import { federationQiankunPlugin } from './patches/vitePluginFederationQiankun.ts'

/** 根据技术栈共享规则组装 qiankun 子应用的 MF 配置与兼容补丁。 */
export const createMicroFederationConfig = (
  options: Partial<ModuleFederationOptions>,
): UserConfig => {
  return {
    plugins: [
      federation({
        name: process.env.npm_package_name!,
        // qiankun 子应用会改写 HTML 脚本，将 MF 初始化放入应用入口依赖链。
        hostInitInjectLocation: 'entry',
        exposes: createFederationPlaceholderExposes(),
        ...options,
      }),
      federationQiankunPlugin(),
    ],
  }
}
