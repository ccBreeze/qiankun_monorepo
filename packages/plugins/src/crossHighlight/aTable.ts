import type { CellMatcher } from './core'
import { createCrossHighlight } from './core'

const matchTableCell: CellMatcher = (target) => {
  // 仅匹配 antd 单元格
  return target.closest<HTMLTableCellElement>('td.ant-table-cell')
}

export default createCrossHighlight(matchTableCell, {
  loadStyle: () => import('./aTable.scss'),
})
