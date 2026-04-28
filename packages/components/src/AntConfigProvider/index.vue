<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue'
import themeToken from './theme/token/default.json'
import { ensureGlobalStyle } from './globalStyle'

ensureGlobalStyle()
</script>

<template>
  <ConfigProvider componentSize="large" :theme="themeToken">
    <slot></slot>
  </ConfigProvider>
</template>
