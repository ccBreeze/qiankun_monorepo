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
    class="mask fullscreen"
    :class="{ 'fullscreen-show': spinning }"
    :style="{ '--transition-duration': `${transitionDuration}s` }"
  >
    <a-spin />
  </div>
</template>

<style lang="scss" scoped>
.mask {
  &.fullscreen {
    position: fixed;
    width: 100vw;
    height: 100vh;
    background-color: rgb(0 0 0 / 45%);
    z-index: 1000;
    inset: 0;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all var(--transition-duration);

    &.fullscreen-show {
      opacity: 1;
      visibility: visible;
    }
  }
}
</style>
