import { type Component } from 'vue'
import { addModalInstance, removeModalInstance } from './modalStore'
import type { ModalResult } from './types'

/** 渲染单个弹窗实例，并返回 Promise */
export const renderModalInstance = <
  TProps extends object = Record<string, unknown>,
  TResult = unknown,
>(
  component: Component,
  props: TProps,
): Promise<ModalResult<TResult>> => {
  return new Promise<ModalResult<TResult>>((resolve, reject) => {
    const id = `modal_${crypto.randomUUID()}`

    addModalInstance({
      id,
      component,
      props: {
        ...(props as Record<string, unknown>),
        onOk: (payload?: TResult) => resolve(payload),
        onCancel: (payload?: TResult) => reject(payload),
        afterClose: () => removeModalInstance(id),
      },
    })
  })
}
