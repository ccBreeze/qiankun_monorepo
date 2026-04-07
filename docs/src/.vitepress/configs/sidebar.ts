import type { DefaultTheme } from 'vitepress'

export const sidebar: DefaultTheme.SidebarMulti = {
  '/guide/': [
    {
      text: '工程化配置',
      items: [
        { text: 'pnpm Workspace', link: '/guide/pnpm-workspace' },
        { text: '项目初始搭建', link: '/guide/setup' },
        { text: 'Git Hooks 与提交规范', link: '/guide/git-hooks' },
        { text: 'vscode 与 EditorConfig', link: '/guide/editor-config' },
        { text: 'tsconfig', link: '/guide/tsconfig' },
        { text: 'ESLint', link: '/guide/eslint-config' },
        { text: 'Stylelint', link: '/guide/stylelint-config' },
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
  '/qiankun/': [
    {
      text: 'Packages',
      items: [
        { text: '@breeze/router', link: '/qiankun/dynamic-route' },
        { text: '@breeze/runtime', link: '/qiankun/runtime' },
        { text: '@breeze/bridge-vue', link: '/qiankun/bridge-vue' },
      ],
    },
    {
      text: '主应用（壳）',
      items: [
        { text: '子应用注册表', link: '/qiankun/micro-app-registry' },
        { text: '子应用状态管理', link: '/qiankun/micro-app-store' },
        { text: '菜单状态管理', link: '/qiankun/menu-store' },
        { text: '标签栏状态管理', link: '/qiankun/tab-bar-store' },
      ],
    },
    {
      text: '架构',
      items: [{ text: '路由机制', link: '/qiankun/routing-mechanism' }],
    },
    {
      text: '其他',
      items: [{ text: '常见问题与解决方案', link: '/qiankun/troubleshooting' }],
    },
  ],
}
