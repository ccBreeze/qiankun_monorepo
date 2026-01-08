import { defineStore } from 'pinia'
import { useLocalStorage, type RemovableRef } from '@vueuse/core'
import type { UserData } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  const userData: RemovableRef<UserData> = useLocalStorage<UserData>('user', {})

  const setUserData = (data: UserData | undefined): void => {
    if (!data) {
      userData.value = {}
      return
    }
    userData.value = data
  }

  /** 清空用户信息 */
  const resetUserData = (): void => {
    userData.value = {}
  }

  return {
    userData,
    setUserData,
    resetUserData,
  }
})
