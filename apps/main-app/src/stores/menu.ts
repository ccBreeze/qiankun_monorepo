/**
 * 菜单状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  MenuRecord,
  DynamicRoute as DynamicRouteClass,
} from '@breeze/qiankun-shared'
import { parseMenuData } from '@/utils/menu'
import { useUserStore } from './user'

export const useMenuStore = defineStore('menu', () => {
  /** 原始菜单路由 */
  const menuRoutes = ref<MenuRecord[]>([])

  /** 路由路径映射表 */
  const pathToRouteMap = ref<Map<string, MenuRecord>>(new Map())

  /** DynamicRoute 实例 */
  const dynamicRoute = ref<DynamicRouteClass | null>(null)

  /**
   * 初始化菜单
   * @param routeBase - 路由基础路径，如 '/crm-v8'
   */
  const initMenu = (routeBase: string = '/crm-v8'): void => {
    const userStore = useUserStore()
    const menuData = userStore.userData.crmReadFunctionList

    if (!menuData || menuData.length === 0) {
      console.warn('菜单数据为空')
      menuRoutes.value = []
      pathToRouteMap.value = new Map()
      dynamicRoute.value = null
      return
    }

    try {
      const result = parseMenuData({
        routeBase,
        menuData,
      })

      menuRoutes.value = result.rootRoutes
      pathToRouteMap.value = result.pathToRouteMap
      dynamicRoute.value = result.dynamicRoute

      console.log('菜单初始化成功', {
        menuCount: result.rootRoutes,
        totalRoutes: result.routes,
      })
    } catch (error) {
      console.error('菜单初始化失败', error)
      menuRoutes.value = []
      pathToRouteMap.value = new Map()
      dynamicRoute.value = null
    }
  }

  /** 重置菜单 */
  const resetMenu = (): void => {
    menuRoutes.value = []
    pathToRouteMap.value = new Map()
    dynamicRoute.value = null
  }

  /**
   * 根据路径获取菜单信息
   */
  const getMenuByPath = (path: string): MenuRecord | undefined => {
    if (!dynamicRoute.value) return undefined
    return dynamicRoute.value.resolvePathToRoute(path)
  }

  return {
    menuRoutes,
    pathToRouteMap,
    dynamicRoute,
    initMenu,
    resetMenu,
    getMenuByPath,
  }
})
