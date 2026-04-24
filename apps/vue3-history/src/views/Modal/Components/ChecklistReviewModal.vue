<template>
  <BaseModal v-bind="$attrs" :onOk="handleConfirm">
    <div class="content">
      <p class="summary">
        {{ summary }}
      </p>

      <label v-for="item in items" :key="item" class="check-item">
        <input
          :checked="selectedItems.includes(item)"
          type="checkbox"
          @change="toggleItem(item)"
        />
        <span>{{ item }}</span>
      </label>

      <p class="footer">
        当前已勾选 {{ selectedItems.length }} / {{ items.length }} 项
      </p>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BaseModal, type ModalInjectedProps } from '@breeze/components'

interface ChecklistReviewModalOptions {
  summary: string
  items: string[]
  initialChecked?: string[]
}

interface ChecklistReviewModalResult {
  source: 'apps/vue3-history'
  kind: 'checklist'
  completedCount: number
  selectedItems: string[]
  processedAt: string
}

const props = defineProps<
  ChecklistReviewModalOptions &
    Pick<ModalInjectedProps<ChecklistReviewModalResult>, 'onOk'>
>()

const selectedItems = ref([...(props.initialChecked ?? [])])

const toggleItem = (item: string): void => {
  if (selectedItems.value.includes(item)) {
    selectedItems.value = selectedItems.value.filter(
      (currentItem) => currentItem !== item,
    )
    return
  }

  selectedItems.value = [...selectedItems.value, item]
}

const handleConfirm = (): void => {
  props.onOk({
    source: 'apps/vue3-history',
    kind: 'checklist',
    completedCount: selectedItems.value.length,
    selectedItems: selectedItems.value,
    processedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
}
</script>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.summary {
  margin: 0;
  line-height: 1.75;
  color: #41556b;
}

.check-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  color: #183b56;
  background: #f8fbff;
  border: 1px solid #d5e3f3;
  border-radius: 16px;
}

.check-item input {
  width: 16px;
  height: 16px;
  accent-color: #2f6fed;
}

.footer {
  margin: 0;
  font-size: 13px;
  color: #58738d;
}
</style>
