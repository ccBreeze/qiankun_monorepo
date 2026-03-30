import type { ObjectDirective } from 'vue'

const OVERFLOW_TOOLTIP_HANDLER_KEY = '__vueOverflowTooltipHandler'

type TooltipElement = HTMLElement & {
  [K in typeof OVERFLOW_TOOLTIP_HANDLER_KEY]?: (event: MouseEvent) => void
}

/** 文字是否溢出 */
const isTextOverflowing = (target: HTMLElement): boolean => {
  return target.scrollWidth > target.clientWidth
}

const syncPointerEventsForOverflowTooltip = (target: HTMLElement): void => {
  // 仅在文本溢出时启用鼠标事件
  // 避免无溢出时触发 tooltip（如 a-tooltip）或原生 title
  if (isTextOverflowing(target)) {
    target.style.removeProperty('pointer-events')
    return
  }
  target.style.pointerEvents = 'none'
}

/**
 * 文本溢出提示指令：
 * - 强制单行省略（ellipsis）
 * - 当文本未溢出时禁用鼠标事件，避免误触发 tooltip/title
 *
 * 优先方案：如需完整的省略+提示能力，优先使用 Ant Design Vue Typography
 * @doc https://antdv.com/components/typography-cn
 */
const overflowTooltip: ObjectDirective<TooltipElement> = {
  mounted(el) {
    // 溢出省略号
    el.style.whiteSpace = 'nowrap'
    el.style.overflow = 'hidden'
    el.style.textOverflow = 'ellipsis'

    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.currentTarget as HTMLElement | null
      if (!target) return
      syncPointerEventsForOverflowTooltip(target)
    }

    el.addEventListener('mouseenter', handleMouseEnter)
    el[OVERFLOW_TOOLTIP_HANDLER_KEY] = handleMouseEnter
  },

  updated(el) {
    syncPointerEventsForOverflowTooltip(el)
  },

  unmounted(el) {
    if (el[OVERFLOW_TOOLTIP_HANDLER_KEY]) {
      el.removeEventListener('mouseenter', el[OVERFLOW_TOOLTIP_HANDLER_KEY])
      delete el[OVERFLOW_TOOLTIP_HANDLER_KEY]
    }
  },
}

export default overflowTooltip
