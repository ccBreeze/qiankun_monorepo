import { initI18n, createLocaleMessages } from '@breeze/i18n'
import type { App } from 'vue'
import { configureModalApp } from '../Modal/render'

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
 * 应用级 i18n 一站式装配：
 * 1. 创建 vue-i18n 实例并合并组件包语言包（baseMessages）
 * 2. 把 i18n 注册到命令式 Modal 的独立 app 上（让 Modal.open() 弹窗也能拿到翻译）
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
  configureModalApp((subApp) => subApp.use(i18n))
  return i18n
}
