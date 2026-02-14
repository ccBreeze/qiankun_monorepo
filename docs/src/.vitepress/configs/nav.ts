import type { DefaultTheme } from 'vitepress'

export const nav: DefaultTheme.NavItem[] = [
  {
    text: 'Packages',
    items: [
      {
        text: 'eslint-config',
        link: '/packages/eslint-config/overview',
      },
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
