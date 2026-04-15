<template>
  <div class="micro-container">
    <div
      v-for="app in microAppConfigs"
      v-show="app.name === activeMicroApp?.name"
      :id="app.container.slice(1)"
      :key="app.name"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMicroAppStore } from '@/stores/microApp'
import { installMicroAppAssetRuntime } from '@/utils/microApp/assetsPath'

const { activeMicroApp, microAppConfigs } = storeToRefs(useMicroAppStore())

installMicroAppAssetRuntime()
</script>

<style lang="scss" scoped>
.micro-container {
  height: 100%;

  & > :deep(div) {
    height: 100%;
  }
}
</style>
