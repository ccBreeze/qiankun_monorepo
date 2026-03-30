<template>
  <div class="console-header">
    <img src="@/assets/images/logo_COMS.png" class="logo" />

    <div class="shunt-menu">
      <ShuntMenuButton
        v-for="[menuKey, menu] in menuMap"
        :key="menuKey"
        :icon-name="menu.iconName ?? ''"
        :title="menu.title ?? ''"
        :href="menu.appHomePath"
        :is-active="menuKey === activeMenuKey"
      />
    </div>

    <div class="right">
      <div class="multilingual-wrap">
        <MultipleLanguages />
      </div>
      <UserAvatarTooltip />
    </div>
  </div>
</template>

<script setup lang="ts">
import ShuntMenuButton from './components/ShuntMenuButton.vue'
import UserAvatarTooltip from './components/UserAvatarTooltip.vue'
import MultipleLanguages from '@/components/MultipleLanguages/MultipleLanguages.vue'
import { useMenuStore } from '@/stores/menu'

const { menuMap, activeMenuKey } = storeToRefs(useMenuStore())
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
    box-sizing: border-box;
    flex: 1;
    height: 100%;
    padding-top: 4px;
  }

  .right {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    padding-top: 4px;

    .multilingual-wrap {
      margin-right: 24px;
    }
  }
}
</style>
