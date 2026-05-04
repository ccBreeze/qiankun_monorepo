<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue'
import themeToken from './theme/token/default.json'
import { ensureGlobalStyle } from './globalStyle'
import { useAntdLocale } from './locale'

ensureGlobalStyle()

const { antdLocale } = useAntdLocale()
</script>

<template>
  <ConfigProvider
    componentSize="large"
    :theme="themeToken"
    :locale="antdLocale"
  >
    <slot></slot>
  </ConfigProvider>
</template>
