import { globalIgnores } from 'eslint/config'
import { base } from '@breeze/eslint-config'

// 根目录配置：仅 lint 根目录的配置文件和文档
// 注意：apps/** 和 packages/** 有各自的 ESLint 配置
export default [
  ...base,
  {
    name: 'root/type-aware-files',
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: {
          allowDefaultProject: ['scripts/*.mjs', '*.js', '*.mjs'],
        },
      },
    },
  },
  {
    name: 'root/node-files',
    // 根目录脚本与配置文件运行在 Node 环境，需要显式声明常用全局变量
    files: ['scripts/**/*.mjs', '*.config.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  globalIgnores([
    // 只 lint 根目录的文件，子项目使用各自的配置
    'apps/**',
    'packages/**',
    'docs/**',

    // Spec Kit temporary ignores
    '.agents/**',
    '.claude/**',
    '.github/**',
    '.specify/**',
    'specs/**',
    'AGENTS.md',
  ]),
]
