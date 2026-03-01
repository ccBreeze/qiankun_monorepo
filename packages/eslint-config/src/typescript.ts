import type { Linter } from 'eslint'
import tseslint from 'typescript-eslint'

/**
 * TypeScript ESLint 配置
 * 包含基础规则 + 类型感知规则 + 代码质量规则
 */
export const typescript: Linter.Config[] = [
  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  {
    name: '@breeze/typescript/typed-linting',
    // 类型感知配置
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs', '*.cjs'],
        },
      },
    },
    rules: {
      // === Promise 相关规则（核心规则，防止异步错误）===
      '@typescript-eslint/await-thenable': 'error', // 禁止 await 非 Promise
      '@typescript-eslint/no-misused-promises': 'error', // 禁止错误使用 Promise

      // === 类型完整性检查 ===
      '@typescript-eslint/switch-exhaustiveness-check': 'error', // 检查 switch 覆盖所有情况

      // === 类型安全规则（警告级别）===
      '@typescript-eslint/no-unnecessary-condition': 'warn', // 检测不必要的条件判断
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn', // 检测不必要的类型断言

      // === 代码质量规则 ===
      // 统一使用 type 导入，提升编译性能和代码清晰度
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
          fixStyle: 'inline-type-imports',
        },
      ],

      // 禁止使用 any 类型（推荐使用 unknown）
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
