<template>
  <BaseModal v-bind="$attrs" :onOk="handleConfirm">
    <div class="content">
      <p class="heading">
        {{ heading }}
      </p>

      <div class="metric-list">
        <button
          v-for="metric in metrics"
          :key="metric.label"
          type="button"
          class="metric-card"
          :class="{ 'metric-card--active': selectedMetric === metric.label }"
          @click="selectedMetric = metric.label"
        >
          <span class="metric-card__label">{{ metric.label }}</span>
          <strong class="metric-card__value">{{ metric.value }}</strong>
          <span class="metric-card__note">{{ metric.note }}</span>
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BaseModal, type ModalInjectedProps } from '@breeze/components'

interface MetricItem {
  label: string
  value: string
  note: string
}

interface MetricsSnapshotModalOptions {
  heading: string
  metrics: MetricItem[]
  defaultMetric?: string
}

interface MetricsSnapshotModalResult {
  source: 'apps/vue3-history'
  kind: 'metrics'
  selectedMetric: string
  metricCount: number
  processedAt: string
}

const props = defineProps<
  MetricsSnapshotModalOptions &
    Pick<ModalInjectedProps<MetricsSnapshotModalResult>, 'onOk'>
>()

const selectedMetric = ref(props.defaultMetric ?? props.metrics[0]?.label ?? '')

const handleConfirm = (): void => {
  props.onOk({
    source: 'apps/vue3-history',
    kind: 'metrics',
    selectedMetric: selectedMetric.value,
    metricCount: props.metrics.length,
    processedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
}
</script>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.heading {
  margin: 0;
  line-height: 1.75;
  color: #41556b;
}

.metric-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: #f8fbff;
  border: 1px solid #d5e3f3;
  border-radius: 18px;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-1px);
}

.metric-card--active {
  border-color: #2f6fed;
  box-shadow: 0 0 0 4px rgb(47 111 237 / 12%);
}

.metric-card__label {
  font-size: 13px;
  color: #58738d;
}

.metric-card__value {
  font-size: 24px;
  line-height: 1.1;
  color: #173754;
}

.metric-card__note {
  font-size: 12px;
  color: #6a839d;
}
</style>
