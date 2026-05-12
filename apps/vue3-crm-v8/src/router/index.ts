import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import NotFound from '@/views/NotFound.vue'

/** 创建路由实例（history 模式） */
export const generateRouter = (base?: string) => {
  return createRouter({
    history: createWebHistory(base),
    routes: [
      { path: '/', component: HomeView },
      { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
    ],
  })
}

const router = generateRouter()

export default router
