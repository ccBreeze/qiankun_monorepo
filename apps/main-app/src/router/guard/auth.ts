import type { Router } from 'vue-router'
import { Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { LOGIN_PATH } from '@/constant'

/** 未登录拦截：弹窗提示后跳转登录页 */
export const createAuthGuard = (router: Router): void => {
  let isShowingAuthModal = false

  router.beforeEach((to) => {
    if (to.path === LOGIN_PATH) return true

    const authStore = useAuthStore()
    if (!authStore.accessToken) {
      if (!isShowingAuthModal) {
        isShowingAuthModal = true
        Modal.warning({
          content: '未检测到登录信息，请重新登录',
          onOk: () => {
            isShowingAuthModal = false
            void router.replace(LOGIN_PATH)
          },
        })
      }
      return false
    }
  })
}
