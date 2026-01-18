/**
 * @breeze/eslint-config
 * 共享 ESLint 配置包
 *
 * 导出内容：
 * - base: 基础配置（JS + TS + Prettier）
 * - vue3: Vue 3 配置（包含 base）
 * - typescript: TypeScript 规则
 * - prettier: Prettier 集成
 * - ignores: 全局忽略规则
 */

export * from './base.ts'
export * from './vue3.ts'
export * from './prettier.ts'
export * from './typescript.ts'
export * from './ignores.ts'
