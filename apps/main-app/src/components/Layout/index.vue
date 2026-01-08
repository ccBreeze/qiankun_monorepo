<template>
  <div class="root-view">
    <ConsoleHeader />

    <div class="console-layout">
      <ConsoleMenu />

      <div class="console-main">
        <div
          id="console-main"
          ref="consoleContainerRef"
          class="console-container"
        >
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ConsoleHeader from './ConsoleHeader/index.vue'
import ConsoleMenu from './ConsoleMenu/index.vue'

const route = useRoute()

const consoleContainerRef = ref()
watch(
  () => route.fullPath,
  () => {
    // 页面滚动条回到顶部
    consoleContainerRef.value.scrollTop = 0
  },
)
</script>

<style lang="scss" scoped>
@use './constant.scss' as *;

.root-view {
  height: 100vh;
  background: rgb(61 109 204 / 4%);

  .console-layout {
    display: flex;
    margin: 16px 0 24px;
    height: calc(100vh - $header-height - 16px - 24px);

    .console-main {
      flex: 1;
      margin: 0 24px;
      overflow: hidden;

      .console-container {
        margin-top: 16px;
        border-radius: 16px;
        height: calc(100% - $tabs-height - 16px);
        overflow: auto;
      }
    }
  }
}
</style>
