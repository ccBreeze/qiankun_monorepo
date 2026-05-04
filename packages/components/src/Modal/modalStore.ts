import { reactive, markRaw, type Component } from 'vue'

export interface ModalInstance {
  id: string
  component: Component
  props: Record<string, unknown>
}

export const modalStore = reactive(new Map<string, ModalInstance>())

export function addModalInstance(instance: ModalInstance) {
  modalStore.set(instance.id, {
    ...instance,
    component: markRaw(instance.component),
  })
}

export function removeModalInstance(id: string) {
  modalStore.delete(id)
}

/** 子应用 unmount 时调用，清空所有 pending Modal */
export function resetModalStore() {
  modalStore.clear()
}
