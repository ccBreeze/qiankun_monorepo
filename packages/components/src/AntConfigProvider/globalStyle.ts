/**
 * antdv 4 的 theme token 覆盖不到的 scss（组件级 token 接口多数为空）统一在此运行时注入。
 * 首次需要时再动态加载 `?inline` 样式文本并注入，避免把整段 scss 字符串放进主包。
 * 仍以固定 id 的 <style> 插入 <head>，保证 qiankun 多子应用聚合到同一文档时全局样式只存在一份。
 */
// 所有子应用共用同一 id；id 命中即视为已注入，避免重复 append
const STYLE_ID = 'breeze-antd-global-style'
let pendingStyleLoad: Promise<void> | null = null

/**
 * 幂等：
 * - SSR / 非浏览器环境直接跳过；
 * - 浏览器端首次调用才异步加载样式文本并写入 <style>；
 * - 后续调用命中 id 或复用同一个 Promise，避免重复加载。
 * 在 `AntConfigProvider` 的 `<script setup>` 顶层调用即可。
 */
export function ensureGlobalStyle(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (document.getElementById(STYLE_ID)) return Promise.resolve()
  if (pendingStyleLoad) return pendingStyleLoad

  pendingStyleLoad = import('./theme/scss/index.scss?inline')
    .then(({ default: styleText }) => {
      if (document.getElementById(STYLE_ID)) return

      const el = document.createElement('style')
      el.id = STYLE_ID
      el.textContent = styleText
      document.head.appendChild(el)
    })
    .finally(() => {
      pendingStyleLoad = null
    })

  return pendingStyleLoad
}
