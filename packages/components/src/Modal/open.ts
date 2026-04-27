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

/** 取出 T 中的必填字段名，全可选时为 never */
type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K
}[keyof T]

/** props 含必填字段时为 true，全可选（含 {}）时为 false */
type HasRequired<T> = [RequiredKeys<T>] extends [never] ? false : true

/** 根据 props 是否含必填字段，推导对应的可变参数元组 */
type OpenModalArgs<T extends ModalEnum> =
  HasRequired<BuiltinModalProps<T>> extends true
    ? [component: T, props: BuiltinModalProps<T>]
    : [component: T, props?: BuiltinModalProps<T>]

/**
 * 通过命令式入口打开弹窗：
 * 1. 传入内置枚举时，根据契约映射自动推导 props 与结果类型；
 *    且当契约 props 含必填字段时，第二个参数强制必填，否则可省略
 * 2. 传入任意组件时，保留通用泛型调用能力
 */
export function openModal<T extends ModalEnum>(
  ...args: OpenModalArgs<T>
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
