/**
 * 菜单状态管理
 */
import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import { DynamicRoute, type MenuRoute } from '@breeze/router'
import { MICRO_APP_ACTIVE_RULE } from '@breeze/runtime'
import type { UserData } from '@/types/user'
import { useRoute } from 'vue-router'
import { microApps } from '@/utils/microAppRegistry'
import { getStaticMenuDataByMenuKey } from './staticMenus'

interface MenuModule {
  title: string
  iconName: string
  /** 子应用首页路径 */
  appHomePath: string
  dynamicRoute: DynamicRoute
}

const menuModuleConfigs = [
  {
    // 对应 UserData 中的字段名
    menuKey: 'coms8ReadFunctionList',
    fallbackActiveRule: MICRO_APP_ACTIVE_RULE.OCRM,
    title: '餐饮管理',
    iconName: 'menu-catering-management',
  },
  {
    menuKey: 'crmReadFunctionList',
    fallbackActiveRule: MICRO_APP_ACTIVE_RULE.VUE3_HISTORY,
    title: '会员管理',
    iconName: 'menu-membership-management',
  },
]

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
  const menuMap = shallowReactive(new Map<string, MenuModule>())
  /** 按子应用 activeRule 聚合后的授权路由表 */
  const authorizedRoutesByActiveRule = shallowReactive(
    new Map<string, MenuRoute[]>(),
  )

  /** 首页（动态匹配）*/
  const homePath = computed(() => {
    // 第一个菜单分组的默认落地页
    return menuMap.values().next().value?.appHomePath ?? '/'
  })

  /** 清空菜单缓存 */
  const resetMenus = () => {
    menuMap.clear()
    authorizedRoutesByActiveRule.clear()
  }

  /** 根据 menuModuleConfigs 解析用户菜单数据，构建路由树并缓存 */
  const buildAllMenus = (userData: UserData) => {
    resetMenus()
    if (Object.keys(userData).length === 0) return

    const registeredActiveRules = microApps.map((app) => app.activeRule)

    // 一次性构建所有菜单
    for (const item of menuModuleConfigs) {
      const menuData = userData[item.menuKey as keyof UserData]
      if (!Array.isArray(menuData) || !menuData.length) {
        console.error('[Menu] 菜单数据为空', { menuKey: item.menuKey })
        continue
      }

      // 仅用于 DEMO 演示，实际项目中请勿将静态菜单数据与后端返回的菜单数据混合在一起
      // 合并静态菜单数据（如有）与后端返回的菜单数据
      const staticMenuData = getStaticMenuDataByMenuKey(item.menuKey)
      const mergedMenuData = staticMenuData.concat(menuData)

      const dynamicRoute = DynamicRoute.create(mergedMenuData, {
        menuKey: item.menuKey,
        fallbackActiveRule: item.fallbackActiveRule,
        registeredActiveRules,
      })
      for (const [activeRule, routes] of dynamicRoute.routesByActiveRule) {
        let existingRoutes = authorizedRoutesByActiveRule.get(activeRule)
        if (!existingRoutes) {
          existingRoutes = []
          authorizedRoutesByActiveRule.set(activeRule, existingRoutes)
        }
        existingRoutes.push(...routes)
      }

      const appHomePath = findFirstLeafPath(dynamicRoute.rootRoutes)
      if (!appHomePath) {
        console.error('[Menu] 菜单路由树无叶子节点，跳过分组', {
          menuKey: item.menuKey,
        })
        continue
      }
      menuMap.set(item.menuKey, {
        ...item,
        appHomePath,
        dynamicRoute,
      })
    }
  }

  /** 当前路由在所有菜单中匹配到的原始路由记录 */
  const activeMenuRoute = computed(() => {
    for (const [, entry] of menuMap) {
      const matched = entry.dynamicRoute.resolvePathToRoute(route.fullPath)
      if (matched) return matched
    }
    return undefined
  })
  /** 当前路由匹配的激活菜单 key */
  const activeMenuKey = computed(() => {
    return activeMenuRoute.value?.meta.menuKey
  })
  /** 当前路由匹配的激活菜单 */
  const activeMenuModule = computed(() => {
    return activeMenuKey.value ? menuMap.get(activeMenuKey.value) : undefined
  })

  return {
    menuMap,
    authorizedRoutesByActiveRule,
    homePath,
    activeMenuRoute,
    activeMenuKey,
    activeMenuModule,
    buildAllMenus,
  }
})
