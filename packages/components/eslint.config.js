import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { vue3 } from '@breeze/eslint-config'

/**
 * @breeze/components ESLint 配置
 * 基于共享配置 @breeze/eslint-config/vue3
 */
export default defineConfigWithVueTs(...vue3, {
  name: 'components/tsconfig',
  languageOptions: {
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
