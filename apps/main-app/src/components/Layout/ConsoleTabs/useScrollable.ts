import { useResizeObserver, useScroll } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import type { WatchSource } from 'vue'

export const useScrollable = (tabsSize?: WatchSource<number>) => {
  /** Tab 容器 DOM 引用 */
  const tabsRef = ref<HTMLDivElement | null>(null)

  const { x, arrivedState, measure, isScrolling } = useScroll(tabsRef, {
    behavior: 'smooth',
  })

  /** 左侧箭头是否禁用（到最左侧时禁用） */
  const isDisabledArrowLeft = computed(() => arrivedState.left)
  /** 右侧箭头是否禁用（到最右侧时禁用） */
  const isDisabledArrowRight = computed(() => arrivedState.right)

  /** 是否溢出（溢出时显示左右箭头） */
  const isTabsOverflow = ref(false)

  /**
   * 检查是否溢出（需要在 DOM 更新后计算）
   */
  const checkTabsOverflow = async () => {
    await nextTick()
    const el = tabsRef.value
    if (!el) return
    measure()
    isTabsOverflow.value = el.scrollWidth > el.clientWidth
  }

  if (tabsSize) {
    watch(tabsSize, () => {
      void checkTabsOverflow()
    })
  }

  useResizeObserver(tabsRef, () => {
    void checkTabsOverflow()
  })

  /**
   * 向左滚动一个“页宽”（容器宽度）
   */
  const handleArrowLeft = () => {
    if (isDisabledArrowLeft.value || isScrolling.value) return
    const target = tabsRef.value
    if (!target) return

    const left = Math.max(0, x.value - target.clientWidth)
    x.value = left
  }

  /**
   * 向右滚动一个“页宽”（容器宽度）
   */
  const handleArrowRight = () => {
    if (isDisabledArrowRight.value || isScrolling.value) return
    const target = tabsRef.value
    if (!target) return

    const maxLeft = Math.max(0, target.scrollWidth - target.clientWidth)
    const left = Math.min(maxLeft, x.value + target.clientWidth)
    x.value = left
  }

  /**
   * 自动滚动到激活项（仅在溢出时生效）
   */
  const scrollToActiveTab = async (key: string) => {
    if (!isTabsOverflow.value) return
    const target = tabsRef.value
    if (!target) return

    await nextTick()
    // data-key 可能包含特殊字符，先转义避免 querySelector 解析失败或匹配异常
    const selector = `[data-key="${CSS.escape(key)}"]`
    const activeDom = target.querySelector<HTMLElement>(selector)
    activeDom?.scrollIntoView({ behavior: 'smooth', inline: 'nearest' })
  }

  return {
    isDisabledArrowLeft,
    isDisabledArrowRight,
    tabsRef,
    isTabsOverflow,
    checkTabsOverflow,
    handleArrowLeft,
    handleArrowRight,
    scrollToActiveTab,
  }
}
