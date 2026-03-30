<template>
  <div class="menu-wrap">
    <a-menu
      v-model:selected-keys="selectedKeys"
      :open-keys="openKeys"
      :items="menuItems"
      mode="inline"
      class="menu"
      @click="handleClick"
      @open-change="onOpenChange"
    >
    </a-menu>
  </div>
</template>

<script lang="ts" setup>
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMenuStore } from '@/stores/menu'
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'
import { type MenuRoute } from '@breeze/qiankun-shared'
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'

interface MenuItem {
  key: string
  label: string
  icon?: unknown
  type?: string
  class?: string
  children?: MenuItem[]
  /** 仅叶子节点存在 path */
  path?: string
}

const route = useRoute()
const router = useRouter()
const { activeMenuRoute, activeMenuModule } = storeToRefs(useMenuStore())

/** 当前选中的菜单 key */
const selectedKeys = computed(() => {
  const raw = activeMenuRoute.value
  if (!raw) return []
  let fullPath = raw.path
  // 支持当前路由指定选中的菜单
  if (raw.meta.activeMenuPath) {
    fullPath = raw.meta.parentPath!
  }
  return [fullPath]
})

/**
 * 生成菜单项（使用 computed 缓存）
 */
const menuItems = computed<MenuItem[]>(() => {
  return generateMenu(activeMenuModule.value?.menuRoutes ?? [])
})

/** 生成菜单 */
function generateMenu(list: MenuRoute[], level = 0): MenuItem[] {
  if (!list.length) return []

  const items: MenuItem[] = []

  for (const item of list) {
    // 隐藏的菜单不显示
    if (item.meta.isHiddenMenu === true) continue

    const children = generateMenu(item.children || [], level + 1)
    items.push({
      ...getLevelConfig(level, item.meta.iconName),
      label: item.meta.name || '',
      key: item.path,
      children: children.length ? children : undefined,
      path: item.path,
    })
  }

  return items
}

/** 获取不同层级的配置 */
function getLevelConfig(level: number, iconName?: string): Partial<MenuItem> {
  switch (level) {
    // 一级菜单
    case 0:
      return { type: 'group' }
    case 1:
      return {
        class: 'secondary-level',
        icon: iconName
          ? h(SvgIcon, {
              name: `menu-${iconName}`,
              class: 'icon',
              size: 'medium',
            })
          : undefined,
      }
    case 2:
      return { class: 'third-level' }
    case 3:
      return { class: 'four-level' }
    default:
      return {}
  }
}

/** 菜单点击事件 */
const handleClick = (info: MenuInfo): void => {
  // 仅叶子节点才会触发点击事件
  void router.push(info.item.path)
}

const openKeys = ref<string[]>([])
/** 自动展开当前路由的所有父级菜单 */
const autoExpandMenu = (path: string): void => {
  const dynamicRoute = activeMenuModule.value?.dynamicRoute
  if (!dynamicRoute) return
  openKeys.value = dynamicRoute
    .resolvePathToRouteAncestors(path)
    .map((r) => r.path)
}
/** 路由变化时自动展开 */
watch(() => route.fullPath, autoExpandMenu, {
  immediate: true,
})
/** 手动展开/收起子菜单 */
const onOpenChange = (keys: string[]): void => {
  // 对比新旧 keys，找出本次新展开的菜单
  const currentSet = new Set(openKeys.value)
  const latestOpenKey = keys.find((key) => !currentSet.has(key))
  // 没有新增，说明是收起操作，直接同步
  if (!latestOpenKey) {
    openKeys.value = keys
    return
  }

  autoExpandMenu(latestOpenKey)
}
</script>

<style lang="scss" scoped>
.menu-wrap {
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  user-select: none;
  scrollbar-width: none;
  background: url('./images/bg.png') repeat 0 0;
  background-color: #fff;
  border-radius: 0 16px 0 0;

  .menu {
    width: 208px;
    color: rgb(22 35 61 / 65%);
    background-color: transparent;
    border: none;

    :deep(.ant-menu-inline) {
      background: none;
    }

    :deep(.ant-menu-submenu-arrow) {
      display: none;
    }

    // 重置 hover 状态
    :deep(.ant-menu-item:not(.ant-menu-item-selected)),
    :deep(.ant-menu-submenu-title) {
      &:hover {
        color: rgb(22 35 61 / 65%);
        background: linear-gradient(
          328deg,
          rgb(82 141 255 / 12%) 0%,
          rgb(82 141 255 / 4%) 100%
        );
      }
    }

    /** 一级菜单 */
    &:deep(.ant-menu-item-group-title) {
      padding: 0;
      padding-bottom: 8px;
      color: rgb(22 35 61 / 45%);
    }

    /** 四级菜单 */
    &:deep(.four-level) {
      padding-left: 56px !important;

      &.ant-menu-item-selected {
        background: linear-gradient(
          328deg,
          rgb(82 141 255 / 12%) 0%,
          rgb(82 141 255 / 4%) 100%
        );
      }
    }

    &:deep(.ant-menu-item-group) {
      &:not(:first-of-type) {
        margin-top: 32px;
      }
    }

    /** 二级菜单 - 基础样式 */
    :deep(.secondary-level) {
      &.ant-menu-item,
      & > .ant-menu-submenu-title {
        padding-left: 16px !important;

        .svg-icon {
          color: rgb(22 35 61 / 65%);
        }
      }
    }

    /** 三级菜单 - 基础样式 */
    :deep(.third-level) {
      &.ant-menu-item,
      & > .ant-menu-submenu-title {
        padding-left: 40px !important;

        &::before {
          position: absolute;
          top: 50%;
          left: 34px;
          width: 2px;
          height: 12px;
          content: '';
          background: rgb(22 35 61 / 30%);
          transform: translateY(-50%);
        }
      }
    }

    /** 二级菜单 - 选中状态 */
    /* stylelint-disable-next-line no-duplicate-selectors */
    :deep(.secondary-level) {
      &.ant-menu-item-selected,
      &.ant-menu-submenu-selected > .ant-menu-submenu-title {
        background: linear-gradient(90deg, #528dff 0%, #495aff 100%);

        .ant-menu-title-content {
          color: #fff;
        }

        .svg-icon {
          color: #fff;
        }
      }
    }

    /** 三级菜单 - 选中状态 */
    /* stylelint-disable-next-line no-duplicate-selectors */
    :deep(.third-level) {
      &.ant-menu-item-selected,
      &.ant-menu-submenu-selected > .ant-menu-submenu-title {
        color: #528dff;

        &::before {
          background: #528dff;
        }
      }

      &.ant-menu-item-selected {
        background: linear-gradient(
          328deg,
          rgb(82 141 255 / 12%) 0%,
          rgb(82 141 255 / 4%) 100%
        );
      }
    }
  }
}
</style>
