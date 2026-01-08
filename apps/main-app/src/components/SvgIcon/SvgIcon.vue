<template>
  <svg aria-hidden="true" class="svg-icon">
    <use :href="symbolId" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  prefix: {
    type: String,
    default: 'icon',
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: 'large',
  },
})

const symbolId = computed(() => `#${props.prefix}-${props.name}`)

const sizeMap: Record<string, number> = {
  small: 12,
  medium: 16,
  large: 24,
  extraLarge: 32,
}
const width = computed(() => {
  const size = typeof props.size === 'number' ? props.size : sizeMap[props.size]
  return `${size}px`
})
</script>

<style scoped lang="scss">
.svg-icon {
  width: v-bind(width);
  height: v-bind(width);
  vertical-align: middle;

  &:focus {
    outline: none;
  }
}
</style>
