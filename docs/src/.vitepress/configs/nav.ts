import type { DefaultTheme } from 'vitepress'

export const nav: DefaultTheme.NavItem[] = [
  {
    text: '指南',
    link: '/guide/setup',
  },
  {
    text: 'Packages',
    items: [
      {
        text: 'utils',
        link: '/packages/utils/',
      },
      {
        text: 'qiankun-shared',
        link: '/packages/qiankun-shared/',
      },
    ],
  },
]
