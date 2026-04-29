import { setupComponentsI18n } from '@breeze/components'
import type { App } from 'vue'

const localeModules = import.meta.glob('./**/*.json', {
  eager: true,
  import: 'default',
})

export const setupLocaleMessages = (app: App) =>
  setupComponentsI18n(app, localeModules)
