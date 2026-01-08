import { globalIgnores } from 'eslint/config'

/**
 * 全局忽略规则
 * 参考: https://turborepo.com/docs/guides/tools/eslint
 */
export const ignores = globalIgnores([
  // 依赖目录
  '**/node_modules/**',

  // 构建输出
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.output/**',

  // 框架特定
  '**/.next/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/.nitro/**',

  // 缓存和临时文件
  '**/.cache/**',
  '**/coverage/**',

  // 类型声明（自动生成）
  '**/*.d.ts',
  '!**/src/**/*.d.ts', // 但保留 src 目录下的手写声明
  '**/auto-imports.d.ts', // 忽略所有 auto-imports.d.ts
  '**/components.d.ts', // 忽略自动生成的组件类型声明

  // 锁文件
  '**/pnpm-lock.yaml',
  '**/package-lock.json',
  '**/yarn.lock',
])
