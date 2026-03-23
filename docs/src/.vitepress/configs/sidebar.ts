import type { DefaultTheme } from 'vitepress'

export const sidebar: DefaultTheme.SidebarMulti = {
  '/guide/': [
    {
      text: '指南',
      items: [
        { text: '项目初始搭建', link: '/guide/setup' },
        { text: 'Git Hooks 与提交规范', link: '/guide/git-hooks' },
        { text: 'vscode 与 EditorConfig', link: '/guide/editor-config' },
        { text: 'tsconfig 项目配置', link: '/guide/tsconfig' },
        { text: 'ESLint 项目配置', link: '/guide/eslint-config' },
        { text: 'Stylelint 项目配置', link: '/guide/stylelint-config' },
        { text: 'pnpm Workspace 与 Catalog', link: '/guide/pnpm-workspace' },
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
