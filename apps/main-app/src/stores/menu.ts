/**
 * 菜单状态管理
 */
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import {
  DynamicRoute,
  ROOT_CODE,
  type MenuRecord,
} from '@breeze/qiankun-shared'
import { useUserStore } from './user'

export const useMenuStore = defineStore('menu', () => {
  /** 原始菜单路由（根级别菜单，用于渲染） */
  const menuRoutes = ref<MenuRecord[]>([])

  /** DynamicRoute 实例（使用 shallowRef 避免深度响应式开销） */
  const dynamicRoute = shallowRef<DynamicRoute | null>(null)

  /**
   * 初始化菜单
   * @param routeBase - 路由基础路径，如 '/crm-v8'
   */
  const initMenu = (routeBase: string = '/crm-v8'): void => {
    const userStore = useUserStore()
    const menuData = userStore.userData.crmReadFunctionList

    if (!menuData || menuData.length === 0) {
      console.warn('[MenuStore] 菜单数据为空')
      resetMenu()
      return
    }

    try {
      const parser = new DynamicRoute({ routeBase })
      const treeCodeMap = parser.generateRoutes(menuData)

      dynamicRoute.value = parser
      menuRoutes.value = treeCodeMap.get(ROOT_CODE)?.children || []

      console.log('[MenuStore] 菜单初始化成功', {
        menuCount: menuRoutes.value.length,
        totalRoutes: parser.allRoutes.length,
      })
    } catch (error) {
      console.error('[MenuStore] 菜单初始化失败', error)
      resetMenu()
    }
  }

  /** 重置菜单 */
  const resetMenu = (): void => {
    menuRoutes.value = []
    dynamicRoute.value = null
  }

  /**
   * 根据路径获取菜单信息
   * @param path - 路由路径
   */
  const getMenuByPath = (path: string): MenuRecord | undefined => {
    return dynamicRoute.value?.resolvePathToRoute(path)
  }

  /**
   * 获取路径的面包屑
   * @param path - 路由路径
   * @returns 从根到当前路径的菜单记录数组
   */
  const getBreadcrumb = (path: string): MenuRecord[] => {
    return dynamicRoute.value?.getBreadcrumb(path) || []
  }

  return {
    // 状态
    menuRoutes,
    dynamicRoute,
    // 方法
    initMenu,
    resetMenu,
    getMenuByPath,
    getBreadcrumb,
  }
})
