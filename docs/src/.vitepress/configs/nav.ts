import type { DefaultTheme } from 'vitepress'

export const nav: DefaultTheme.NavItem[] = [
  {
    text: '工程化配置',
    link: '/guide/setup',
  },
  {
    text: 'qiankun 架构',
    link: '/qiankun/dynamic-route',
  },
  {
    text: '优化相关',
    link: '/optimization/font-loading-optimization',
  },
  {
    text: 'Packages',
    items: [
      {
        text: 'utils',
        link: '/packages/utils/',
      },
    ],
  },
]
