import { base } from '@breeze/eslint-config'

/**
 * @breeze/i18n ESLint 配置
 * 基于共享配置 @breeze/eslint-config/base
 */
export default [
  ...base,
  {
    name: 'i18n/tsconfig',
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
