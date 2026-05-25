import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { createAuthGuard } from './guard/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage/index.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'microApp',
    component: () => import('@/views/HomePage/index.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createAuthGuard(router)

export default router
