import type { App } from 'vue'
import { createI18n as createVueI18n } from 'vue-i18n'
import { createLocaleMessages, mergeLocaleMessages } from './localeMessages'
import { DEFAULT_LOCALE, I18N_LOCALE_STORAGE_KEY } from './constants'
import type { CreateLocaleMessagesOptions, I18nInstance } from './types'

type LocaleMessages = Record<string, Record<string, unknown>>

type InitI18nOptions = CreateLocaleMessagesOptions & {
  app: App
  /** 应用启动前预置的 messages，会先于 localeModules 注入（如三方包语言包） */
  baseMessages?: LocaleMessages
}

/** 初始化应用级 i18n。 */
export function initI18n({
  app,
  baseMessages,
  ...options
}: InitI18nOptions): I18nInstance {
  const i18n: I18nInstance = createVueI18n({
    legacy: false,
    locale: localStorage.getItem(I18N_LOCALE_STORAGE_KEY) || DEFAULT_LOCALE,
    fallbackLocale: [DEFAULT_LOCALE, 'en'],
    // 初始 messages 由后续 mergeLocaleMessage 增量补齐
    messages: {} as Record<string, never>,
  })

  if (baseMessages) {
    mergeLocaleMessages(i18n, baseMessages)
  }
  mergeLocaleMessages(i18n, createLocaleMessages(options))

  app.use(i18n)
  return i18n
}
