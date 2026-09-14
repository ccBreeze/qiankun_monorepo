<script setup lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import {
  ClearOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'

defineOptions({
  name: 'MemoryLeak-EventListener',
})

type DemoMode = 'leak' | 'cleanup'

const retainedListeners = new Set<(event: Event) => void>()
const retainedListenerCount = ref(0)
const resizeCallbackCount = ref(0)

const syncRetainedListenerCount = (): void => {
  retainedListenerCount.value = retainedListeners.size
}

const releaseRetainedListeners = (): void => {
  retainedListeners.forEach((listener) => {
    window.removeEventListener('resize', listener)
  })
  retainedListeners.clear()
  syncRetainedListenerCount()
}

const EventListenerFixture = defineComponent({
  name: 'MemoryLeak-EventListenerFixture',
  props: {
    leakMode: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const payload = Array.from({ length: 256000 }, (_, index) => index)
    const handleResize = (): void => {
      if (payload.length > 0) resizeCallbackCount.value += 1
    }

    onMounted(() => {
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      if (props.leakMode) {
        retainedListeners.add(handleResize)
      } else {
        window.removeEventListener('resize', handleResize)
      }
      syncRetainedListenerCount()
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

const triggerResize = (): void => {
  window.dispatchEvent(new Event('resize'))
}

onUnmounted(() => {
  releaseRetainedListeners()
})
</script>

<template>
  <main class="memory-lab">
    <div class="memory-lab__content">
      <header class="memory-lab__header">
        <div>
          <p class="memory-lab__eyebrow">Memory / Event Listeners</p>
          <h1>全局事件监听未清理</h1>
          <p class="memory-lab__summary">
            子实例在销毁时保留或移除
            <code>window.resize</code>
            监听器，用于观察闭包如何继续持有业务数据。
          </p>
        </div>
        <div
          class="memory-lab__status"
          :class="{ 'is-running': isFixtureMounted }"
        >
          {{ isFixtureMounted ? '测试实例运行中' : '测试实例已销毁' }}
        </div>
      </header>

      <section class="memory-lab__workspace" aria-label="事件监听实验控制">
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
              销毁测试实例
            </a-button>
            <a-button @click="triggerResize">
              <template #icon><ThunderboltOutlined /></template>
              触发 resize
            </a-button>
            <a-button
              :disabled="retainedListenerCount === 0"
              @click="releaseRetainedListeners"
            >
              <template #icon><ClearOutlined /></template>
              释放演示残留
            </a-button>
          </div>
        </div>

        <dl class="memory-lab__metrics">
          <div>
            <dt>本次销毁策略</dt>
            <dd>{{ activeModeLabel }}</dd>
          </div>
          <div>
            <dt>未清理 resize 监听</dt>
            <dd>{{ retainedListenerCount }}</dd>
          </div>
          <div>
            <dt>回调触发次数</dt>
            <dd>{{ resizeCallbackCount }}</dd>
          </div>
        </dl>
      </section>

      <section class="memory-lab__evidence" aria-label="排查线索">
        <div>
          <span class="memory-lab__label">Console</span>
          <code>getEventListeners(window).resize</code>
        </div>
        <div>
          <span class="memory-lab__label">Memory</span>
          <span
            >强制 GC 后搜索 <code>EventListenerFixture</code> 或
            <code>Array</code></span
          >
        </div>
        <div>
          <span class="memory-lab__label">Retainers</span>
          <span>检查 <code>Window</code> 的事件监听引用链</span>
        </div>
      </section>
    </div>

    <EventListenerFixture
      v-if="isFixtureMounted"
      :key="fixtureKey"
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
    display: block;
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
