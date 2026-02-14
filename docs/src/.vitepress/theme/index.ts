import { defineAsyncComponent } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { setupImageZoom } from './plugins/imageZoom'
import type { Theme } from 'vitepress'

import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 异步加载 DrawioViewer，避免 SSR 环境下加载 X6
    app.component(
      'DrawioViewer',
      defineAsyncComponent(() => import('./components/DrawioViewer.vue')),
    )
  },
  setup() {
    setupImageZoom()
  },
} satisfies Theme
