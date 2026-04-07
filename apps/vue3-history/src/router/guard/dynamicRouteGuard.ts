import type { Router } from 'vue-router'
import { createDynamicRouteGuard } from '@breeze/bridge-vue'
import { microAppContext } from '@/utils/microAppContext'

const pages = import.meta.glob([
  '../../views/**/*.vue',
  '!../../views/**/components/*',
])

export const setupDynamicRoute = (router: Router) =>
  createDynamicRouteGuard({
    router,
    pages,
    authorizedRoutes: microAppContext.authorizedRoutes,
    activeRule: microAppContext.activeRule,
  })
