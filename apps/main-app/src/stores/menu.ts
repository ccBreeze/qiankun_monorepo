/**
 * 菜单状态管理
 */
import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import { DynamicRoute, type MenuRoute } from '@breeze/qiankun-shared'
import type { UserData } from '@/types/user'
import { useRoute } from 'vue-router'
import {
  type MicroAppConfig,
  microAppRegistry,
  resolvePathPrefix,
} from '@/views/MicroApp/utils/registry'

interface MenuModule {
  title: string
  iconName: string
  packageName: MicroAppConfig['packageName']
  /** 子应用首页路径 */
  appHomePath: string
  menuRoutes: MenuRoute[]
  dynamicRoute: DynamicRoute
}

const menuModuleConfigs = [
  {
    // 对应 UserData 中的字段名
    menuKey: 'coms8ReadFunctionList',
    title: '餐饮管理',
    iconName: 'menu-catering-management',
    packageName: 'ocrm',
  },
  {
    menuKey: 'crmReadFunctionList',
    title: '会员管理',
    iconName: 'menu-membership-management',
    packageName: 'candao-crm',
  },
] as const

type MenuKey = (typeof menuModuleConfigs)[number]['menuKey']

/** 沿第一个非隐藏子节点向下查找叶子节点的路径 */
const findFirstLeafPath = (routes: MenuRoute[]): string | undefined => {
  let current = routes.find((r) => !r.meta.isHiddenMenu)
  while (current?.children?.length) {
    const visibleChild = current.children.find((r) => !r.meta.isHiddenMenu)
    // 子级全部隐藏时，停留在当前节点
    if (!visibleChild) break
    current = visibleChild
  }
  return current?.path
}

export const useMenuStore = defineStore('menu', () => {
  const route = useRoute()

  /** 已构建的菜单缓存 */
  const menuMap = shallowReactive(new Map<MenuKey, MenuModule>())

  /** 首页（动态匹配）*/
  const homePath = computed(() => {
    // 第一个菜单分组的默认落地页
    return menuMap.values().next().value?.appHomePath ?? '/'
  })

  /** 清空菜单缓存 */
  const resetMenus = (): void => {
    menuMap.clear()
  }

  /** 根据 menuModuleConfigs 解析用户菜单数据，构建路由树并缓存 */
  const buildAllMenus = (userData: UserData): void => {
    resetMenus()
    if (Object.keys(userData).length === 0) return

    // 一次性构建所有菜单
    // 通过 route.fullPath 判断属于哪个菜单
    for (const item of menuModuleConfigs) {
      const menuData = userData[item.menuKey]
      if (!menuData?.length) {
        console.warn('[Menu] 菜单数据为空', { menuKey: item.menuKey })
        continue
      }

      const pathPrefix = resolvePathPrefix(item.packageName)
      const dynamicRoute = DynamicRoute.create(menuData, {
        menuKey: item.menuKey,
        pathPrefix,
        registeredPrefixes: [...microAppRegistry.keys()],
      })
      const menuRoutes = dynamicRoute.rootRoutes
      const appHomePath = findFirstLeafPath(menuRoutes)
      if (!appHomePath) {
        console.warn('[Menu] 菜单路由树无叶子节点，跳过分组', {
          menuKey: item.menuKey,
        })
        continue
      }

      menuMap.set(item.menuKey, {
        ...item,
        appHomePath,
        menuRoutes,
        dynamicRoute,
      })
    }
  }

  /** 当前路由在所有菜单中匹配到的原始路由记录 */
  const activeMenuRoute = computed<MenuRoute | undefined>(() => {
    for (const [, entry] of menuMap) {
      const matched = entry.dynamicRoute.resolvePathToRoute(route.fullPath)
      if (matched) return matched
    }
    return undefined
  })
  /** 当前路由匹配的激活菜单 key */
  const activeMenuKey = computed<MenuKey | undefined>(() => {
    return activeMenuRoute.value?.meta.menuKey as MenuKey | undefined
  })
  /** 当前路由匹配的激活菜单 */
  const activeMenuModule = computed<MenuModule | undefined>(() => {
    return activeMenuKey.value ? menuMap.get(activeMenuKey.value) : undefined
  })

  return {
    menuMap,
    homePath,
    activeMenuRoute,
    activeMenuKey,
    activeMenuModule,
    buildAllMenus,
  }
})
