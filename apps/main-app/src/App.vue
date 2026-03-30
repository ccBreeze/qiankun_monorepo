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
import { useRouter } from 'vue-router'

import AntConfigProvider from './views/AntConfigProvider/index.vue'
import { useAuthStore } from '@/stores/auth'
import { LOGIN_PATH } from '@/constant'

const router = useRouter()
const authStore = useAuthStore()

// 刷新页面时，若无 token 则跳转登录页
if (!authStore.accessToken) {
  void router.replace(LOGIN_PATH)
}
</script>

<style>
body {
  overflow: hidden !important;
}
</style>
