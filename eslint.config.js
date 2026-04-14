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
    // 根目录脚本与配置文件运行在 Node 环境，需要显式声明常用全局变量
    files: ['scripts/**/*.mjs', '*.config.js', '*.config.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    // 只 lint 根目录的文件，子项目使用各自的配置
    ignores: ['apps/**', 'packages/**', 'docs/**', '.claude'],
  },
]
