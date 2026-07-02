<script setup lang="ts">
import { ref } from 'vue'
import BaseInput, {
  type DemoInputExpose,
  type DemoInputProps,
} from './BaseInput.vue'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<Partial<DemoInputProps>>()

// 手动转发暴露的属性
const innerRef = ref<DemoInputExpose | null>(null)
defineExpose<DemoInputExpose>({
  focus: () => innerRef.value?.focus(),
  clear: () => innerRef.value?.clear(),
  getValue: () => innerRef.value?.getValue() ?? '',
})
</script>

<template>
  <BaseInput ref="innerRef" v-bind="{ ...$attrs, ...props }">
    <!-- 遍历插槽 -->
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </BaseInput>
</template>
