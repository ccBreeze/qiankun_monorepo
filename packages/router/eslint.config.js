import { base } from '@breeze/eslint-config'

/**
 * @breeze/router ESLint 配置
 * 基于共享配置 @breeze/eslint-config/base
 */
export default [
  ...base,
  {
    name: 'router/tsconfig',
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
