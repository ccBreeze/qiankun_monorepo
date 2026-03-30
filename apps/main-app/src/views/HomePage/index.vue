<template>
  <Layout>
    <MicroApp />
  </Layout>
</template>

<script setup lang="ts">
import Layout from '@/components/Layout/index.vue'
import MicroApp from '../MicroApp/index.vue'

defineOptions({
  name: 'HomePage',
})
</script>
