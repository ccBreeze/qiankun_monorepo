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
  const router = generateRouter(microAppContext.activeRule)

  app.use(createPinia())
  app.use(router)
  app.use(Antd)

  app.mount(`#${import.meta.env.VITE_APP_NAME}`)
}

// 独立运行时
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  renderApp()
}

renderWithQiankun({
  mount(props) {
    microAppContext.setProps(props as QiankunLifecycleProps)
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
