<script setup lang="ts">
import { type Component } from 'vue'

defineOptions({
  name: 'ComponentLazyDemo',
})

type TabKey = 'summary' | 'audit' | 'chart'

interface LazyTab {
  key: TabKey
  label: string
  component: Component
}

const defaultTab: LazyTab = {
  key: 'summary',
  label: '总览',
  component: defineAsyncComponent(() => import('./Panels/SummaryPanel.vue')),
}

const tabs: LazyTab[] = [
  defaultTab,
  {
    key: 'audit',
    label: '审计',
    component: defineAsyncComponent(() => import('./Panels/AuditPanel.vue')),
  },
  {
    key: 'chart',
    label: '趋势',
    component: defineAsyncComponent(() => import('./Panels/ChartPanel.vue')),
  },
]

const activeKey = ref<TabKey>('summary')
const activeTab = computed<LazyTab>(
  () => tabs.find((tab) => tab.key === activeKey.value) ?? defaultTab,
)

const AsyncDemoModal = defineAsyncComponent(
  () => import('./Modals/AsyncDemoModal.vue'),
)

const directVisible = ref(false)
const stagedMounted = ref(false)
const stagedVisible = ref(false)
const directAfterCloseCount = ref(0)
const stagedAfterCloseCount = ref(0)
let resolveStagedReady: (() => void) | undefined

const openDirectModal = () => {
  directVisible.value = true
}

const openStagedModal = async () => {
  if (stagedMounted.value) return

  stagedMounted.value = true
  await new Promise<void>((resolve) => {
    resolveStagedReady = resolve
  })
  await nextTick()
  stagedVisible.value = true
}

const handleDirectAfterClose = () => {
  directAfterCloseCount.value += 1
}

const handleStagedAfterClose = () => {
  stagedAfterCloseCount.value += 1
  stagedMounted.value = false
}

const handleStagedMounted = () => {
  resolveStagedReady?.()
  resolveStagedReady = undefined
}
</script>

<template>
  <main class="component-lazy-demo">
    <h1>组件懒加载 Demo</h1>

    <section class="tabs-panel">
      <div class="tabs-panel__nav" role="tablist" aria-label="懒加载组件 tab">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tabs-panel__button"
          :class="{ 'tabs-panel__button--active': tab.key === activeKey }"
          type="button"
          role="tab"
          :aria-selected="tab.key === activeKey"
          @click="activeKey = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tabs-panel__body">
        <KeepAlive>
          <component :is="activeTab.component" :key="activeTab.key" />
        </KeepAlive>
      </div>
    </section>

    <section class="modal-panel">
      <h2>异步弹窗卸载时机验证</h2>
      <div class="modal-panel__grid">
        <article class="modal-case">
          <h3>直接 v-if</h3>
          <p>关闭时组件会立刻卸载，关闭过渡可能被打断。</p>
          <button type="button" @click="openDirectModal">打开弹窗</button>
          <span>after-close 次数：{{ directAfterCloseCount }}</span>
        </article>

        <article class="modal-case">
          <h3>mounted + visible</h3>
          <p>先播放关闭过渡，after-close 后再卸载组件。</p>
          <button type="button" @click="openStagedModal">打开弹窗</button>
          <span>after-close 次数：{{ stagedAfterCloseCount }}</span>
        </article>
      </div>
    </section>

    <AsyncDemoModal
      v-if="directVisible"
      v-model:open="directVisible"
      title="直接 v-if 弹窗"
      @afterClose="handleDirectAfterClose"
    />
    <AsyncDemoModal
      v-if="stagedMounted"
      v-model:open="stagedVisible"
      title="保留动画弹窗"
      @afterClose="handleStagedAfterClose"
      @vue:mounted="handleStagedMounted"
    />
  </main>
</template>

<style lang="scss" scoped>
.component-lazy-demo {
  min-height: 100vh;
  padding: 24px;
  color: #18324c;
  background: #f3f6fa;

  h1 {
    max-width: 820px;
    margin: 0 auto 18px;
    font-size: 24px;
  }
}

.tabs-panel {
  max-width: 820px;
  margin: 0 auto;
  overflow: hidden;
  background: #fff;
  border: 1px solid #dfe7f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(24 50 76 / 6%);

  &__nav {
    display: flex;
    gap: 8px;
    padding: 14px;
    background: #edf3fa;
    border-bottom: 1px solid #dfe7f0;
  }

  &__button {
    min-width: 84px;
    padding: 8px 14px;
    font-size: 14px;
    color: #41566e;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;

    &--active {
      color: #fff;
      background: #2f6fed;
      border-color: #2f6fed;
    }
  }

  &__body {
    min-height: 330px;
    padding: 22px;
  }
}

.modal-panel {
  max-width: 820px;
  padding: 20px;
  margin: 18px auto 0;
  background: #fff;
  border: 1px solid #dfe7f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(24 50 76 / 6%);

  h2 {
    margin: 0 0 14px;
    font-size: 18px;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
}

.modal-case {
  padding: 16px;
  background: #f7fbff;
  border: 1px solid #d8e8ff;
  border-radius: 8px;

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
  }

  p {
    min-height: 44px;
    margin: 0 0 14px;
    color: #5b7188;
  }

  button {
    padding: 8px 14px;
    margin-right: 12px;
    color: #fff;
    cursor: pointer;
    background: #2f6fed;
    border: 1px solid #2f6fed;
    border-radius: 6px;
  }

  span {
    display: inline-block;
    margin-top: 10px;
    font-size: 13px;
    color: #425b74;
  }
}

@media (width <= 560px) {
  .component-lazy-demo {
    padding: 14px;
  }

  .tabs-panel__body {
    padding: 16px;
  }

  .tabs-panel__nav {
    overflow-x: auto;
  }

  .modal-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>
