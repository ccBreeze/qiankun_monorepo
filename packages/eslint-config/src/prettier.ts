import type { Linter } from 'eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

export const prettier: Linter.Config[] = [
  // 关闭与 Prettier 冲突的 ESLint 规则
  eslintConfigPrettier,
  {
    // 启用 prettier/prettier 规则，将 Prettier 格式问题作为 ESLint 报错
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
]
