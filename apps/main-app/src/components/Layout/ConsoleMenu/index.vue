<template>
  <div class="menu-wrap">
    <a-menu
      v-model:selected-keys="menu.selectedKeys"
      :open-keys="menu.openKeys"
      :items="menu.items"
      mode="inline"
      class="menu"
      @click="handleClick"
      @open-change="onOpenChange"
    >
    </a-menu>
  </div>
</template>

<script lang="ts" setup>
import { watch, reactive, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMenuStore } from '@/stores/menu'
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'
import type { MenuRecord } from '@breeze/qiankun-shared'

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

interface MenuState {
  items: MenuItem[]
  openKeys: string[]
  selectedKeys: string[]
}

const route = useRoute()
const router = useRouter()
const menuStore = useMenuStore()

const menu = reactive<MenuState>({
  items: [],
  openKeys: [],
  selectedKeys: [],
})

/**
 * 规范化路径，移除 query 和 hash 参数
 * @param fullPath - 完整路径（可能包含 query 和 hash）
 * @returns 规范化后的路径
 */
const normalizePath = (fullPath: string) => {
  // /xxx?id=1#hash  ->  /xxx
  return fullPath.replace(/[?#].*$/, '')
}

/**
 * 获取实际用于匹配菜单的路径
 * 隐藏菜单自动使用父节点的 path
 * @param fullPath - 完整路径
 * @returns 用于匹配菜单的路径
 */
const getMatchPath = (fullPath: string) => {
  const path = normalizePath(fullPath)
  const routeInfo = menuStore.getMenuByPath(path)

  // 如果是隐藏菜单，使用父节点的 path
  if (routeInfo?.meta?.isHiddenMenu && routeInfo.meta.parentPath) {
    return routeInfo.meta.parentPath
  }

  return path
}

/** 获取父级菜单路径 */
const getParentKeys = (path: string) => {
  // 向上递归父级菜单
  const parentKeys: string[] = []
  let currentPath: string | undefined = path

  while (currentPath) {
    const routeInfo = menuStore.getMenuByPath(currentPath)
    const parentPath = routeInfo?.meta?.parentPath

    if (!parentPath) break

    parentKeys.push(parentPath)
    currentPath = parentPath
  }

  return parentKeys.reverse()
}

/** 自动展开菜单 */
const autoExpandMenu = (fullPath: string) => {
  const path = getMatchPath(fullPath)
  const parentKeys = getParentKeys(path)
  menu.openKeys = [...parentKeys, path]
}

/** 更新当前选中的菜单项 */
const updateSelectedMenuPath = (fullPath: string) => {
  const path = getMatchPath(fullPath)
  menu.selectedKeys = [path]
}

/** 路由改变，自动更新菜单选中 */
watch(
  () => route.fullPath,
  (fullPath) => {
    updateSelectedMenuPath(fullPath)
    autoExpandMenu(fullPath)
  },
  {
    immediate: true,
  },
)

/** 菜单数据变化时，刷新菜单 */
watch(
  () => menuStore.menuRoutes,
  () => {
    refreshMenu()
  },
  {
    immediate: true,
  },
)

/** 刷新菜单 */
function refreshMenu() {
  menu.items = generateMenu(menuStore.menuRoutes)
  // 自动展开菜单
  autoExpandMenu(route.fullPath)
}

/** 生成菜单 */
function generateMenu(list: MenuRecord[], level = 0): MenuItem[] {
  if (!list.length) return []

  return list
    .map((item) => {
      // 隐藏的菜单不显示
      if (item.meta?.isHiddenMenu === true) return

      const children = generateMenu(item.children || [], level + 1) // 递归
      return {
        ...getLevelConfig(level, item.meta?.iconName),
        label: item.meta?.name || item.name || '',
        key: item.path || item.name,
        children: children.length ? children : undefined,
        path: item.path,
      } as MenuItem
    })
    .filter((item) => item !== undefined) // 移除 undefined
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
const handleClick = ({ item }: { item: MenuItem }) => {
  // 仅叶子节点才会触发点击事件
  if (!item.path) return
  void router.push(item.path)
}

/** 只展开当前父级菜单 */
const onOpenChange = (openKeys: string[]) => {
  const set = new Set(menu.openKeys)
  const latestOpenKey = openKeys.find((key) => set.has(key) === false)

  // 如果没有新的菜单项被打开，则保留当前的打开状态
  if (!latestOpenKey) {
    menu.openKeys = openKeys
    return
  }

  autoExpandMenu(latestOpenKey)
}
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
