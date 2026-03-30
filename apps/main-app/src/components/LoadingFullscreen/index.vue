<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 延迟显示时间（毫秒） */
    delay?: number
    /** 关闭回调 */
    onClose?: () => void
  }>(),
  {
    delay: 0,
    onClose: undefined,
  },
)

const spinning = ref(false)
const transitionDuration = 0.2

let timer: ReturnType<typeof setTimeout> | null = null

const showSpinning = () => {
  timer = setTimeout(() => {
    spinning.value = true
  }, props.delay)
}
showSpinning()

const close = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  spinning.value = false
  // 等待动画结束
  setTimeout(() => {
    props.onClose?.()
  }, transitionDuration * 1000)
}

onUnmounted(close)

defineExpose({ close })
</script>

<template>
  <div
    class="mask mask--fullscreen"
    :class="{ 'mask--visible': spinning }"
    :style="{ '--transition-duration': `${transitionDuration}s` }"
  >
    <a-spin />
  </div>
</template>

<style lang="scss" scoped>
.mask--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  visibility: hidden;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background-color: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: all var(--transition-duration);
}

.mask--visible {
  visibility: visible;
  opacity: 1;
}
</style>
