import './assets/scss/index.scss'

import { createApp } from 'vue'
import type { App } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper'

import AppComponent from './App.vue'
import { generateRouter } from './router'
import {
  microAppContext,
  type QiankunLifecycleProps,
} from './utils/microAppContext'

let app: App | null = null
function renderApp() {
  app = createApp(AppComponent)
  const router = generateRouter(microAppContext.baseUrl)

  app.use(createPinia())
  app.use(router)
  app.use(Antd)

  app.mount(`#${import.meta.env.VITE_APP_NAME}`)
}

/**
 * ## 上下文注入策略
 *
 * `microAppContext` 是一个纯粹的 props 容器，消费方（路由守卫、业务代码）
 * 只与它交互，不感知当前运行环境。上下文的来源由启动方式决定：
 *
 * - **qiankun 模式**：主应用在 `mount()` 生命周期中调用 `microAppContext.setProps(props)`，
 *   将 `baseUrl`、`menuKey`、`getAuthorizedRoutes` 等字段注入进来。
 *
 * - **独立运行模式**：在 `renderApp()` 之前手动调用 `microAppContext.setProps({...})`，
 *   注入当前环境的等效数据（如从 `import.meta.env` 读取 baseUrl、直接返回全量路由等）。
 *   这样可以保持业务代码零改动地支持独立部署。
 *
 * @example 独立运行时注入示例（在 renderApp() 前调用）：
 * ```ts
 * microAppContext.setProps({
 *   baseUrl: import.meta.env.BASE_URL,
 *   getAuthorizedRoutes: () => allRoutes,
 * })
 * ```
 */

// 独立运行时
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // TODO: 如需独立部署，在此处调用 microAppContext.setProps({ baseUrl, getAuthorizedRoutes, ... })
  renderApp()
}

renderWithQiankun({
  mount(props: QiankunLifecycleProps) {
    microAppContext.setProps(props)
    renderApp()
  },
  bootstrap() {},
  update() {},
  unmount() {
    app?.unmount()
    app = null
    microAppContext.reset()
  },
})
