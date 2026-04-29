import { initI18n, createLocaleMessages } from '@breeze/i18n'
import type { App } from 'vue'
import { configureModalApp } from '../Modal/render'

const localeModules = import.meta.glob('./**/*.json', {
  eager: true,
  import: 'default',
})

/** 组件包语言包，统一挂到 package/ 命名空间下，避免与应用侧 key 冲突 */
export const componentBaseMessages = createLocaleMessages({
  localeModules,
  assignLocaleMessage({ target, moduleKey, message }) {
    target[`package/${moduleKey}`] = message
  },
})

/**
 * 应用级 i18n 一站式装配：
 * 1. 创建 vue-i18n 实例并合并组件包语言包
 * 2. 把 i18n 注册到命令式 Modal 的独立 app 上
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
