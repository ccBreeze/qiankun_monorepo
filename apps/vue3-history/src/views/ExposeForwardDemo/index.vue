<script setup lang="ts">
import { ref } from 'vue'
import ManualExposeInput from './components/ManualExposeInput.vue'
import ExposeProxyInput from './components/ExposeProxyInput.vue'
import type { DemoInputExpose } from './components/BaseInput.vue'

defineOptions({
  name: 'ExposeForwardDemo',
})

const manualValue = ref('defineExpose 手动转发')
const proxyValue = ref('修改 exposed / exposeProxy')
const manualInputRef = ref<DemoInputExpose | null>(null)
const proxyInputRef = ref<DemoInputExpose | null>(null)
const logs = ref<string[]>([])

const pushLog = (message: string) => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value = [`${time} ${message}`, ...logs.value].slice(0, 6)
}

const focusManual = () => {
  manualInputRef.value?.focus()
  pushLog('调用 defineExpose 手动转发的 focus()')
}

const clearManual = () => {
  manualInputRef.value?.clear()
  pushLog('调用 defineExpose 手动转发的 clear()')
}

const readManual = () => {
  pushLog(
    `defineExpose 手动转发 getValue(): ${manualInputRef.value?.getValue()}`,
  )
}

const focusProxy = () => {
  proxyInputRef.value?.focus()
  pushLog('调用 exposed / exposeProxy 透出的 focus()')
}

const clearProxy = () => {
  proxyInputRef.value?.clear()
  pushLog('调用 exposed / exposeProxy 透出的 clear()')
}

const readProxy = () => {
  pushLog(
    `exposed / exposeProxy getValue(): ${proxyInputRef.value?.getValue()}`,
  )
}
</script>

<template>
  <div class="expose-demo">
    <section class="hero">
      <p class="eyebrow">Vue3 二次封装组件</p>
      <h1>defineExpose 转发对比</h1>
      <p class="summary">
        两个案例都保留了属性透传、全部 slot 转发和 ref
        调用能力；区别在于第一个使用 defineExpose
        显式转发，第二个演示图片中直接修改组件实例 exposed / exposeProxy
        的写法。
      </p>
    </section>

    <section class="case-grid">
      <article class="case-card">
        <div class="case-card__header">
          <span class="case-card__badge">推荐</span>
          <h2>案例一：defineExpose 手动转发</h2>
        </div>
        <ManualExposeInput
          ref="manualInputRef"
          v-model="manualValue"
          label="手动转发输入框"
          helperText="外层组件拿内部 ref，再用 defineExpose 暴露稳定 API。"
          placeholder="请输入内容"
          @change="pushLog(`手动转发 change: ${$event}`)"
        >
          <template #prefix>
            <span class="slot-chip">prefix</span>
          </template>
          <template #suffix>
            <span class="slot-chip">suffix</span>
          </template>
          <template #footer="{ value }">
            <p class="slot-footer">footer slot 收到的值：{{ value }}</p>
          </template>
        </ManualExposeInput>

        <div class="actions">
          <button type="button" @click="focusManual">focus()</button>
          <button type="button" @click="clearManual">clear()</button>
          <button type="button" @click="readManual">getValue()</button>
        </div>
      </article>

      <article class="case-card">
        <div class="case-card__header">
          <span class="case-card__badge case-card__badge--warn">源码技巧</span>
          <h2>案例二：修改 exposed / exposeProxy</h2>
        </div>
        <ExposeProxyInput
          ref="proxyInputRef"
          v-model="proxyValue"
          label="内部实例替换输入框"
          helperText="外层组件通过 ref 访问时，被替换成内部组件暴露出的实例。"
          placeholder="请输入内容"
          @change="pushLog(`exposed / exposeProxy change: ${$event}`)"
        >
          <template #prefix>
            <span class="slot-chip">prefix</span>
          </template>
          <template #suffix>
            <span class="slot-chip">suffix</span>
          </template>
          <template #footer="{ value }">
            <p class="slot-footer">footer slot 收到的值：{{ value }}</p>
          </template>
        </ExposeProxyInput>

        <div class="actions">
          <button type="button" @click="focusProxy">focus()</button>
          <button type="button" @click="clearProxy">clear()</button>
          <button type="button" @click="readProxy">getValue()</button>
        </div>
      </article>
    </section>

    <section class="notes">
      <h2>对比说明</h2>
      <ul>
        <li>手动转发是稳定公共 API，适合项目里的二次封装组件。</li>
        <li>
          修改 exposed / exposeProxy 依赖 Vue
          内部实例字段，能模拟透传内部组件方法，但升级风险更高。
        </li>
        <li>
          如果只是控制状态，优先用
          props、emits、v-model；只有确实需要命令式调用时再暴露 ref API。
        </li>
      </ul>
    </section>

    <section class="logs">
      <h2>操作日志</h2>
      <p v-if="logs.length === 0">点击上方按钮后，这里会显示 ref 调用结果。</p>
      <p v-for="item in logs" :key="item">{{ item }}</p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.expose-demo {
  min-height: 100vh;
  padding: 28px;
  color: #1f2d3d;
  background: #f4f7fb;
}

.hero,
.case-card,
.notes,
.logs {
  max-width: 1180px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

.hero {
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 12px;
  font-size: 30px;
}

.summary {
  max-width: 860px;
  margin-bottom: 0;
  line-height: 1.8;
  color: #52657a;
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  max-width: 1180px;
  margin: 18px auto;
}

.case-card {
  display: grid;
  gap: 18px;
  padding: 22px;
}

.case-card__header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.case-card__header h2 {
  margin: 0;
  font-size: 18px;
}

.case-card__badge {
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
  background: #ccfbf1;
  border-radius: 999px;
}

.case-card__badge--warn {
  color: #a16207;
  background: #fef3c7;
}

.slot-chip {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
}

.slot-footer {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

button {
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  background: #2563eb;
  border: 0;
  border-radius: 6px;
}

.notes,
.logs {
  padding: 22px;
  margin-top: 18px;
}

.notes ul {
  display: grid;
  gap: 8px;
  padding-left: 18px;
  margin-bottom: 0;
  line-height: 1.7;
  color: #52657a;
}

.logs p {
  margin-bottom: 8px;
  color: #52657a;
}

@media (width <= 860px) {
  .case-grid {
    grid-template-columns: 1fr;
  }
}
</style>
