<script setup lang="ts">
import { onUnmounted } from 'vue'
import { modalStore, resetModalStore } from './modalStore'

onUnmounted(() => {
  resetModalStore()
})
</script>

<template>
  <Teleport to="body">
    <component
      :is="instance.component"
      v-for="instance in modalStore.values()"
      :key="instance.id"
      v-bind="instance.props"
    />
  </Teleport>
</template>
