<template>
  <div class="root-view">
    <ConsoleHeader />

    <div class="console-layout">
      <ConsoleMenu />

      <div class="console-main">
        <ConsoleTabs />
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
import ConsoleTabs from './ConsoleTabs/index.vue'

const route = useRoute()

const consoleContainerRef = ref()

watch(
  () => route.fullPath,
  () => {
    // 页面滚动条回到顶部
    if (consoleContainerRef.value) {
      consoleContainerRef.value.scrollTop = 0
    }
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
    height: calc(100vh - $header-height - 16px - 24px);
    margin: 16px 0 24px;

    .console-main {
      flex: 1;
      margin: 0 24px;
      overflow: hidden;

      .console-container {
        height: calc(100% - $tabs-height - 16px);
        margin-top: 16px;
        overflow: auto;
        border-radius: 16px;
      }
    }
  }
}
</style>
