import type { App } from 'vue'
import overflowTooltip from './overflowTooltip'

export const setupDirectives = (app: App): void => {
  app.directive('overflow-tooltip', overflowTooltip)
}
