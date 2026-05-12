<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const appName = import.meta.env.VITE_APP_NAME
</script>

<template>
  <div class="not-found">
    <h1>404 Not Found</h1>
    <p>应用：{{ appName }}</p>
    <p>路径：{{ route.fullPath }}</p>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.not-found h1 {
  font-size: 2rem;
  color: #d4380d;
}

.not-found p {
  color: #6b7280;
}
</style>
