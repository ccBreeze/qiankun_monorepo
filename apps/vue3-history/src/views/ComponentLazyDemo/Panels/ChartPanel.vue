<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'ComponentLazyChartPanel',
})

const chartName = ref('近五日活跃趋势')

const bars = [
  {
    label: '周一',
    value: 46,
  },
  {
    label: '周二',
    value: 72,
  },
  {
    label: '周三',
    value: 58,
  },
  {
    label: '周四',
    value: 84,
  },
  {
    label: '周五',
    value: 66,
  },
]
</script>

<template>
  <section class="chart-panel">
    <label class="state-input">
      <span>趋势输入</span>
      <input
        v-model="chartName"
        type="text"
        placeholder="输入后切换 tab 再回来"
      />
    </label>
    <div class="bar-chart" aria-label="近五日活跃趋势">
      <div v-for="bar in bars" :key="bar.label" class="bar-chart__item">
        <div class="bar-chart__track">
          <span class="bar-chart__bar" :style="{ height: `${bar.value}%` }" />
        </div>
        <strong>{{ bar.value }}</strong>
        <span>{{ bar.label }}</span>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.chart-panel {
  padding: 8px 0 4px;
}

.state-input {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
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

.bar-chart {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  min-height: 220px;
}

.bar-chart__item {
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: 8px;
  min-width: 0;
  text-align: center;

  strong {
    font-size: 14px;
    color: #2d4056;
  }

  span {
    font-size: 13px;
    color: #60748c;
  }
}

.bar-chart__track {
  position: relative;
  min-height: 160px;
  overflow: hidden;
  background: #eef1f5;
  border-radius: 8px;
}

.bar-chart__bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: block;
  background: linear-gradient(180deg, #4aa3ff 0%, #2f6fed 100%);
  border-radius: 8px 8px 0 0;
}

@media (width <= 560px) {
  .bar-chart {
    gap: 8px;
  }
}
</style>
