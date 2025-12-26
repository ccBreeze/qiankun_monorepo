import type { Linter } from 'eslint'
import eslint from '@eslint/js'
import { ignores } from './ignores.ts'
import { prettier } from './prettier.ts'
import { typescript } from './typescript.ts'

/**
 * 基础 ESLint 配置
 * 包含 JavaScript、TypeScript 规则（并默认集成 Prettier）
 */
export const base: Linter.Config[] = [
  // 全局忽略规则
  ignores,

  // ESLint 推荐规则
  eslint.configs.recommended,

  ...typescript,

  ...prettier,
]
