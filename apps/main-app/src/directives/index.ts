import type { App } from 'vue'
import overflowTooltip from './overflowTooltip'

/** 注册全局指令 */
export const setupDirectives = (app: App): void => {
  app.directive('overflow-tooltip', overflowTooltip)
}
