import type { DefaultTheme } from 'vitepress'

export const nav: DefaultTheme.NavItem[] = [
  {
    text: '工程化配置',
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
