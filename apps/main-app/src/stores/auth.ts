import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'

import { useUserStore } from './user'
import { resetUserConfig } from '@/hooks/useConfig'
import { DEFAULT_HOME_PATH, LOGIN_PATH } from '@/constant'
import type { UserData, LogoutOptions } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  const userStore = useUserStore()

  const accessToken = ref<string | undefined>(userStore.userData.token)

  const authLogin = (data: UserData): void => {
    // 清空用户数据和用户配置（保留全局配置）
    userStore.resetUserData()
    resetUserConfig()

    userStore.setUserData(data)
    accessToken.value = data.token
    localStorage.setItem('userId', data.aid ?? '')
    // 跳转到登录前的页面
    const redirect = router.currentRoute.value.query.redirect as
      | string
      | undefined
    const redirectPath = redirect
      ? decodeURIComponent(redirect)
      : DEFAULT_HOME_PATH
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
    resetUserConfig()
    accessToken.value = undefined

    if (router.currentRoute.value.path !== LOGIN_PATH) {
      window.location.href = LOGIN_PATH // 刷新页面
    }
  }

  /** 是否已经显示过退出弹窗 */
  let hasShownLogoutModal = true
  /** 退出登入弹窗 */
  const showLogoutModal = (content: string): void => {
    if (!hasShownLogoutModal) return
    hasShownLogoutModal = false
    Modal.error({
      content,
      keyboard: false,
      onOk: () => logout({ shouldCallLogoutApi: false }),
    })
  }

  return {
    accessToken,
    authLogin,
    logout,
    showLogoutModal,
  }
})
