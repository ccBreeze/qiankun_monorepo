import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/Demo/AutoImportExample',
      name: 'Demo-AutoImportExample',
      component: () => import('../views/Demo/AutoImportExample.vue'),
    },
    {
      path: '/Demo/StylelintTest',
      name: 'Demo-StylelintTest',
      component: () => import('../views/Demo/StylelintTest.vue'),
    },
  ],
})

export default router
