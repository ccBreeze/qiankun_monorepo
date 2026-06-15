<template>
  <div class="container">
    <h2>vxe-table 表格行列交叉高亮（全局零侵入）</h2>
    <p>
      高亮能力由 @breeze/plugins 的 vxeTableCrossHighlight 插件在 document
      上做一次事件委托提供，对应用内所有 vxe-table
      自动生效——本页面没有任何高亮相关代码。行高亮加在 tr、列高亮加在 colgroup
      的 col 上，由浏览器原生着色，hover 仅改 2 个元素的 class（O(1)），不触发
      Vue 重渲染。当前数据量：{{ ROW_COUNT }} 行 × {{ COLUMN_COUNT + 1 }} 列 =
      {{ ROW_COUNT * (COLUMN_COUNT + 1) }} 个单元格。
    </p>

    <!-- 不启用 rowConfig.isHover：其背景画在 td 层会盖住列高亮，行高亮由插件提供 -->
    <VxeTable
      border
      round
      showOverflow
      height="560"
      :data="tableData"
      :scrollX="{ enabled: true, gt: 0 }"
    >
      <VxeColumn field="product" title="产品" width="160" align="center" />
      <VxeColumn
        v-for="column in metricColumns"
        :key="column.field"
        :field="column.field"
        :title="column.title"
        width="120"
        align="center"
      />
    </VxeTable>
  </div>
</template>

<script setup lang="ts">
import { VxeColumn, VxeTable } from 'vxe-table'
import 'vxe-table/lib/style.css'

defineOptions({
  name: 'VxeTableCrossHighlight',
})

const ROW_COUNT = 500
const COLUMN_COUNT = 20

type MetricField = `metric${number}`

type DemoRecord = {
  id: number
  product: string
} & Record<MetricField, number>

type ColumnMeta = {
  field: MetricField
  title: string
}

const metricColumns: ColumnMeta[] = Array.from(
  { length: COLUMN_COUNT },
  (_, index) => ({
    field: `metric${index + 1}`,
    title: `指标 ${index + 1}`,
  }),
)

// 保持示例稳定可复现，避免每次渲染都重新生成数据。
const tableData: DemoRecord[] = Array.from({ length: ROW_COUNT }, (_, row) => {
  const record = {
    id: row + 1,
    product: `产品 ${row + 1}`,
  } as DemoRecord

  metricColumns.forEach(({ field }, columnIndex) => {
    record[field] = Math.round(Math.random() * 1000) + columnIndex
  })

  return record
})
</script>

<style scoped lang="scss">
.container {
  padding: 16px;

  p {
    margin-bottom: 16px;
    line-height: 1.6;
    color: #4b5563;
  }
}
</style>
