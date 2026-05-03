<template>
  <a-tooltip
    v-model:open="open"
    placement="bottom"
    color="#fff"
    destroyTooltipOnHide
    trigger="click"
    :overlayInnerStyle="{ padding: '8px 4px' }"
  >
    <div class="multilanguage-trigger">
      <SvgIcon name="multilanguage" />
      <span class="mx-1 text-[12px]">{{ localeDic[locale] }}</span>
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
import { useI18n } from 'vue-i18n'
import { I18N_LOCALE_STORAGE_KEY } from '@breeze/i18n'
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'
import { emitLocaleChange } from '@/utils/channel'

const { locale } = useI18n({ useScope: 'global' })

const localeDic: Record<string, string> = {
  en: 'English',
  'zh-CN': '中文简体',
}

const open = ref(false)

const switchMultilanguage = (key: string) => {
  locale.value = key
  localStorage.setItem(I18N_LOCALE_STORAGE_KEY, key)
  emitLocaleChange({ locale: key })
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
