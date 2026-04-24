import { createApp } from 'vue'
import type { App as VueApp, Component } from 'vue'
import type { ModalInjectedProps, ModalResult } from './types'

const getContainer = () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

/** 渲染单个弹窗实例，并在 close 时完成清理 */
export const renderModalInstance = <
  TProps extends object = Record<string, unknown>,
  TResult = unknown,
>(
  component: Component,
  props: TProps,
): Promise<ModalResult<TResult>> => {
  return new Promise<ModalResult<TResult>>((resolve, reject) => {
    const container = getContainer()
    let app: VueApp<Element> | null = null
    const cleanup = () => {
      app?.unmount()
      container.remove()
    }

    const injected: ModalInjectedProps<TResult> = {
      afterClose: cleanup,
      onOk: (payload?: TResult) => {
        resolve(payload)
      },
      onCancel: (payload?: TResult) => {
        reject(payload)
      },
    }

    app = createApp(component, {
      ...props,
      ...injected,
    } as Record<string, unknown>)
    app.mount(container)
  })
}
