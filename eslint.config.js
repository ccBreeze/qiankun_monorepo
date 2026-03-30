import { base } from '@breeze/eslint-config'

// 根目录配置：仅 lint 根目录的配置文件和文档
// 注意：apps/** 和 packages/** 有各自的 ESLint 配置
export default [
  ...base,
  {
    // 显式设置 tsconfigRootDir，避免 monorepo 中多候选目录冲突
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 只 lint 根目录的文件，子项目使用各自的配置
    ignores: ['apps/**', 'packages/**', 'docs/**', '.claude'],
  },
]
