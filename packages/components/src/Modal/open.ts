import { defineAsyncComponent, type Component } from 'vue'
import { openModalRequest } from './manager'
import type { ModalResult } from './types'
import type {
  DemoActionModalRequest,
  DemoActionModalResult,
} from './components/DemoActionModal.vue'

export enum ModalEnum {
  DemoActionModal = 'DemoActionModal',
}

// TODO: Glob import
/** 内置弹窗的组件映射表，命令式调用时会先通过枚举解析到具体组件 */
export const ModalMap: Record<ModalEnum, Component> = {
  [ModalEnum.DemoActionModal]: defineAsyncComponent(
    () => import('./components/DemoActionModal.vue'),
  ),
}

/** 内置弹窗的类型契约映射，用于根据枚举值自动推导 props 与结果类型 */
export interface BuiltinModalContractMap {
  [ModalEnum.DemoActionModal]: {
    props: DemoActionModalRequest
    result: DemoActionModalResult
  }
}

export type BuiltinModalProps<T extends ModalEnum> =
  BuiltinModalContractMap[T]['props']

export type BuiltinModalResult<T extends ModalEnum> =
  BuiltinModalContractMap[T]['result']

/**
 * 通过命令式入口打开弹窗：
 * 1. 传入内置枚举时，根据契约映射自动推导 props 与结果类型
 * 2. 传入任意组件时，保留通用泛型调用能力
 */
export function openModal<T extends ModalEnum>(
  component: T,
  props: BuiltinModalProps<T>,
): Promise<ModalResult<BuiltinModalResult<T>>>

export function openModal<
  TProps extends object = Record<string, unknown>,
  TResult = unknown,
>(component: Component, props?: TProps): Promise<ModalResult<TResult>>

export function openModal<
  TProps extends object = Record<string, unknown>,
  TResult = unknown,
>(
  component: Component | ModalEnum,
  props?: TProps,
): Promise<ModalResult<TResult>> {
  const resolved =
    typeof component === 'string' ? ModalMap[component] : component
  return openModalRequest<TProps, TResult>(resolved, props)
}
