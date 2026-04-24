<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useKeepAlive, useTabRemoveListener } from '@breeze/bridge-vue'
import { microAppContext } from '@/utils/microAppContext'

const route = useRoute()
const { include, wrapKeepAliveComponent, removeTab } =
  useKeepAlive(microAppContext)

useTabRemoveListener(microAppContext, removeTab)
</script>

<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive :include="include">
      <component
        :is="wrapKeepAliveComponent(Component)"
        :key="route.fullPath"
      />
    </KeepAlive>
  </RouterView>
</template>
