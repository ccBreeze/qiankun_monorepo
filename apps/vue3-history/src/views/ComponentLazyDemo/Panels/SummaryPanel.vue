<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'ComponentLazySummaryPanel',
})

const keyword = ref('总览草稿')

const metrics = [
  {
    label: '今日请求',
    value: '12,864',
    trend: '+18.2%',
  },
  {
    label: '平均响应',
    value: '286ms',
    trend: '-32ms',
  },
  {
    label: '可用率',
    value: '99.96%',
    trend: '+0.04%',
  },
]
</script>

<template>
  <section class="panel-content">
    <div class="metric-grid">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="metric-card"
      >
        <span class="metric-card__label">{{ metric.label }}</span>
        <strong class="metric-card__value">{{ metric.value }}</strong>
        <span class="metric-card__trend">{{ metric.trend }}</span>
      </article>
    </div>
    <div class="summary-line">
      总览组件已经挂载，适合承载轻量但非首屏必需的统计模块。
    </div>
    <label class="state-input">
      <span>总览输入</span>
      <input
        v-model="keyword"
        type="text"
        placeholder="输入后切换 tab 再回来"
      />
    </label>
  </section>
</template>

<style lang="scss" scoped>
.panel-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 16px;
  background: #f7fbff;
  border: 1px solid #d8e8ff;
  border-radius: 8px;

  &__label,
  &__trend {
    display: block;
    font-size: 13px;
    color: #5a6b7f;
  }

  &__value {
    display: block;
    margin: 8px 0;
    font-size: 24px;
    line-height: 1.2;
    color: #17324d;
  }

  &__trend {
    color: #1d8f5f;
  }
}

.summary-line {
  padding: 12px 14px;
  font-size: 14px;
  color: #37526f;
  background: #eef8f2;
  border: 1px solid #cbe8d8;
  border-radius: 8px;
}

.state-input {
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: #425b74;

  input {
    box-sizing: border-box;
    width: 100%;
    padding: 9px 11px;
    font-size: 14px;
    color: #18324c;
    outline: none;
    border: 1px solid #c8d4e2;
    border-radius: 6px;

    &:focus {
      border-color: #2f6fed;
    }
  }
}

@media (width <= 720px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
