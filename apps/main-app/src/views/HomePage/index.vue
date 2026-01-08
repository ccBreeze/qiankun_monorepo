<template>
  <Layout>
    <MicroApp />
  </Layout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import Layout from '@/components/Layout/index.vue'
import MicroApp from '../MicroApp/index.vue'

defineOptions({
  name: 'HomePage',
})

const menuStore = useMenuStore()

// 初始化菜单
onMounted(() => {
  menuStore.initMenu('/crm')
})
</script>
