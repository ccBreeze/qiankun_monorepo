import { initI18n, createLocaleMessages } from '@breeze/i18n'
import type { App } from 'vue'

/**
 * 收集组件包集中式语言包。
 *
 * @example
 * './zh-CN/Modal.json' -> messages.zh-CN.Modal
 */
const localeModules = import.meta.glob('./**/*.json', {
  eager: true,
  import: 'default',
})

export const componentBaseMessages = createLocaleMessages({
  localeModules,
})

/**
 * 应用级 i18n 一站式装配：创建 vue-i18n 实例并合并组件包语言包（baseMessages）。
 * 命令式 Modal（openModal）通过 Teleport 挂载在根 app 组件树中，自动继承此 i18n 实例。
 *
 * @param app           当前 vue 应用
 * @param localeModules 调用方使用 `import.meta.glob('./**\/*.json', { eager: true, import: 'default' })` 收集到的应用语言包
 */
export const setupComponentsI18n = (
  app: App,
  localeModules: Record<string, unknown>,
) => {
  const i18n = initI18n({
    app,
    localeModules,
    baseMessages: componentBaseMessages,
  })
  return i18n
}
