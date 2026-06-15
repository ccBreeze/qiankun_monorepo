<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  useHostLocaleSync,
  useKeepAlive,
  useTabRemoveListener,
} from '@breeze/bridge-vue'
import { AntConfigProvider, ModalContainer } from '@breeze/components'
import { microAppContext } from '@/utils/microAppContext'

const route = useRoute()
const { include, wrapKeepAliveComponent, removeTab } =
  useKeepAlive(microAppContext)

useTabRemoveListener(microAppContext, removeTab)
useHostLocaleSync()

// 将 antd 弹窗挂载到子应用根节点内，使弹窗内事件能冒泡到插件的 listener
const getPopupContainer = (): HTMLElement =>
  microAppContext.rootContainer ?? document.body
</script>

<template>
  <AntConfigProvider :getPopupContainer="getPopupContainer">
    <RouterView v-slot="{ Component }">
      <KeepAlive :include="include">
        <component
          :is="wrapKeepAliveComponent(Component)"
          :key="route.fullPath"
        />
      </KeepAlive>
    </RouterView>
    <ModalContainer />
  </AntConfigProvider>
</template>
