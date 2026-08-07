<template>
  <AntConfigProvider>
    <router-view />
    <ModalContainer />
  </AntConfigProvider>
</template>

<script setup lang="ts">
import { AntConfigProvider, ModalContainer } from '@breeze/components'
import { setupRuntimeChannels } from '@/utils/channel'

setupRuntimeChannels()
</script>
