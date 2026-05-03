import type { CreateLocaleMessagesOptions, I18nInstance } from './types'

type LocaleMessages = Record<string, Record<string, unknown>>
type LocaleMessageTarget = Record<string, unknown>

const JSON_EXT = '.json'

/**
 * 匹配语言目录
 *
 * @example './zh-CN/login.json' -> 'zh-CN'
 */
const LOCALE_MODULE_PATH_REGEX = /^\.\/([^/]+)\//

/**
 * 将带目录层级的 moduleKey 写入嵌套 messages。
 *
 * @example
 * moduleKey: 'views/Modal'
 * message: { page: { title: '标题' } }
 * localeMessages: { views: { Modal: { page: { title: '标题' } } } }
 */
const assignNestedLocaleMessage = (
  localeMessages: LocaleMessageTarget,
  moduleKey: string,
  message: unknown,
) => {
  const paths = moduleKey.split('/')
  const leafKey = paths.pop()
  if (!leafKey) return

  let parent = localeMessages
  for (const path of paths) {
    parent[path] ??= {}
    parent = parent[path] as LocaleMessageTarget
  }

  if (parent[leafKey] !== undefined) {
    console.warn(`[Breeze i18n] 语言模块 ${moduleKey} 重复，已被覆盖`)
  }
  parent[leafKey] = message
}

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
  const { localeModules } = options

  const localeMessages: LocaleMessages = {}

  for (const [path, message] of Object.entries(localeModules)) {
    const locale = path.match(LOCALE_MODULE_PATH_REGEX)?.[1]
    if (!locale || !message) continue
    if (!path.endsWith(JSON_EXT)) continue

    const moduleKey = path.replace(`./${locale}/`, '').replace(/\.json$/, '')

    const messages = (localeMessages[locale] ??= {})
    assignNestedLocaleMessage(messages, moduleKey, message)
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
