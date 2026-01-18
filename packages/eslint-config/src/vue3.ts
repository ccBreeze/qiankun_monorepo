import type { Linter } from 'eslint'
import { vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import { base } from './base.ts'

/**
 * Vue3 ESLint 配置数组
 * 包含基础配置 + Vue3 相关规则
 *
 * 使用场景：
 * - Vue 3 + TypeScript 项目
 * - Vite + Vue 项目
 *
 * @example
 * ```ts
 * // eslint.config.js
 * import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
 * import { vue3 } from '@breeze/eslint-config'
 *
 * export default defineConfigWithVueTs(...vue3, {
 *   languageOptions: {
 *     parserOptions: {
 *       tsconfigRootDir: import.meta.dirname,
 *     },
 *   },
 * })
 * ```
 */
export const vue3: Linter.Config[] = [
  // 基础配置（JS + TS + Prettier）
  ...base,

  // Vue 文件范围限定
  {
    name: '@breeze/vue3/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  // Vue 推荐规则
  pluginVue.configs['flat/recommended'] as Linter.Config,

  // Vue + TypeScript 集成
  vueTsConfigs.recommended as Linter.Config,

  // 关闭与 Prettier 冲突的 Vue 规则（Vue 文件和 JSX/TSX）
  {
    name: '@breeze/vue3/prettier-compat',
    files: ['**/*.{vue,jsx,tsx}'],
    rules: {
      // 这些规则与 Prettier 冲突，会导致 circular fixes
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-closing-bracket-newline': 'off',

      // 组件名规则
      'vue/multi-word-component-names': [
        'error',
        {
          // 允许 index.vue 作为组件名
          ignores: ['index'],
        },
      ],

      // 检测模板中使用的未定义组件
      'vue/no-undef-components': [
        'error',
        {
          // 忽略 router 组件和 ant-design-vue 组件
          ignorePatterns: ['router-view', 'router-link', '^a-', '^A[A-Z]'],
        },
      ],
    },
  },
]
