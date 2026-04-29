import { createApp, h } from 'vue'
import type { App as VueApp, Component } from 'vue'
import AntConfigProvider from '../AntConfigProvider/index.vue'
import type { ModalInjectedProps, ModalResult } from './types'

export type ModalAppSetup = (app: VueApp) => void

let modalAppSetup: ModalAppSetup | null = null

/** 注册弹窗 app 的插件安装回调，在每次创建独立 app 时执行 */
export function configureModalApp(setup: ModalAppSetup) {
  modalAppSetup = setup
}

const applyModalAppSetups = (app: VueApp) => {
  if (!modalAppSetup) {
    console.warn(
      '[Breeze Modal] configureModalApp() has not been called. Command-style modals may miss app-level plugins.',
    )
    return
  }
  modalAppSetup(app)
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
    applyModalAppSetups(app)
    app.mount(container)
  })
}
