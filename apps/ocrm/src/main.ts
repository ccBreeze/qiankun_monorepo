import { createApp, type App } from 'vue'
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
  app.use(generateRouter(microAppContext.activeRule))

  const rootId = `#${import.meta.env.VITE_APP_NAME}`
  const rootContainer =
    microAppContext.container?.querySelector(rootId) || rootId
  app.mount(rootContainer)
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
