import type { Linter } from 'eslint'
import { vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import { base } from './base.ts'

/**
 * Vue3 ESLint 配置数组
 * 包含基础配置 + Vue3 相关规则
 *
 * 用法:
 * ```js
 * import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
 * import { vue3 } from '@breeze/eslint-config'
 *
 * export default defineConfigWithVueTs(...vue3)
 * ```
 */
export const vue3 = [
  // 基础配置（JS + TS + Prettier）
  ...base,

  // Vue 文件范围限定
  {
    name: '@breeze/vue3/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  // Vue 推荐规则
  pluginVue.configs['flat/recommended'],

  // Vue + TypeScript 集成
  vueTsConfigs.recommended,

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

      'vue/multi-word-component-names': [
        'error',
        {
          // 需要忽略的组件名
          ignores: ['index'],
        },
      ],
      // 检测模板中使用的未定义组件
      'vue/no-undef-components': [
        'error',
        {
          ignorePatterns: ['router-view', 'router-link', '^a-'],
        },
      ],
    } as NonNullable<Linter.Config['rules']>,
  },
]
