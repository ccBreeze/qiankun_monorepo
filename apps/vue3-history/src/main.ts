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

  /**
   * 注意：子应用的根组件必须在主应用指定的 DOM 节点上查找，否则会导致子应用无法正常卸载。
   *
   * [Vue warn]: There is already an app instance mounted on the host container.
   * If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first.
   *
   * @see https://qiankun.umijs.org/zh/faq#application-died-in-status-not_mounted-target-container-with-container-not-existed-after-xxx-mounted
   */
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
