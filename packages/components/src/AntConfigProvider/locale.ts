import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import dayjs from 'dayjs'
import enUS from 'ant-design-vue/es/locale/en_US'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import type { Locale } from 'ant-design-vue/es/locale'
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

const ANTD_LOCALE_MAP: Record<string, Locale> = {
  'zh-CN': zhCN,
  en: enUS,
}

const DAYJS_LOCALE_MAP: Record<string, string> = {
  'zh-CN': 'zh-cn',
  en: 'en',
}

export function useAntdLocale() {
  const { locale } = useI18n({ useScope: 'global' })

  const antdLocale = ref<Locale>()

  watchEffect(() => {
    dayjs.locale(DAYJS_LOCALE_MAP[locale.value])
    antdLocale.value = ANTD_LOCALE_MAP[locale.value]
  })

  return {
    antdLocale,
  }
}
