import { base } from '@breeze/eslint-config'

/**
 * @breeze/vite-config ESLint 配置
 * 基于共享配置 @breeze/eslint-config/base
 */
export default [
  ...base,
  {
    name: 'vite-config/node',
    languageOptions: {
      globals: {
        process: 'readonly',
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
