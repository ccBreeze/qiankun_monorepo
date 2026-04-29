import type { CreateLocaleMessagesOptions, I18nInstance } from './types'

type LocaleMessages = Record<string, Record<string, unknown>>

const JSON_EXT = '.json'

/**
 * 匹配语言目录
 *
 * @example './zh-CN/login.json' -> 'zh-CN'
 */
const LOCALE_MODULE_PATH_REGEX = /^\.\/([^/]+)\//

/**
 * 将 import.meta.glob 导入的多语言模块按语言目录整理成 vue-i18n messages。
 *
 * @example
 * 输入路径:
 * {
 *   './zh-CN/login.json': { title: '登录' },
 *   './zh-CN/menu.json': { home: '首页' },
 *   './en/login.json': { title: 'Login' }
 * }
 *
 * 返回结构:
 * {
 *   'zh-CN': {
 *     login: { title: '登录' },
 *     menu: { home: '首页' }
 *   },
 *   en: {
 *     login: { title: 'Login' }
 *   }
 * }
 */
export function createLocaleMessages(options: CreateLocaleMessagesOptions) {
  const {
    localeModules,
    assignLocaleMessage = ({ target, moduleKey, message }) => {
      if (target[moduleKey] !== undefined) {
        console.warn(`[Breeze i18n] 语言模块 ${moduleKey} 重复，已被覆盖`)
      }
      target[moduleKey] = message
    },
  } = options

  const localeMessages: LocaleMessages = {}

  for (const [path, message] of Object.entries(localeModules)) {
    const locale = path.match(LOCALE_MODULE_PATH_REGEX)?.[1]
    if (!locale || !message) continue
    if (!path.endsWith(JSON_EXT)) continue

    const moduleKey = path.replace(`./${locale}/`, '').replace(/\.json$/, '')

    const target = (localeMessages[locale] ??= {})
    assignLocaleMessage({ target, moduleKey, message })
  }

  return localeMessages
}

/** 把一组按 locale 分桶的 messages 合并进已创建的 i18n 实例。 */
export function mergeLocaleMessages(
  instance: I18nInstance,
  localeMessages: LocaleMessages,
): void {
  for (const [locale, messages] of Object.entries(localeMessages)) {
    instance.global.mergeLocaleMessage(locale, messages)
  }
}
