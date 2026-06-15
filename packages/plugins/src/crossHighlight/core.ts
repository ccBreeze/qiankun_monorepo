import type { Plugin } from 'vue'
import './core.scss'

export const ROW_ACTIVE_CLASS = 'cross-row-active'
export const COL_ACTIVE_CLASS = 'cross-col-active'
/** 在表格任意祖先元素上加该 class 可局部退出高亮 */
export const OPT_OUT_CLASS = 'cross-highlight-off'
/** 插件激活时挂在 root 元素上的标记；aTable.scss 的侵入式覆盖仅在此 class 内生效 */
export const HOST_CLASS = 'cross-highlight-host'

/** 从事件目标解析表体单元格；返回 null 表示该目标不参与高亮 */
export type CellMatcher = (target: Element) => HTMLTableCellElement | null

export type CrossHighlightOptions = {
  loadStyle?: () => unknown
}

/**
 * 交叉高亮
 */
export const setupCrossHighlight = (
  matchCell: CellMatcher,
  root: Document | HTMLElement = document,
): (() => void) => {
  // Document 无 classList，统一取 documentElement 作为标记挂载点
  const hostEl = root instanceof Document ? root.documentElement : root
  hostEl.classList.add(HOST_CLASS)

  // 记录当前高亮的元素，mouseover 移入新单元格时先摘除旧高亮再添加新高亮，
  // 避免每次都全量查询 DOM。
  let lastCell: HTMLTableCellElement | null = null
  let lastRow: HTMLElement | null = null
  let lastCol: HTMLElement | null = null

  const clearHighlight = () => {
    lastRow?.classList.remove(ROW_ACTIVE_CLASS)
    lastCol?.classList.remove(COL_ACTIVE_CLASS)
    lastCell = null
    lastRow = null
    lastCol = null
  }

  const updateRow = (row: HTMLElement | null) => {
    if (row === lastRow) return
    lastRow?.classList.remove(ROW_ACTIVE_CLASS)
    row?.classList.add(ROW_ACTIVE_CLASS)
    lastRow = row
  }

  const updateCol = (cell: HTMLTableCellElement) => {
    // 通过 cellIndex 定位 colgroup 中对应的 <col> 元素并切换高亮 class，
    // 浏览器会将该 class 的样式渲染到整列，无需逐个操作 td。

    // colgroup 随列变化（含列虚拟滚动）会整体重建，故每次重新查询，不做缓存。
    const cols = cell.closest('table')?.querySelector('colgroup')?.children
    const col = (cols?.[cell.cellIndex] as HTMLElement | undefined) ?? null
    if (col === lastCol) return
    lastCol?.classList.remove(COL_ACTIVE_CLASS)
    col?.classList.add(COL_ACTIVE_CLASS)
    lastCol = col
  }

  const handleMouseover = (e: Event) => {
    const cell = matchCell(e.target as Element)
    // 非单元格区域时
    // 退出高亮
    if (!cell || cell.closest(`.${OPT_OUT_CLASS}`)) {
      clearHighlight()
      return
    }
    if (cell === lastCell) return

    lastCell = cell
    updateRow(cell.parentElement)
    updateCol(cell)
  }

  // 事件委托优化监听性能
  root.addEventListener('mouseover', handleMouseover)
  root.addEventListener('mouseleave', clearHighlight)
  return () => {
    root.removeEventListener('mouseover', handleMouseover)
    root.removeEventListener('mouseleave', clearHighlight)
    clearHighlight()
    hostEl.classList.remove(HOST_CLASS)
  }
}

export const createCrossHighlight = (
  matchCell: CellMatcher,
  options: CrossHighlightOptions = {},
): Plugin => {
  return {
    install(app, root?: unknown) {
      options.loadStyle?.()

      const resolvedRoot =
        root instanceof HTMLElement || root instanceof Document
          ? root
          : typeof root === 'string'
            ? (document.querySelector<HTMLElement>(root) ?? document)
            : document

      app.onUnmount(setupCrossHighlight(matchCell, resolvedRoot))
    },
  }
}
