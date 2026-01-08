<template>
  <div class="console-header">
    <img src="@/assets/images/logo_COMS.png" class="logo" />

    <div class="shunt-menu"></div>

    <div class="right">
      <div class="multilingual-wrap">
        <MultipleLanguages />
      </div>
      <UserAvatarTooltip />
    </div>
  </div>
</template>

<script setup lang="ts">
import UserAvatarTooltip from './components/UserAvatarTooltip.vue'
import MultipleLanguages from '@/components/MultipleLanguages/MultipleLanguages.vue'
</script>

<style lang="scss" scoped>
@use '../constant.scss' as *;

.console-header {
  display: flex;
  align-items: center;
  height: $header-height;
  padding: 0 32px;
  background-color: #fff;

  .logo {
    display: block;
    width: 134px;
    margin-right: 90px;
  }

  /** 系统导航 */
  .shunt-menu {
    flex: 1;
    box-sizing: border-box;
    height: 100%;
    padding-top: 4px;
  }

  .right {
    padding-top: 4px;
    flex-shrink: 0;
    display: flex;
    align-items: center;

    .multilingual-wrap {
      margin-right: 24px;
    }
  }
}
</style>
