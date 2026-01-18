// @ts-check
import { base } from '@breeze/eslint-config'

/**
 * @breeze/utils ESLint 配置
 * 基于共享配置 @breeze/eslint-config/base
 */
export default [
  ...base,
  {
    name: 'utils/tsconfig',
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
