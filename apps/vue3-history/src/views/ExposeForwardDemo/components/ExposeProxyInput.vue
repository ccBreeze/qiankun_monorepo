<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  h,
  useAttrs,
  type ComponentInternalInstance,
  type ComponentPublicInstance,
} from 'vue'
import BaseInput, {
  type DemoInputExpose,
  type DemoInputProps,
} from './BaseInput.vue'

type ExposedMutableInstance = ComponentInternalInstance & {
  exposed: unknown
  exposeProxy: unknown
}

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const props = defineProps<Partial<DemoInputProps>>()

// 扩展方法
const extraExpose = {
  validate() {
    return true
  },
}

// 转发暴露的全部属性
const vm = getCurrentInstance() as ExposedMutableInstance | null
const changeRef = (inputInstance: Element | ComponentPublicInstance | null) => {
  if (!vm) return
  vm.exposeProxy = vm.exposed = {
    ...((inputInstance as DemoInputExpose | null) || {}),
    ...extraExpose,
  }
}

const passthroughProps = computed(() => ({
  ...attrs,
  ...props,
  ref: changeRef,
}))
</script>

<template>
  <component :is="h(BaseInput, passthroughProps, $slots)" />
</template>
