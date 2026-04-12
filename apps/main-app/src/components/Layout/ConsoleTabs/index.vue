<template>
  <div class="console-tabs flex items-center">
    <div
      v-if="isTabsOverflow"
      class="arrow mr-2.5"
      :class="{ 'arrow--disabled': isDisabledArrowLeft }"
      @click="handleArrowLeft"
    >
      <LeftOutlined />
    </div>

    <div ref="tabsRef" class="tabs">
      <div
        v-for="[key, item] in tabs"
        :key="key"
        :data-key="key"
        :class="{ 'tabs__item--active': item.fullPath === route.fullPath }"
        class="tabs__item mr-2.5 last:mr-0"
        @click="handleTabsItem(item.fullPath)"
      >
        <span class="min-w-[4em]">{{ item.title }}</span>
        <CloseOutlined
          v-show="tabs.size > 1"
          class="ml-4 text-[10px]"
          @click.stop="() => removeTab({ fullPath: key })"
        />
      </div>
    </div>

    <div
      v-if="isTabsOverflow"
      class="arrow ml-2.5"
      :class="{ 'arrow--disabled': isDisabledArrowRight }"
      @click="handleArrowRight"
    >
      <RightOutlined />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'

import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useTabBarStore } from '@/stores/tabBar'
import { useScrollable } from './useScrollable'

const route = useRoute()
const router = useRouter()
const { tabs } = storeToRefs(useTabBarStore())
const { addTab, removeTab } = useTabBarStore()

const {
  isDisabledArrowLeft,
  isDisabledArrowRight,
  tabsRef,
  isTabsOverflow,
  checkTabsOverflow,
  handleArrowLeft,
  handleArrowRight,
  scrollToActiveTab,
} = useScrollable(() => tabs.value.size)

watch(
  () => route.fullPath,
  async (fullPath: string, oldFullPath?: string) => {
    addTab(fullPath, oldFullPath)
    await checkTabsOverflow()
    await scrollToActiveTab(fullPath)
  },
  { immediate: true },
)

const handleTabsItem = (fullPath: string) => {
  if (fullPath === route.fullPath) return
  void router.push(fullPath)
}
</script>

<style lang="scss" scoped>
@use '@/assets/scss/mixins.scss' as *;

.console-tabs {
  .arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 30px;
    margin-right: 10px;
    font-size: 12px;
    color: rgba(22, 35, 61, 0.65);
    cursor: pointer;
    background: rgba(22, 35, 61, 0.04);
    border-radius: 4px;

    &:hover:not(.arrow--disabled) {
      color: #528dff;
    }

    &--disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  .tabs {
    position: relative;
    display: flex;
    flex: 1;
    overflow-x: auto;

    @include hide-scrollbar;

    .tabs__item {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      height: 30px;
      padding: 0 8px;
      font-size: 12px;
      color: rgba(22, 35, 61, 0.65);
      cursor: pointer;
      user-select: none;
      background: rgba(22, 35, 61, 0.04);
      border-radius: 4px;

      &:hover,
      &--active {
        color: #528dff;
        background: rgba(82, 141, 255, 0.08);
      }
    }
  }
}
</style>
