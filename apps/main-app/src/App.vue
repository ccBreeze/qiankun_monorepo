<template>
  <AntConfigProvider>
    <router-view v-slot="{ Component }">
      <keep-alive include="HomePage">
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <ModalContainer />
  </AntConfigProvider>
</template>

<script setup lang="ts">
import { AntConfigProvider, ModalContainer } from '@breeze/components'
import { setupRuntimeChannels } from '@/utils/channel'

setupRuntimeChannels()
</script>
