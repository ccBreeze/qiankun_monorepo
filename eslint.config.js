// @ts-check
import { base } from '@breeze/eslint-config'

// 根目录配置：仅 lint 根目录的配置文件和文档
// 注意：apps/** 和 packages/** 有各自的 ESLint 配置
export default [
  ...base,
  {
    // 只 lint 根目录的文件，子项目使用各自的配置
    ignores: ['apps/**', 'packages/**'],
  },
]
