import type { Linter } from 'eslint'
import tseslint from 'typescript-eslint'

/**
 * TypeScript ESLint 配置
 * 包含基础规则 + 类型感知规则
 *
 * 使用 Project Service API (typescript-eslint v8+)
 * 参考: https://typescript-eslint.io/blog/project-service/
 *
 * Project Service 优势：
 * - 无需手动指定 tsconfig 路径
 * - 支持 .vue/.svelte 等扩展文件
 * - ESLint --fix 模式下不会丢失类型信息
 * - 与 VS Code 等编辑器使用相同的类型检查逻辑
 */
export const typescript: Linter.Config[] = [
  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  {
    name: '@breeze/typescript/typed-linting',
    // 类型感知配置
    languageOptions: {
      parserOptions: {
        // 使用 Project Service API（v8+ 推荐）
        // 自动查找最近的 tsconfig.json，无需 monorepo 特殊配置
        projectService: {
          // 允许不在 tsconfig 中的文件（如根目录的配置文件）
          allowDefaultProject: ['*.js', '*.mjs', '*.cjs'],
        },
      },
    },
    // 类型感知规则（需要 Project Service）
    rules: {
      // === Promise 相关规则（核心规则，防止异步错误）===
      '@typescript-eslint/no-floating-promises': 'error', // 禁止未处理的 Promise
      '@typescript-eslint/await-thenable': 'error', // 禁止 await 非 Promise
      '@typescript-eslint/no-misused-promises': 'error', // 禁止错误使用 Promise

      // === 类型完整性检查 ===
      '@typescript-eslint/switch-exhaustiveness-check': 'error', // 检查 switch 覆盖所有情况

      // === 类型安全规则（警告级别）===
      '@typescript-eslint/no-unnecessary-condition': 'warn', // 检测不必要的条件判断
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn', // 检测不必要的类型断言
    },
  },
]
