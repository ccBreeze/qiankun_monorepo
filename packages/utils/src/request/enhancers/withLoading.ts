import type { ApiFn, EnhancerArgs, LoadingController } from '../types'
import { LOADING_DELAY } from '../../constants'

/** Loading 状态管理器 */
class LoadingManager {
  private count = 0
  readonly controller: LoadingController
  private delay: number

  constructor(controller: LoadingController, delay = LOADING_DELAY) {
    this.controller = controller
    this.delay = delay
  }

  /** 显示 loading（引用计数 +1） */
  show(): void {
    this.count++
    // 只在第一次请求时显示 loading
    if (this.count === 1) {
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

/** 全局唯一的 Loading 管理器 */
let globalLoadingManager: LoadingManager | null = null

/** 获取或创建全局 Loading 管理器，重复注册不同 controller 时发出警告 */
const getLoadingManager = (
  controller: LoadingController,
  delay?: number,
): LoadingManager => {
  if (globalLoadingManager) {
    if (globalLoadingManager.controller !== controller) {
      console.warn(
        '[withLoading] 全局 loadingController 已注册，重复注册将被忽略。请确保只注册一个 loadingController。',
      )
    }
    return globalLoadingManager
  }
  globalLoadingManager = new LoadingManager(controller, delay)
  return globalLoadingManager
}

/**
 * Loading 状态管理
 * @description 默认禁用
 */
export const withLoading = <T>({
  api,
  config,
  context,
}: EnhancerArgs<T>): ApiFn<T> => {
  // 配置中未启用 loading
  if (!config.showLoading) return api

  // 有 controller 时注册全局管理器；无 controller 时复用已有的全局管理器
  const manager = context.loadingController
    ? getLoadingManager(context.loadingController, context.loadingDelay)
    : globalLoadingManager

  // 全局管理器尚未注册，跳过 loading 增强
  if (!manager) return api

  return async () => {
    manager.show()
    return api().finally(() => {
      manager.hide()
    })
  }
}
