<template>
  <a-tooltip
    v-model:open="open"
    placement="bottom"
    color="#fff"
    destroy-tooltip-on-hide
    trigger="click"
    :overlay-inner-style="{ padding: '8px 4px' }"
  >
    <div class="multilanguage-trigger">
      <SvgIcon name="multilanguage" />
      <span class="mx-1 text-[12px]">{{ localeDic[localeKey] }}</span>
      <SvgIcon name="arrow-down" size="small" />
    </div>

    <template #title>
      <div class="flex flex-col">
        <span
          v-for="(item, key) in localeDic"
          :key="key"
          class="multilanguage-item"
          @click="switchMultilanguage(key)"
        >
          {{ item }}
        </span>
      </div>
    </template>
  </a-tooltip>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'

// 字典
const localeDic = {
  en: 'English',
  hk: '中文繁體',
  cn: '中文简体',
} as const

type LocaleKey = keyof typeof localeDic

const open = ref(false)
const localeKey = ref<LocaleKey>('en')

const switchMultilanguage = (key: LocaleKey) => {
  localeKey.value = key
  open.value = false
}
</script>

<style lang="scss" scoped>
@reference "tailwindcss";

.multilanguage-trigger {
  @apply flex items-center py-1 pr-2 pl-1 rounded-full cursor-pointer;

  color: rgb(22 35 61 / 65%);
  background: rgb(61 109 204 / 6%);
}

.multilanguage-item {
  @apply w-24 leading-8 text-center cursor-pointer rounded-lg;

  color: rgb(22 35 61 / 95%);

  &:hover {
    background: rgb(22 35 61 / 4%);
  }
}
</style>
