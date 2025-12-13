// @ts-check
import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

export default defineConfig([
  // ESLint 推荐规则
  eslint.configs.recommended,
  // TypeScript 推荐规则
  tseslint.configs.recommended,

  // Prettier 配置（关闭与 Prettier 冲突的规则）
  prettier,
  // Prettier 插件（将 Prettier 作为 ESLint 规则运行）
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },

  // 忽略文件
  {
    // ignores: ['**/*.md'],
  },
])
