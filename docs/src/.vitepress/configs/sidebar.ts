import type { DefaultTheme } from 'vitepress'

export const sidebar: DefaultTheme.SidebarMulti = {
  '/packages/eslint-config/': [
    {
      text: 'eslint-config',
      items: [
        { text: '概览', link: '/packages/eslint-config/overview' },
        {
          text: 'ESLint 项目配置',
          link: '/packages/eslint-config/eslint-config',
        },
        {
          text: 'tsconfig 项目配置',
          link: '/packages/eslint-config/tsconfig',
        },
        {
          text: 'VS Code 配置',
          link: '/packages/eslint-config/vscode',
        },
      ],
    },
  ],
  '/packages/utils/': [
    {
      text: 'utils',
      items: [
        { text: '概览', link: '/packages/utils/' },
        { text: 'Request', link: '/packages/utils/request/technical' },
      ],
    },
  ],
  '/packages/qiankun-shared/': [
    {
      text: '简介',
      items: [
        { text: 'qiankun-shared 概览', link: '/packages/qiankun-shared/' },
      ],
    },
    {
      text: 'Router (动态路由)',
      items: [
        { text: '概览', link: '/packages/qiankun-shared/router/overview' },
        {
          text: '菜单与路由规则',
          link: '/packages/qiankun-shared/router/menu-rules',
        },
        { text: 'API 参考', link: '/packages/qiankun-shared/router/api' },
      ],
    },
  ],
}
