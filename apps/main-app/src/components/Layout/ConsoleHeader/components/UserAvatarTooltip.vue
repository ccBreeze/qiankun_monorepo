<template>
  <a-popover
    v-model:open="open"
    placement="bottomRight"
    color="#fff"
    destroy-tooltip-on-hide
    trigger="click"
    overlay-class-name="user-avatar-tooltip"
    :get-popup-container="getPopupContainer"
  >
    <div class="avatar-container">
      <img src="../images/avatar_female.png" class="avatar" />
    </div>

    <template #content>
      <div class="box">
        <div class="box__top">
          <a-tooltip :title="userStore.userData.accountName">
            <div v-show-tooltip class="name">
              {{ userStore.userData.accountName }}
            </div>
          </a-tooltip>
          <div class="tag">{{ userStore.userData.roleName }}</div>
        </div>
        <div class="hr"></div>

        <div class="btn-group">
          <router-link
            to="/ocrm/#/index/system/userCenter"
            class="btn"
            @click="close"
          >
            <SvgIcon name="lock_setting" />
            <span>修改密码</span>
          </router-link>
          <div class="btn" @click="logout">
            <SvgIcon name="logout" />
            <span>退出登入</span>
          </div>
        </div>
      </div>
    </template>
  </a-popover>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'

import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'

const userStore = useUserStore()
const authStore = useAuthStore()

const open = ref(false)
const close = () => (open.value = false)
const getPopupContainer = (trigger: HTMLElement) => trigger

const logout = async () => {
  await authStore.logout()
  close()
}
</script>

<style lang="scss" scoped>
.avatar-container {
  position: relative;
  width: 36px;
  height: 36px;
  cursor: pointer;

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .avatar-letter {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 20px;
    user-select: none;
  }
}

.user-avatar-tooltip {
  .box {
    padding: 18px 12px 10px;

    &__top {
      margin: 0 8px;

      .name {
        font-weight: 600;
        font-size: 14px;
        color: rgb(22 35 61 / 95%);
      }

      .tag {
        display: inline-block;
        margin-top: 8px;
        padding: 0 8px;
        line-height: 24px;
        font-size: 14px;
        color: #528dff;
        background: #e8f4ff;
        border-radius: 2px 8px;
      }
    }

    .hr {
      margin: 24px 0 16px;
      height: 1px;
      background: rgb(22 35 61 / 8%);
    }

    .btn-group {
      display: flex;

      .btn {
        display: flex;
        align-items: center;
        cursor: pointer;

        &:first-child {
          margin-right: 32px;
        }

        span {
          margin-left: 8px;
          font-size: 14px;
          color: rgb(22 35 61 / 65%);
          white-space: nowrap;
        }
      }
    }
  }
}
</style>
