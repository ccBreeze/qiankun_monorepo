import { renderModalInstance } from './render'
import type { Component } from 'vue'
import type { ModalResult } from './types'

let modalQueue: Promise<unknown> = Promise.resolve()

/** 按调用顺序串行展示 */
export const openModalRequest = <
  TProps extends object = Record<string, unknown>,
  TResult = unknown,
>(
  component: Component,
  props?: TProps,
): Promise<ModalResult<TResult>> => {
  const scheduled = modalQueue
    .catch(() => undefined)
    .then(() =>
      renderModalInstance<TProps, TResult>(component, (props ?? {}) as TProps),
    )

  modalQueue = scheduled.catch(() => undefined)

  return scheduled
}
