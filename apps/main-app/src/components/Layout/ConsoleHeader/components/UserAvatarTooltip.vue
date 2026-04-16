<template>
  <a-popover
    v-model:open="open"
    placement="bottomRight"
    color="#fff"
    destroyTooltipOnHide
    trigger="click"
    overlayClassName="user-avatar-tooltip"
    :getPopupContainer="getPopupContainer"
  >
    <div class="avatar-container">
      <img src="../images/avatar_female.png" class="avatar" />
    </div>

    <template #content>
      <div class="box" @click.stop>
        <div class="box-top">
          <a-typography-text
            class="name"
            :content="userStore.userData.accountName"
            :ellipsis="{ tooltip: true }"
          />
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
            <span class="btn__text">修改密码</span>
          </router-link>
          <div class="btn" @click="logout">
            <SvgIcon name="logout" />
            <span class="btn__text">退出登入</span>
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
    font-size: 20px;
    color: white;
    user-select: none;
    transform: translate(-50%, -50%);
  }
}

.user-avatar-tooltip {
  .box {
    padding: 18px 12px 10px;

    .box-top {
      margin: 0 8px;

      .name {
        display: block;
        width: 160px;
        font-size: 14px;
        font-weight: 600;
        color: rgb(22 35 61 / 95%);
      }

      .tag {
        display: inline-block;
        padding: 0 8px;
        margin-top: 8px;
        font-size: 14px;
        line-height: 24px;
        color: #528dff;
        background: #e8f4ff;
        border-radius: 2px 8px;
      }
    }

    .hr {
      height: 1px;
      margin: 24px 0 16px;
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

        .btn__text {
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
