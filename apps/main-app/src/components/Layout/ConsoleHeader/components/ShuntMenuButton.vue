<template>
  <router-link :to="href">
    <div
      class="shunt-menu-button"
      :class="{ 'shunt-menu-button--active': isActive }"
    >
      <SvgIcon :name="iconName" class="icon" />
      <span class="title">{{ title }}</span>
      <template v-if="isActive">
        <i class="lb--square" />
        <i class="lb--circle" />
        <i class="rb--square" />
        <i class="rb--circle" />
      </template>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'

defineProps<{
  isActive: boolean
  iconName: string
  title: string
  href: string
}>()
</script>

<style lang="scss" scoped>
.shunt-menu-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 160px;
  height: 100%;
  padding: 0 24px;
  cursor: pointer;

  .icon {
    color: rgb(22 35 61 / 65%);
  }

  .title {
    margin-left: 4px;
    font-size: 16px;
    font-weight: bold;
    color: rgb(22 35 61 / 65%);
  }

  &--active {
    background-color: #f7f9fd;
    border-radius: 16px 16px 0 0;

    .icon,
    .title {
      color: rgb(22 35 61 / 95%);
    }
  }

  .lb,
  .rb {
    &--square,
    &--circle {
      position: absolute;
      width: 16px;
      height: 16px;
      background-color: #f7f9fd;
    }

    &--circle {
      background-color: #fff;
    }
  }

  .lb {
    &--square,
    &--circle {
      bottom: 0;
      left: -16px;
    }

    &--circle {
      border-bottom-right-radius: 8px;
    }
  }

  .rb {
    &--square,
    &--circle {
      right: -16px;
      bottom: 0;
    }

    &--circle {
      border-bottom-left-radius: 8px;
    }
  }
}
</style>
