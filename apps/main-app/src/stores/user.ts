import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserData } from '@/types/user'
import { useMenuStore } from '@/stores/menu'

const USER_STORAGE_KEY = 'userData'

export const useUserStore = defineStore('user', () => {
  const userData = ref<UserData>({})

  const setUserData = (data: UserData | undefined = {}): void => {
    userData.value = data
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data))

    useMenuStore().buildAllMenus(data)
  }

  /** 清空用户信息 */
  const resetUserData = (): void => {
    userData.value = {}
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  const initUserData = (): void => {
    const rawUserData = localStorage.getItem(USER_STORAGE_KEY)
    if (!rawUserData) {
      resetUserData()
      return
    }
    setUserData(JSON.parse(rawUserData))
  }
  initUserData()

  return {
    userData,
    setUserData,
    resetUserData,
  }
})
