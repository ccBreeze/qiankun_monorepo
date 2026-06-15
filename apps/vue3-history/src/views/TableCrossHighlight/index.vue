<template>
  <div class="container">
    <h2>表格行列交叉高亮（全局零侵入）</h2>
    <p>
      高亮能力由 @breeze/components 的 aTableCrossHighlight 插件在 document
      上做一次事件委托提供，对应用内所有 a-table 自动生效——
      本页面没有任何高亮相关代码，存量表格也无需改动。 行高亮加在 tr、列高亮加在
      colgroup 的 col 上，由浏览器原生着色， 无坐标计算，hover 仅改 2 个元素的
      class。当前数据量：{{ ROW_COUNT }} 行 × {{ COL_COUNT + 1 }} 列 =
      {{ ROW_COUNT * (COL_COUNT + 1) }} 个单元格。
    </p>
    <a-space>
      <a-button type="primary" @click="modalOpen = true">
        打开弹窗（cross-highlight-off 验证）
      </a-button>
      <a-button @click="highlightModalOpen = true">
        打开弹窗（cross-highlight 是否生效验证）
      </a-button>
    </a-space>
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :pagination="false"
      :scroll="{ x: COL_COUNT * 120, y: 520 }"
      bordered
    />

    <a-modal
      v-model:open="modalOpen"
      title="弹窗内表格（已退出交叉高亮）"
      width="640px"
      :footer="null"
    >
      <!-- cross-highlight-off 使此表格退出高亮，antd 原生 hover 行为保留 -->
      <div class="cross-highlight-off">
        <a-table
          :columns="modalColumns"
          :data-source="modalData"
          :pagination="false"
          :scroll="{ y: 320 }"
          bordered
        />
      </div>
    </a-modal>

    <a-modal
      v-model:open="highlightModalOpen"
      title="弹窗内表格（交叉高亮应生效）"
      width="640px"
      :footer="null"
    >
      <a-table
        :columns="modalColumns"
        :data-source="modalData"
        :pagination="false"
        :scroll="{ y: 320 }"
        bordered
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TableColumnType } from 'ant-design-vue'

defineOptions({
  name: 'TableCrossHighlight',
})

const ROW_COUNT = 500
const COL_COUNT = 20

type DemoRecord = Record<string, string | number>

const columns: TableColumnType<DemoRecord>[] = [
  { title: '产品', dataIndex: 'product', width: 120, align: 'center' },
  ...Array.from(
    { length: COL_COUNT },
    (_, i): TableColumnType<DemoRecord> => ({
      title: `指标 ${i + 1}`,
      dataIndex: `c${i}`,
      width: 120,
      align: 'center',
    }),
  ),
]

const dataSource: DemoRecord[] = Array.from({ length: ROW_COUNT }, (_, row) => {
  const record: DemoRecord = { key: row, product: `产品 ${row + 1}` }
  for (let col = 0; col < COL_COUNT; col++) {
    record[`c${col}`] = Math.round(Math.random() * 1000)
  }
  return record
})

const modalOpen = ref(false)
const highlightModalOpen = ref(false)

const modalColumns: TableColumnType<DemoRecord>[] = [
  { title: '名称', dataIndex: 'name', width: 120 },
  { title: '数值 A', dataIndex: 'a', width: 120, align: 'center' },
  { title: '数值 B', dataIndex: 'b', width: 120, align: 'center' },
  { title: '数值 C', dataIndex: 'c', width: 120, align: 'center' },
]

const modalData: DemoRecord[] = Array.from({ length: 20 }, (_, i) => ({
  key: i,
  name: `项目 ${i + 1}`,
  a: Math.round(Math.random() * 100),
  b: Math.round(Math.random() * 100),
  c: Math.round(Math.random() * 100),
}))
</script>

<style scoped lang="scss">
.container {
  padding: 16px;
}
</style>
