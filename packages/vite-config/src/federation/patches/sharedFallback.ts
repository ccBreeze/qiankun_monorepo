import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { ModuleFederationOptions } from '@module-federation/vite'

/** 1.23.0 通过非空 exposes 启用延迟回退；仅供没有配置 exposes 的子应用使用 */
export const createFederationPlaceholderExposes = () => {
  // 在应用内部生成真实模块，兼容默认的 MF 声明编译范围；缓存目录无需提交。
  const placeholderDir = path.resolve(
    process.cwd(),
    'node_modules/.cache/breeze-federation',
  )
  const placeholderPath = path.join(placeholderDir, 'placeholder.ts')

  // 避免重复写入触发开发服务更新。
  if (!existsSync(placeholderPath)) {
    mkdirSync(placeholderDir, { recursive: true })
    writeFileSync(
      placeholderPath,
      '// 自动生成，无依赖、无副作用，请勿手动修改。\nexport {}\n',
    )
  }

  return {
    './__mf_placeholder__': placeholderPath,
  } satisfies NonNullable<ModuleFederationOptions['exposes']>
}
