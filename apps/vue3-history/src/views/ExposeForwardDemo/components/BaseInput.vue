<script lang="ts">
export interface DemoInputProps {
  modelValue?: string
  label?: string
  helperText?: string
}

export interface DemoInputExpose {
  focus: () => void
  clear: () => void
  getValue: () => string
}
</script>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DemoInputProps>(), {
  modelValue: '',
  label: '',
  helperText: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const updateValue = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  emit('change', value)
}

const focus = () => {
  inputRef.value?.focus()
}

const clear = () => {
  emit('update:modelValue', '')
  emit('change', '')
  focus()
}

const getValue = () => props.modelValue

defineExpose<DemoInputExpose>({
  focus,
  clear,
  getValue,
})
</script>

<template>
  <label class="base-input">
    <span v-if="label" class="base-input__label">{{ label }}</span>
    <span class="base-input__control">
      <slot name="prefix" />
      <input
        ref="inputRef"
        class="base-input__native"
        :value="modelValue"
        v-bind="$attrs"
        @input="updateValue"
      />
      <slot name="suffix" />
    </span>
    <span v-if="helperText" class="base-input__helper">{{ helperText }}</span>
    <slot name="footer" :value="modelValue" />
  </label>
</template>

<style scoped lang="scss">
.base-input {
  display: grid;
  gap: 8px;
}

.base-input__label {
  font-size: 13px;
  font-weight: 600;
  color: #213547;
}

.base-input__control {
  display: flex;
  gap: 8px;
  align-items: center;
  width: min(100%, 520px);
  min-height: 40px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #cad7e6;
  border-radius: 8px;
}

.base-input__native {
  flex: 1;
  min-width: 0;
  height: 38px;
  font-size: 14px;
  color: #1f2d3d;
  outline: none;
  border: 0;
}

.base-input__helper {
  font-size: 12px;
  color: #64748b;
}
</style>
