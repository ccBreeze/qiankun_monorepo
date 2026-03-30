import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'

import { useUserStore } from './user'
import { useMenuStore } from './menu'
import { useTabBarStore } from './tabBar'
import { resetUserConfig } from '@/hooks/useConfig'
import { LOGIN_PATH } from '@/constant'
import type { UserData, LogoutOptions } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  const userStore = useUserStore()
  const menuStore = useMenuStore()
  const tabBarStore = useTabBarStore()

  const accessToken = ref<string | undefined>(userStore.userData.token)

  const authLogin = (data: UserData): void => {
    // 清空用户配置（保留全局配置）
    resetUserConfig()

    userStore.setUserData(data)
    accessToken.value = data.token
    localStorage.setItem('userId', data.aid ?? '')
    // 跳转到登录前的页面
    const redirect = router.currentRoute.value.query.redirect as string
    const redirectPath = redirect
      ? decodeURIComponent(redirect)
      : menuStore.homePath
    void router.push(redirectPath)
  }

  const logout = async ({
    shouldCallLogoutApi = true,
  }: LogoutOptions = {}): Promise<void> => {
    if (shouldCallLogoutApi) {
      // TODO: logout api
    }

    // 清空用户数据和用户配置（保留全局配置）
    userStore.resetUserData()
    tabBarStore.clearTabs()
    resetUserConfig()
    accessToken.value = undefined

    if (router.currentRoute.value.path !== LOGIN_PATH) {
      window.location.href = LOGIN_PATH // 刷新页面
    }
  }

  /** 退出登入弹窗 */
  const showLogoutModal = (() => {
    let hasShownLogoutModal = false
    return (content: string): void => {
      // 确保只弹出一次
      if (!hasShownLogoutModal) return
      hasShownLogoutModal = true
      Modal.error({
        content,
        keyboard: false,
        onOk: () => {
          hasShownLogoutModal = false
          logout({ shouldCallLogoutApi: false })
        },
      })
    }
  })()

  return {
    accessToken,
    authLogin,
    logout,
    showLogoutModal,
  }
})
