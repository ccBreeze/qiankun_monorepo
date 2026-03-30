<script setup lang="ts">
// 🎉 无需手动导入 ref, computed, watch 等 Vue API
const count = ref(0)
const doubled = computed(() => count.value * 2)

// 🎉 无需手动导入 Pinia 的 defineStore
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++
    },
  },
})

const store = useCounterStore()

// 🎉 生命周期钩子也无需导入
onMounted(() => {
  console.log('组件已挂载')
})

watch(count, (newValue) => {
  console.log('count 变化:', newValue)
})
</script>

<template>
  <div>
    <h2>自动导入示例</h2>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubled }}</p>
    <p>Store Count: {{ store.count }}</p>
    <button @click="count++">本地计数 +1</button>
    <button @click="store.increment()">Store 计数 +1</button>
  </div>
</template>
