// @ts-check
import { base } from '@breeze/eslint-config'

/**
 * @breeze/qiankun-shared ESLint 配置
 * 基于共享配置 @breeze/eslint-config/base
 */
export default [
  ...base,
  {
    name: 'qiankun-shared/tsconfig',
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
