import type { CellMatcher } from './core'
import { createCrossHighlight } from './core'

const matchTableCell: CellMatcher = (target) => {
  // 仅匹配 vxe 表体单元格（排除表头/表尾）
  return target.closest<HTMLTableCellElement>('td.vxe-body--column')
}

/** vxe-table 全局行列交叉高亮 */
export default createCrossHighlight(matchTableCell)
