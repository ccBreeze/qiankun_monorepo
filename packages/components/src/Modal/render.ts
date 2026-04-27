import { createApp, h } from 'vue'
import type { App as VueApp, Component } from 'vue'
import AntConfigProvider from '../AntConfigProvider/index.vue'
import type { ModalInjectedProps, ModalResult } from './types'

/** 渲染单个弹窗实例，并在 close 时完成清理 */
export const renderModalInstance = <
  TProps extends object = Record<string, unknown>,
  TResult = unknown,
>(
  component: Component,
  props: TProps,
): Promise<ModalResult<TResult>> => {
  return new Promise<ModalResult<TResult>>((resolve, reject) => {
    const container = document.createElement('div')
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

    const modalProps = {
      ...props,
      ...injected,
    } as Record<string, unknown>

    app = createApp({
      render() {
        return h(AntConfigProvider, null, {
          default: () => h(component, modalProps),
        })
      },
    })
    app.mount(container)
  })
}
