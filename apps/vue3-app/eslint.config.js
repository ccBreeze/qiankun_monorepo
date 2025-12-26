// @ts-check
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { vue3 } from '@breeze/eslint-config'
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

/**
 * Vue3 应用 ESLint 配置
 * 基于共享配置 @breeze/eslint-config/vue3
 *
 * 参考: https://turborepo.com/docs/guides/tools/eslint
 */
export default defineConfigWithVueTs(
  // 共享的 Vue3 配置（包含 base + typescript + prettier + vue）
  ...vue3,

  // 项目特定配置
  {
    name: 'vue3-app/auto-import',
    // unplugin-auto-import 生成的全局变量
    languageOptions: {
      globals: autoImportGlobals.globals,
    },
  },

  // 如需项目特定规则，可在此添加
  // {
  //   name: 'vue3-app/custom-rules',
  //   rules: {},
  // },
)
