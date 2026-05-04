import { onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  RUNTIME_EVENTS,
  qiankunRuntime,
  type LocaleChangePayload,
} from '@breeze/runtime'

/** 监听主应用语言变更，并同步到当前 Vue 应用的全局 i18n locale。 */
export const useHostLocaleSync = () => {
  const { locale, availableLocales } = useI18n({ useScope: 'global' })

  const handleLocaleChange = ({ locale: nextLocale }: LocaleChangePayload) => {
    if (!availableLocales.includes(nextLocale)) {
      console.warn(
        `[Breeze i18n] 当前子应用未提供 ${nextLocale} 语言包，已忽略切换`,
      )
      return
    }
    locale.value = nextLocale
  }

  qiankunRuntime.channel.on(RUNTIME_EVENTS.LOCALE_CHANGE, handleLocaleChange)
  onUnmounted(() => {
    qiankunRuntime.channel.off(RUNTIME_EVENTS.LOCALE_CHANGE, handleLocaleChange)
  })
}
