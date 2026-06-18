<template>
  <div class="race-demo">
    <h2>Request 竞态防护 Demo</h2>
    <p class="desc">
      快速切换 Tab，旧请求响应不会覆盖最新数据。<br />
      关闭防护后可复现竞态 Bug：A→B→A 快速切换时，B 的响应可能覆盖 A 的数据。
    </p>

    <div class="controls">
      <label class="guard-toggle">
        <input v-model="enableGuard" type="checkbox" />
        启用竞态防护（withRaceGuard）
      </label>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
        <span class="delay-hint">{{ tab.delay }}ms</span>
      </button>
    </div>

    <div class="result">
      <div v-if="loading" class="loading">请求中...</div>
      <template v-else>
        <div class="data-row">
          <span class="label">当前 Tab：</span>
          <strong
            >{{ activeTab }} -
            {{ tabs.find((t) => t.key === activeTab)?.label }}</strong
          >
        </div>
        <div class="data-row">
          <span class="label">响应数据：</span>
          <strong :class="{ mismatch: isMismatch }">{{ result || '—' }}</strong>
          <span v-if="isMismatch" class="warn-badge">⚠ 竞态！数据不匹配</span>
        </div>
        <div class="data-row">
          <span class="label">请求次数：</span>{{ requestCount }}
        </div>
        <div class="data-row">
          <span class="label">防护取消：</span>{{ abortCount }} 次
        </div>
      </template>
    </div>

    <div class="log-panel">
      <div class="log-header">
        <strong>请求日志</strong>
        <button class="clear-btn" @click="logs = []">清空</button>
      </div>
      <ul class="log-list">
        <li v-for="(log, i) in logs" :key="i" :class="['log-item', log.type]">
          {{ log.msg }}
        </li>
        <li v-if="!logs.length" class="log-item empty">暂无日志</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createEnhanceRequest, type RequestConfig } from '@breeze/utils/request'
import { ref, computed } from 'vue'

interface Tab {
  key: string
  label: string
  delay: number
}

const tabs: Tab[] = [
  { key: 'A', label: '待我审批', delay: 1500 },
  { key: 'B', label: '我已处理', delay: 600 },
  { key: 'C', label: '我的申请', delay: 1000 },
]

const activeTab = ref('A')
const result = ref('')
const loading = ref(false)
const enableGuard = ref(true)
const requestCount = ref(0)
const abortCount = ref(0)
const logs = ref<Array<{ msg: string; type: string }>>([])

/** 检测数据是否与当前 tab 匹配（竞态时会不匹配） */
const isMismatch = computed(
  () => result.value !== '' && !result.value.startsWith(activeTab.value),
)

/** 模拟异步接口请求 */
const mockFetch = (
  tab: string,
  delay: number,
  config: RequestConfig,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => resolve(`${tab} 的数据（延迟 ${delay}ms）`),
      delay,
    )
    const addAbortListener = config.signal?.addEventListener
    addAbortListener?.call(
      config.signal,
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('AbortError', 'AbortError'))
      },
      { once: true },
    )
  })

const enhanceRequest = createEnhanceRequest({})

const requestTabData = (tab: Tab): Promise<string> => {
  const config: RequestConfig = {
    url: '/mock/request-race-demo',
    data: {
      actionName: 'RequestRaceDemo.queryTabData',
      content: {
        tab: tab.key,
      },
    },
    raceGuard: enableGuard.value,
    rawResponse: true,
  }

  return enhanceRequest(() => mockFetch(tab.key, tab.delay, config), config)
}

const addLog = (msg: string, type: string) => {
  logs.value.unshift({ msg, type })
  if (logs.value.length > 50) logs.value.pop()
}

const switchTab = async (key: string) => {
  const tab = tabs.find((t) => t.key === key)!
  activeTab.value = key
  loading.value = true
  requestCount.value++
  const reqId = requestCount.value

  addLog(`[#${reqId}] 发起请求 Tab=${key}，模拟延迟=${tab.delay}ms`, 'info')

  try {
    const data = await requestTabData(tab)
    result.value = data
    loading.value = false
    addLog(
      `[#${reqId}] ✓ 响应 Tab=${key}（${enableGuard.value ? '真实增强器防护' : '无防护'}，${isMismatch.value ? '已产生竞态！' : '未竞态'}）`,
      isMismatch.value ? 'warn' : 'success',
    )
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') {
      abortCount.value++
      addLog(
        `[#${reqId}] ✗ 被 withRaceGuard 取消 Tab=${key}（旧请求已丢弃）`,
        'abort',
      )
      if (activeTab.value === key) loading.value = false
      return
    }
    loading.value = false
    addLog(`[#${reqId}] 请求失败 Tab=${key}`, 'warn')
  }
}

switchTab('A')
</script>

<style scoped>
.race-demo {
  max-width: 680px;
  padding: 24px;
  font-size: 14px;
}

h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.desc {
  margin-bottom: 16px;
  line-height: 1.7;
  color: #666;
}

.controls {
  margin-bottom: 16px;
}

.guard-toggle {
  display: flex;
  gap: 6px;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tabs button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 6px 16px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.2s;
}

.tabs button:hover {
  color: #1677ff;
  border-color: #1677ff;
}

.tabs button.active {
  color: #fff;
  background: #1677ff;
  border-color: #1677ff;
}

.delay-hint {
  font-size: 11px;
  opacity: 0.7;
}

.result {
  min-height: 90px;
  padding: 16px;
  margin-bottom: 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.loading {
  color: #999;
}

.data-row {
  margin-bottom: 6px;
}

.label {
  margin-right: 4px;
  color: #888;
}

.mismatch {
  color: #f5222d;
}

.warn-badge {
  padding: 2px 6px;
  margin-left: 8px;
  font-size: 12px;
  color: #f5222d;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
}

.log-panel {
  overflow: hidden;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.clear-btn {
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.log-list {
  max-height: 220px;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.log-item {
  padding: 5px 12px;
  font-family: monospace;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.success {
  color: #52c41a;
}

.log-item.abort {
  color: #fa8c16;
}

.log-item.warn {
  color: #f5222d;
  background: #fff2f0;
}

.log-item.info {
  color: #1677ff;
}

.log-item.empty {
  padding: 16px;
  color: #bbb;
  text-align: center;
}
</style>
