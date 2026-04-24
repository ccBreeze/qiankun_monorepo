<template>
  <AntConfigProvider>
    <router-view v-slot="{ Component }">
      <keep-alive include="HomePage">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </AntConfigProvider>
</template>

<script setup lang="ts">
import AntConfigProvider from './views/AntConfigProvider/index.vue'
import { setupRuntimeChannels } from '@/utils/channel'

setupRuntimeChannels()
</script>
