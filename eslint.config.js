// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'

export default defineConfigWithVueTs(
  // 忽略文件
  {
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/node_modules/**',
      '**/coverage/**',
    ],
  },

  // ESLint 推荐规则
  eslint.configs.recommended,

  // TypeScript 推荐规则
  tseslint.configs.recommended,

  // Vue 配置（仅适用于 Vue 文件）
  {
    name: 'vue/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  // Prettier 配置
  prettierConfig,
  {
    plugins: { prettier: prettierPlugin },
    rules: { 'prettier/prettier': 'error' },
  },
)
