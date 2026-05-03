import { setupComponentsI18n } from '@breeze/components'
import type { I18nInstance } from '@breeze/i18n'
import type { App } from 'vue'

const localeModules = import.meta.glob('./**/*.json', {
  eager: true,
  import: 'default',
})

export let i18n: I18nInstance

export const setupLocaleMessages = (app: App) => {
  i18n = setupComponentsI18n(app, localeModules)
  return i18n
}
