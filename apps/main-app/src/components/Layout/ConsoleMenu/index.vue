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
import { watch, ref, computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMenuStore } from '@/stores/menu'
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'
import { normalizePath, type MenuRecord } from '@breeze/qiankun-shared'
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
const menuStore = useMenuStore()

/** 当前选中的菜单 key */
const selectedKeys = ref<string[]>([])

/** 当前展开的菜单 key */
const openKeys = ref<string[]>([])

/**
 * 获取实际用于匹配菜单的路径
 * 隐藏菜单自动使用父节点的 path
 */
const getMatchPath = (fullPath: string): string => {
  const path = normalizePath(fullPath)
  const routeInfo = menuStore.getMenuByPath(path)

  // 如果是隐藏菜单，使用父节点的 path
  if (routeInfo?.meta.isHiddenMenu && routeInfo.meta.parentPath) {
    return routeInfo.meta.parentPath
  }

  return path
}

/**
 * 获取父级菜单路径（利用 store 的 getBreadcrumb 优化）
 */
const getParentKeys = (path: string): string[] => {
  const breadcrumb = menuStore.getBreadcrumb(path)
  // 返回除最后一项外的所有路径
  return breadcrumb.slice(0, -1).map((item) => item.path)
}

/** 自动展开菜单 */
const autoExpandMenu = (fullPath: string): void => {
  const path = getMatchPath(fullPath)
  const parentKeys = getParentKeys(path)
  openKeys.value = [...parentKeys, path]
}

/** 更新当前选中的菜单项 */
const updateSelectedMenuPath = (fullPath: string): void => {
  const path = getMatchPath(fullPath)
  selectedKeys.value = [path]
}

/**
 * 生成菜单项（使用 computed 缓存）
 */
const menuItems = computed<MenuItem[]>(() => {
  return generateMenu(menuStore.menuRoutes)
})

/** 生成菜单 */
function generateMenu(list: MenuRecord[], level = 0): MenuItem[] {
  if (!list.length) return []

  const items: MenuItem[] = []

  for (const item of list) {
    // 隐藏的菜单不显示
    if (item.meta.isHiddenMenu === true) continue

    const children = generateMenu(item.children || [], level + 1)
    items.push({
      ...getLevelConfig(level, item.meta.iconName),
      label: item.meta.name || item.name || '',
      key: item.path || item.name,
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
  const item = info.item as unknown as { path?: string }
  // 仅叶子节点才会触发点击事件
  if (!item?.path) return
  void router.push(item.path)
}

/** 只展开当前父级菜单 */
const onOpenChange = (keys: string[]): void => {
  const set = new Set(openKeys.value)
  const latestOpenKey = keys.find((key) => !set.has(key))

  // 如果没有新的菜单项被打开，则保留当前的打开状态
  if (!latestOpenKey) {
    openKeys.value = keys
    return
  }

  autoExpandMenu(latestOpenKey)
}

/** 路由改变或菜单数据变化时，自动更新菜单选中和展开状态 */
watch(
  [() => route.fullPath, () => menuStore.menuRoutes],
  ([fullPath]) => {
    updateSelectedMenuPath(fullPath)
    autoExpandMenu(fullPath)
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.menu-wrap {
  height: 100%;
  padding: 16px;
  background: url('./images/bg.png') repeat 0 0;
  background-color: #fff;
  border-radius: 0 16px 0 0;
  overflow-y: auto;
  scrollbar-width: none;
  user-select: none;

  .menu {
    width: 208px;
    border: none;
    color: rgb(22 35 61 / 65%);
    background-color: transparent;

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
        background: linear-gradient(
          328deg,
          rgb(82 141 255 / 12%) 0%,
          rgb(82 141 255 / 4%) 100%
        );
        color: rgb(22 35 61 / 65%);
      }
    }

    /** 一级菜单 */
    &:deep(.ant-menu-item-group-title) {
      color: rgb(22 35 61 / 45%);
      padding: 0;
      padding-bottom: 8px;
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
          content: '';
          position: absolute;
          top: 50%;
          left: 34px;
          transform: translateY(-50%);
          width: 2px;
          height: 12px;
          background: rgb(22 35 61 / 30%);
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
