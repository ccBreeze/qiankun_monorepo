<template>
  <BaseModal v-bind="$attrs" :onOk="handleConfirm">
    <div class="content">
      <p class="description">
        {{ description }}
      </p>

      <label class="field-label" for="demo-modal-remark">处理备注</label>
      <textarea
        id="demo-modal-remark"
        v-model="remark"
        class="field-input"
        rows="4"
        placeholder="这里可以模拟业务弹窗里的额外表单内容"
      />

      <div class="api-card">
        <p class="api-card__title">确认后模拟接口返回</p>
        <p class="api-card__text">
          会等待 1 秒，再回传一个包含单号、状态、操作人和备注的响应对象。
        </p>
      </div>
    </div>
  </BaseModal>
</template>

<script lang="ts">
import type { BaseModalProps } from '../BaseModal.vue'
import type { ModalInjectedProps } from '../types'

/** DemoActionModal 自身业务字段 */
export interface DemoActionModalOwnProps {
  description: string
  initialRemark?: string
}

/** DemoActionModal 打开入参 = 业务字段 + 透传给 BaseModal 的 props */
export type DemoActionModalRequest = DemoActionModalOwnProps & BaseModalProps

/** DemoActionModal 关闭结果 */
export interface DemoActionModalResult {
  ticketId: string
  status: 'success'
  operatorName: string
  remark: string
  processedAt: string
}

/** 组件侧 props 契约 = 业务字段 + 框架注入的 onOk */
export type DemoActionModalProps = DemoActionModalOwnProps &
  Pick<ModalInjectedProps<DemoActionModalResult>, 'onOk'>
</script>

<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from '../BaseModal.vue'

const props = defineProps<DemoActionModalProps>()

const remark = ref(props.initialRemark ?? '')

const createMockResponse = (): Promise<DemoActionModalResult> => {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        ticketId: `API-${Date.now().toString().slice(-6)}`,
        status: 'success',
        operatorName: '演示账号',
        remark: remark.value.trim(),
        processedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      })
    }, 1000)
  })
}

const handleConfirm = async (): Promise<void> => {
  const response = await createMockResponse()
  props.onOk(response)
}
</script>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.description {
  margin: 0;
  line-height: 1.75;
  color: #41556b;
}

.field-label {
  font-size: 14px;
  font-weight: 600;
  color: #183b56;
}

.field-input {
  min-height: 112px;
  padding: 14px 16px;
  font: inherit;
  line-height: 1.6;
  color: #183b56;
  resize: vertical;
  outline: none;
  background: #f8fbff;
  border: 1px solid #c8d8ea;
  border-radius: 16px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.field-input:focus {
  border-color: #2f6fed;
  box-shadow: 0 0 0 4px rgb(47 111 237 / 12%);
}

.api-card {
  padding: 14px 16px;
  background: linear-gradient(180deg, #f5f9ff 0%, #eef5ff 100%);
  border: 1px solid #d5e3f3;
  border-radius: 16px;
}

.api-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #183b56;
}

.api-card__text {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #58738d;
}
</style>
