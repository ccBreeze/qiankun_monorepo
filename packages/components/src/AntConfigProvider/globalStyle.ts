/**
 * antdv 4 的 theme token 覆盖不到的 scss（组件级 token 接口多数为空）统一在此运行时注入。
 * 用 `?inline` 把 scss 编译为字符串随 JS 打包，再以固定 id 的 <style> 插入 <head>，
 * 保证 qiankun 多子应用聚合到同一文档时全局样式只存在一份。
 */
import styleText from './theme/scss/index.scss?inline'

// 所有子应用共用同一 id；id 命中即视为已注入，避免重复 append
const STYLE_ID = 'breeze-antd-global-style'

/**
 * 幂等：
 * - SSR / 非浏览器环境直接跳过；
 * - 浏览器端首次调用写入 <style>，后续调用命中 id 短路。
 * 在 `AntConfigProvider` 的 `<script setup>` 顶层调用，模块首次求值即注入。
 */
export function ensureGlobalStyle(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return

  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = styleText
  document.head.appendChild(el)
}
