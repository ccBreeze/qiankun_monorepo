/** openModal 的 Promise resolve 形状 */
export type ModalResult<T = never> = T | undefined

/** 框架向弹窗组件注入的字段 */
export interface ModalInjectedProps<TResult = never> {
  afterClose: () => void
  onOk: (payload?: TResult) => void
  onCancel: (payload?: TResult) => void
}
