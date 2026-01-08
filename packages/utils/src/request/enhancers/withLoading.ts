import type { ApiFn, EnhancerArgs, LoadingController } from '../types'

/** Loading 状态管理器 */
class LoadingManager {
  private count = 0
  private controller: LoadingController
  private delay: number

  constructor(controller: LoadingController, delay = 500) {
    this.controller = controller
    this.delay = delay
  }

  /** 显示 loading（引用计数 +1） */
  show(): void {
    this.count++
    if (this.count === 1) {
      // 只在第一次请求时显示 loading
      this.controller.show({ delay: this.delay })
    }
  }

  /** 隐藏 loading（引用计数 -1） */
  hide(): void {
    // 边界保护：防止 count 变成负数
    if (this.count <= 0) {
      this.count = 0
      return
    }
    this.count--
    if (this.count === 0) {
      this.controller.hide()
    }
  }

  /** 强制关闭 loading 并重置计数 */
  close(): void {
    this.count = 0
    this.controller.hide()
  }
}

/** Loading 管理器缓存（每个 controller 实例一个管理器） */
const loadingManagers = new WeakMap<LoadingController, LoadingManager>()

/** 获取或创建 Loading 管理器 */
const getLoadingManager = (
  controller: LoadingController,
  delay?: number,
): LoadingManager => {
  let manager = loadingManagers.get(controller)
  if (!manager) {
    manager = new LoadingManager(controller, delay)
    loadingManagers.set(controller, manager)
  }
  return manager
}

/** 请求添加 loading 显示（需要提供 controller） */
export const withLoading = <T>({ api, context }: EnhancerArgs<T>): ApiFn<T> => {
  const { loadingController, loadingDelay } = context
  if (!loadingController) return api

  const manager = getLoadingManager(loadingController, loadingDelay)
  return async () => {
    manager.show()
    return api().finally(() => {
      manager.hide()
    })
  }
}
