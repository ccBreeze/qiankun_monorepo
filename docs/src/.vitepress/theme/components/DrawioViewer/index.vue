<script setup lang="ts">
import { ref, toRef, onMounted, onBeforeUnmount } from 'vue'
import { useDrawioParser } from './useDrawioParser'

const props = defineProps<{
  /** drawio 文件路径（基于 public 目录） */
  src?: string
  /** 内联 XML 字符串（可配合 ?raw 导入） */
  data?: string
}>()

const { loading, aspectRatio, viewerUrl, loadContent } = useDrawioParser({
  src: toRef(props, 'src'),
  data: toRef(props, 'data'),
})

const fullscreen = ref(false)
const iframeReady = ref(false)

function openFullscreen() {
  iframeReady.value = false
  fullscreen.value = true
  document.body.style.overflow = 'hidden'
}

function closeFullscreen() {
  fullscreen.value = false
  document.body.style.overflow = ''
}

function onFullscreenIframeLoad() {
  iframeReady.value = true
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) closeFullscreen()
}

onMounted(() => {
  loadContent()
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="drawio-viewer">
    <div v-if="loading" class="drawio-loading">加载中...</div>
    <template v-else-if="viewerUrl">
      <!-- 预览 -->
      <div class="drawio-preview" @click="openFullscreen">
        <iframe
          :src="viewerUrl"
          class="drawio-iframe"
          :style="aspectRatio ? { aspectRatio } : undefined"
          frameborder="0"
          tabindex="-1"
        />
        <div class="drawio-overlay">
          <span class="drawio-hint">点击放大查看</span>
        </div>
      </div>

      <!-- 全屏浮层 -->
      <Teleport to="body">
        <Transition name="drawio-zoom">
          <div v-if="fullscreen" class="drawio-fullscreen">
            <div class="drawio-backdrop" @click="closeFullscreen" />
            <div class="drawio-wrapper">
              <iframe
                :src="viewerUrl"
                :class="[
                  'drawio-fullscreen-iframe',
                  { 'is-ready': iframeReady },
                ]"
                frameborder="0"
                allowfullscreen
                @load="onFullscreenIframeLoad"
              />
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </div>
</template>

<style scoped lang="scss">
$zoom-duration: 300ms;
$zoom-easing: cubic-bezier(0.2, 0, 0.2, 1);

.drawio-viewer {
  width: 100%;
  margin: 16px 0;
}

.drawio-preview {
  position: relative;
  overflow: hidden;
  cursor: zoom-in;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.drawio-iframe {
  width: 100%;
  min-height: 200px;
  pointer-events: none;
  background: #fff;
  border: none;
}

.drawio-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 12px;
  opacity: 0;
  transition: opacity 0.2s $zoom-easing;

  .drawio-preview:hover & {
    opacity: 1;
  }
}

.drawio-hint {
  padding: 4px 14px;
  font-size: 13px;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
}

/* 全屏容器 */
.drawio-fullscreen {
  position: fixed;
  inset: 0;
  z-index: var(--medium-zoom-z-index, 9999);
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawio-backdrop {
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0.92;
}

.drawio-wrapper {
  position: relative;
  width: 90vw;
  height: 90vh;
}

.drawio-fullscreen-iframe {
  width: 100%;
  height: 100%;
  background: #fff;
  border: none;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.3s $zoom-easing;

  &.is-ready {
    opacity: 1;
  }
}

.drawio-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--vp-c-text-2);
}

/* Vue Transition: 淡入淡出 */
.drawio-zoom-enter-active,
.drawio-zoom-leave-active {
  transition: opacity $zoom-duration $zoom-easing;

  .drawio-backdrop {
    transition: opacity $zoom-duration $zoom-easing;
  }

  .drawio-wrapper {
    transition: opacity $zoom-duration $zoom-easing;
  }
}

.drawio-zoom-enter-from,
.drawio-zoom-leave-to {
  opacity: 0;
}
</style>
