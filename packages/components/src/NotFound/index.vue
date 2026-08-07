<script setup lang="ts">
interface NotFoundProps {
  /** 应用显示名称 */
  appName?: string
  /** 当前未匹配的完整路径 */
  path?: string
}

const props = withDefaults(defineProps<NotFoundProps>(), {
  appName: '主应用',
  path: '-',
})
</script>

<template>
  <div class="not-found">
    <h1>404 Not Found</h1>
    <p>应用：{{ props.appName }}</p>
    <p>路径：{{ props.path }}</p>
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
