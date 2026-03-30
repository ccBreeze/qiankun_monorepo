import type { Linter } from 'eslint'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

/**
 * 使用官方推荐配置，一次性完成：
 * 1. 关闭所有与 Prettier 冲突的 ESLint 规则（eslint-config-prettier）
 * 2. 注册 prettier 插件并启用 prettier/prettier 规则
 *
 * ⚠️ 必须放在配置数组的最后，确保 eslint-config-prettier 能覆盖前面所有规则中的格式规则
 *
 * @see https://github.com/prettier/eslint-plugin-prettier#recommended-configuration
 */
export const prettier = [eslintPluginPrettierRecommended]
