import type { createI18n } from 'vue-i18n'

export type I18nInstance = ReturnType<typeof createI18n>

/** 从 import.meta.glob 收集语言包后生成 locale messages 的配置。 */
export interface CreateLocaleMessagesOptions {
  localeModules: Record<string, unknown>
}
