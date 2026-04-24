import type { Linter } from 'eslint'
import { vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import { base } from './base.ts'
import { prettier } from './prettier.ts'

/**
 * Vue3 ESLint 配置数组
 *
 * 使用场景：
 * - Vite + Vue 3 + TypeScript 项目
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

  // Vue 推荐规则
  ...pluginVue.configs['flat/recommended'],

  // Vue + TypeScript 集成
  vueTsConfigs.recommended,

  // Vue 自定义规则
  {
    name: '@breeze/vue3/custom-rules',
    files: ['**/*.{vue,jsx,tsx}'],
    rules: {
      // 关闭与 Prettier 冲突但未被 eslint-config-prettier 覆盖的规则
      'vue/first-attribute-linebreak': 'off',
      // 模板中的组件属性与事件统一使用驼峰形式
      'vue/attribute-hyphenation': ['error', 'never'],
      'vue/v-on-event-hyphenation': [
        'error',
        'never',
        {
          autofix: true,
        },
      ],

      // 项目约定组件 name 格式为「目录名-文件名」（如 KeepAliveDemo-Detail），
      'vue/component-definition-name-casing': 'off',
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
          // 忽略 router 组件、ant-design-vue 组件及图标（按需引入时由 resolver 自动注册）
          ignorePatterns: [
            'router-view',
            'router-link',
            '^a-',
            '^A[A-Z]',
            '(Outlined|Filled|TwoTone)$',
          ],
        },
      ],
    },
  },

  // Prettier 集成（必须放在最后以关闭所有格式化冲突规则，包括 Vue 插件的）
  ...prettier,
]
