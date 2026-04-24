import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/AssetPathTest',
    name: 'AssetPathTest',
    component: () => import('@/views/AssetPathTest/index.vue'),
  },
  {
    path: '/KeepAliveDemo',
    name: 'KeepAliveDemo',
    component: () => import('@/views/KeepAliveDemo/index.vue'),
    children: [
      {
        path: 'Detail',
        name: 'KeepAliveDemoDetail',
        component: () => import('@/views/KeepAliveDemo/Detail.vue'),
      },
    ],
  },
]
