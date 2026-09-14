<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import {
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons-vue'

defineOptions({
  name: 'MemoryLeak-AbortController',
})

let controller: AbortController | null = null

const signalAborted = ref<boolean | null>(null)
const statusMessage = ref('先初始化 controller，再移动鼠标观察控制台。')
const bindingAttempts = ref(0)

const addMousemoveListener = (): void => {
  if (!controller) {
    statusMessage.value = '当前没有 controller，请先点击初始化。'
    console.warn('[AbortSignal Demo] 请先初始化 controller')
    return
  }

  bindingAttempts.value += 1
  window.addEventListener('mousemove', (e) => console.log(e), {
    signal: controller.signal,
  })

  if (controller.signal.aborted) {
    statusMessage.value =
      '已尝试复用 aborted signal，但监听器不会生效；移动鼠标看不到新的 MouseEvent。'
    console.log(
      '[AbortSignal Demo] 第 %d 次 addEventListener 使用了已 aborted 的 signal，监听器无效',
      bindingAttempts.value,
    )
    return
  }

  statusMessage.value = '监听器已绑定。移动鼠标，控制台会输出 MouseEvent。'
  console.log(
    '[AbortSignal Demo] 第 %d 次 addEventListener 已绑定 mousemove 监听器',
    bindingAttempts.value,
  )
}

const initializeController = (): void => {
  controller?.abort()
  controller = new AbortController()
  signalAborted.value = false
  statusMessage.value = 'controller 已初始化，正在绑定 mousemove 监听器。'
  addMousemoveListener()
  console.log('[AbortSignal Demo] controller 已初始化', controller)
}

const abortController = (): void => {
  if (!controller) {
    statusMessage.value = '当前没有 controller，请先点击初始化。'
    console.warn('[AbortSignal Demo] 请先初始化 controller')
    return
  }

  controller.abort()
  signalAborted.value = true
  statusMessage.value =
    'controller.abort() 已调用。原监听器已移除，当前 signal 不可恢复。'
  console.log('[AbortSignal Demo] controller.abort() 已调用', controller)
}

const reuseSignal = (): void => {
  addMousemoveListener()
}

onUnmounted(() => {
  controller?.abort()
})
</script>

<template>
  <main class="abort-signal-demo">
    <section class="abort-signal-demo__content">
      <header class="abort-signal-demo__header">
        <p class="abort-signal-demo__eyebrow">Web API / AbortSignal</p>
        <h1>复用 AbortController signal</h1>
        <p>
          依次点击三个按钮，然后移动鼠标并观察浏览器控制台：第二次绑定使用的是同一个
          controller.signal。
        </p>
      </header>

      <pre
        class="abort-signal-demo__code"
      ><code>const controller = new AbortController()
window.addEventListener('mousemove', (e) =&gt; console.log(e), {
  signal: controller.signal,
})

controller.abort()

// 再次使用同一个 controller.signal
window.addEventListener('mousemove', (e) =&gt; console.log(e), {
  signal: controller.signal,
})</code></pre>

      <div class="abort-signal-demo__actions">
        <a-button type="primary" @click="initializeController">
          <template #icon><PlayCircleOutlined /></template>
          初始化并监听 mousemove
        </a-button>
        <a-button danger @click="abortController">
          <template #icon><StopOutlined /></template>
          controller.abort()
        </a-button>
        <a-button @click="reuseSignal">
          <template #icon><ReloadOutlined /></template>
          复用 signal 再监听
        </a-button>
      </div>

      <dl class="abort-signal-demo__status">
        <div>
          <dt>signal.aborted</dt>
          <dd :class="{ 'is-aborted': signalAborted }">
            {{ signalAborted === null ? '未初始化' : String(signalAborted) }}
          </dd>
        </div>
        <div>
          <dt>绑定尝试次数</dt>
          <dd>{{ bindingAttempts }}</dd>
        </div>
      </dl>

      <p class="abort-signal-demo__message" role="status">
        {{ statusMessage }}
      </p>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.abort-signal-demo {
  min-height: 100%;
  padding: 32px 24px;
  color: #1f2937;
  background: #f6f8fb;
}

.abort-signal-demo__content {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px;
  background: #fff;
  border: 1px solid #dbe2ea;
  border-radius: 6px;
}

.abort-signal-demo__header {
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;

  h1 {
    margin: 6px 0 10px;
    font-size: 28px;
    line-height: 1.3;
    letter-spacing: 0;
  }

  p:last-child {
    max-width: 680px;
    margin: 0;
    color: #64748b;
    line-height: 1.7;
  }
}

.abort-signal-demo__eyebrow {
  margin: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.abort-signal-demo__code {
  overflow-x: auto;
  margin: 20px 0;
  padding: 16px;
  color: #cbd5e1;
  background: #0f172a;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre;
}

.abort-signal-demo__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.abort-signal-demo__status {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 24px 0 0;

  div {
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }

  dt {
    color: #64748b;
    font-size: 12px;
  }

  dd {
    margin: 6px 0 0;
    color: #166534;
    font-size: 18px;
    font-weight: 700;

    &.is-aborted {
      color: #b91c1c;
    }
  }
}

.abort-signal-demo__message {
  margin: 16px 0 0;
  padding: 12px 14px;
  color: #475569;
  background: #f8fafc;
  border-left: 3px solid #2563eb;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .abort-signal-demo {
    padding: 16px;
  }

  .abort-signal-demo__content {
    padding: 20px;
  }

  .abort-signal-demo__status {
    grid-template-columns: 1fr;
  }
}
</style>
