// @ts-check
import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // ESLint 推荐规则
  eslint.configs.recommended,

  // TypeScript 推荐规则
  tseslint.configs.recommended,

  // 忽略文件
  {
    ignores: [
      'node_modules/',
      'pnpm-lock.yaml',
      'dist/',
      'build/',
      '*.config.js',
    ],
  },
])
