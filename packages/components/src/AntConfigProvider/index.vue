<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue'
import themeToken from './theme/token/default.json'
import { ensureGlobalStyle } from './globalStyle'
import { useAntdLocale } from './locale'

ensureGlobalStyle()

const { antdLocale } = useAntdLocale()

withDefaults(
  defineProps<{
    getPopupContainer?: (triggerNode?: HTMLElement) => HTMLElement
  }>(),
  { getPopupContainer: () => document.body },
)
</script>

<template>
  <ConfigProvider
    componentSize="large"
    :theme="themeToken"
    :locale="antdLocale"
    :get-popup-container="getPopupContainer"
  >
    <slot></slot>
  </ConfigProvider>
</template>
