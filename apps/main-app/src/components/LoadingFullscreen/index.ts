import type { ComponentInternalInstance, VNode } from 'vue'
import { createVNode, render } from 'vue'
import MessageBoxConstructor from './index.vue'

// Loading 配置选项
interface LoadingOptions {
  delay?: number
  onClose?: () => void
}

// Loading 函数类型
interface LoadingFn {
  (options?: LoadingOptions): ComponentInternalInstance | null
  close: () => void
}

let fullscreenInstance: ComponentInternalInstance | null = null

const genContainer = (): HTMLDivElement => {
  return document.createElement('div')
}

const initInstance = (
  props: LoadingOptions,
  container: HTMLDivElement,
): ComponentInternalInstance | null => {
  const vnode: VNode = createVNode(
    MessageBoxConstructor,
    props as Record<string, unknown>,
  )
  render(vnode, container)
  document.body.appendChild(container)
  return vnode.component
}

const loading: LoadingFn = (options: LoadingOptions = {}) => {
  if (fullscreenInstance) return fullscreenInstance
  const container = genContainer()

  options.onClose = () => {
    if (!fullscreenInstance) return
    render(null, container)
    document.body.removeChild(container)
    fullscreenInstance = null
  }

  fullscreenInstance = initInstance(options, container)
  return fullscreenInstance
}

loading.close = () => {
  const proxy = fullscreenInstance?.proxy as { close?: () => void } | null
  proxy?.close?.()
}

export default loading
