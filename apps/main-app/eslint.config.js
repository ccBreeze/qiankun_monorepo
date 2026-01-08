// @ts-check
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { vue3 } from '@breeze/eslint-config'
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

/**
 * Main App ESLint 配置
 * 基于共享配置 @breeze/eslint-config/vue3
 */
export default defineConfigWithVueTs(...vue3, {
  name: 'main-app/auto-import',
  languageOptions: {
    globals: autoImportGlobals.globals,
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
