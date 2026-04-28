import type { Linter } from 'eslint'
import eslint from '@eslint/js'
import { globalIgnores } from 'eslint/config'
import { ignores } from './ignores.ts'
import { prettier } from './prettier.ts'
import { typescript } from './typescript.ts'

/**
 * 基础 ESLint 配置
 * 包含 JavaScript、TypeScript 规则（并默认集成 Prettier）
 *
 * 使用场景：
 * - Node.js 后端项目
 * - 纯 TypeScript 库
 * - 不使用框架的项目
 */
export const base: Linter.Config[] = [
  // 全局忽略规则
  globalIgnores(ignores),

  // ESLint 推荐规则
  eslint.configs.recommended,

  // TypeScript 规则
  ...typescript,

  // 自定义配置（放在预设规则集之后，便于覆盖和扩展）
  {
    name: '@breeze/base/custom',
    linterOptions: {
      // 报告无用的 eslint-disable 注释
      reportUnusedDisableDirectives: 'warn',
    },
  },

  // Prettier 集成（必须放在最后以关闭格式化冲突规则）
  ...prettier,
]
