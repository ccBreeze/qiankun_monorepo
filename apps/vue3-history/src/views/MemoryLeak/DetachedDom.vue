<script setup lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import {
  ClearOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons-vue'

defineOptions({
  name: 'MemoryLeak-DetachedDom',
})

type DemoMode = 'leak' | 'cleanup'

const retainedNodes = new Set<HTMLDivElement>()
const retainedNodeCount = ref(0)

const syncRetainedNodeCount = (): void => {
  retainedNodeCount.value = retainedNodes.size
}

const releaseRetainedNodes = (): void => {
  retainedNodes.clear()
  syncRetainedNodeCount()
}

const createDomTree = (fixtureId: number): HTMLDivElement => {
  const root = document.createElement('div')
  const fragment = document.createDocumentFragment()

  root.className = 'memory-leak-detached-node'
  root.hidden = true
  root.dataset.fixtureId = String(fixtureId)

  for (let index = 0; index < 1200; index += 1) {
    const item = document.createElement('span')
    item.textContent = `memory-leak-fixture-${fixtureId}-${index}`
    fragment.append(item)
  }

  root.append(fragment)
  document.body.append(root)
  return root
}

const DetachedDomFixture = defineComponent({
  name: 'MemoryLeak-DetachedDomFixture',
  props: {
    fixtureId: {
      type: Number,
      required: true,
    },
    leakMode: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    let root: HTMLDivElement | null = null

    onMounted(() => {
      root = createDomTree(props.fixtureId)
    })

    onUnmounted(() => {
      root?.remove()
      if (root && props.leakMode) retainedNodes.add(root)
      root = null
      syncRetainedNodeCount()
    })

    return () => null
  },
})

const mode = ref<DemoMode>('leak')
const activeMode = ref<DemoMode>('leak')
const isFixtureMounted = ref(false)
const fixtureKey = ref(0)
const modeOptions = [
  { label: '制造泄露', value: 'leak' },
  { label: '正确清理', value: 'cleanup' },
]

const activeModeLabel = computed(() =>
  activeMode.value === 'leak' ? '制造泄露' : '正确清理',
)

const mountFixture = (): void => {
  activeMode.value = mode.value
  fixtureKey.value += 1
  isFixtureMounted.value = true
}

const unmountFixture = (): void => {
  isFixtureMounted.value = false
}

onUnmounted(() => {
  releaseRetainedNodes()
})
</script>

<template>
  <main class="memory-lab">
    <div class="memory-lab__content">
      <header class="memory-lab__header">
        <div>
          <p class="memory-lab__eyebrow">Memory / Detached DOM</p>
          <h1>脱离 DOM 节点仍被引用</h1>
          <p class="memory-lab__summary">
            子实例创建 1,200 个 DOM
            节点，销毁时先从文档移除；泄露模式会额外保留根节点引用，形成可在
            Heap Snapshot 中追踪的 Detached DOM。
          </p>
        </div>
        <div
          class="memory-lab__status"
          :class="{ 'is-running': isFixtureMounted }"
        >
          {{ isFixtureMounted ? '测试实例运行中' : '测试实例已销毁' }}
        </div>
      </header>

      <section class="memory-lab__workspace" aria-label="脱离 DOM 实验控制">
        <div class="memory-lab__controls">
          <span class="memory-lab__label">销毁策略</span>
          <a-segmented
            v-model:value="mode"
            :disabled="isFixtureMounted"
            :options="modeOptions"
          />
          <div class="memory-lab__actions">
            <a-button
              type="primary"
              :disabled="isFixtureMounted"
              @click="mountFixture"
            >
              <template #icon><PlayCircleOutlined /></template>
              挂载测试实例
            </a-button>
            <a-button
              danger
              :disabled="!isFixtureMounted"
              @click="unmountFixture"
            >
              <template #icon><DeleteOutlined /></template>
              移除 DOM 并销毁
            </a-button>
            <a-button
              :disabled="retainedNodeCount === 0"
              @click="releaseRetainedNodes"
            >
              <template #icon><ClearOutlined /></template>
              释放脱离节点引用
            </a-button>
          </div>
        </div>

        <dl class="memory-lab__metrics">
          <div>
            <dt>本次销毁策略</dt>
            <dd>{{ activeModeLabel }}</dd>
          </div>
          <div>
            <dt>保留的根节点</dt>
            <dd>{{ retainedNodeCount }}</dd>
          </div>
          <div>
            <dt>单实例节点数量</dt>
            <dd>1,200</dd>
          </div>
        </dl>
      </section>

      <section class="memory-lab__evidence" aria-label="排查线索">
        <div>
          <span class="memory-lab__label">Memory</span>
          <span
            >强制 GC 后筛选 <code>Detached</code> 或
            <code>memory-leak-detached-node</code></span
          >
        </div>
        <div>
          <span class="memory-lab__label">Comparison</span>
          <span>重复挂载、移除后，对比两次 Heap Snapshot 的增量</span>
        </div>
        <div>
          <span class="memory-lab__label">Retainers</span>
          <span>从脱离节点回溯到模块级 <code>Set</code> 的持有关系</span>
        </div>
      </section>
    </div>

    <DetachedDomFixture
      v-if="isFixtureMounted"
      :key="fixtureKey"
      :fixtureId="fixtureKey"
      :leakMode="activeMode === 'leak'"
    />
  </main>
</template>

<style lang="scss" scoped>
.memory-lab {
  min-height: 100%;
  padding: 24px;
  color: #1f2937;
  background: #f6f8fb;
}

.memory-lab__content {
  max-width: 1180px;
  margin: 0 auto;
}

.memory-lab__header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px 0 24px;
  border-bottom: 1px solid #dbe2ea;

  h1 {
    margin: 4px 0 10px;
    font-size: 28px;
    line-height: 1.25;
    letter-spacing: 0;
  }
}

.memory-lab__eyebrow,
.memory-lab__label {
  display: block;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0;
}

.memory-lab__eyebrow {
  color: #2563eb;
}

.memory-lab__summary {
  max-width: 720px;
  margin: 0;
  line-height: 1.7;
  color: #4b5563;
}

.memory-lab__status {
  flex: 0 0 auto;
  padding: 6px 10px;
  font-size: 13px;
  color: #64748b;
  background: #eef2f7;
  border: 1px solid #dbe2ea;
  border-radius: 4px;

  &.is-running {
    color: #166534;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }
}

.memory-lab__workspace {
  margin-top: 20px;
  background: #fff;
  border: 1px solid #dbe2ea;
}

.memory-lab__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  align-items: center;
  padding: 18px 20px;
}

.memory-lab__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.memory-lab__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid #e5e7eb;

  div {
    padding: 14px 20px;
    border-right: 1px solid #e5e7eb;

    &:last-child {
      border-right: 0;
    }
  }

  dt {
    font-size: 12px;
    color: #6b7280;
  }

  dd {
    margin: 6px 0 0;
    font-size: 22px;
    font-weight: 600;
    color: #111827;
  }
}

.memory-lab__evidence {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 20px;
  overflow: hidden;
  background: #cbd5e1;
  border: 1px solid #cbd5e1;

  div {
    min-width: 0;
    padding: 16px 18px;
    background: #f8fafc;
  }

  code {
    display: inline;
    margin-top: 6px;
    overflow-wrap: anywhere;
    color: #0f766e;
  }
}

@media (max-width: 720px) {
  .memory-lab {
    padding: 18px;
  }

  .memory-lab__header {
    flex-direction: column;
  }

  .memory-lab__metrics,
  .memory-lab__evidence {
    grid-template-columns: 1fr;
  }

  .memory-lab__metrics div {
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;

    &:last-child {
      border-bottom: 0;
    }
  }
}
</style>
