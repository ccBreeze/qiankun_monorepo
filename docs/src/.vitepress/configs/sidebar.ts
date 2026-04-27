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
  '/optimization/': [
    {
      text: '优化相关',
      items: [
        {
          text: 'API/组件自动导入',
          link: '/optimization/auto-import',
        },
        {
          text: 'Vite 构建拆包策略',
          link: '/optimization/vite-code-splitting',
        },
        {
          text: 'font 字体加载优化',
          link: '/optimization/font-loading-optimization',
        },
      ],
    },
  ],
  '/packages/vite-config/': [
    {
      text: 'vite-config',
      items: [{ text: '@breeze/vite-config', link: '/packages/vite-config/' }],
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
        { text: '@breeze/bridge-vue', link: '/qiankun/bridge-vue' },
        { text: '@breeze/runtime', link: '/qiankun/runtime' },
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
      items: [
        { text: '路由协作机制', link: '/qiankun/routing-mechanism' },
        { text: '应用间的通信', link: '/qiankun/runtime-events' },
        { text: '子应用 KeepAlive 缓存机制', link: '/qiankun/keep-alive' },
        {
          text: '子应用切换 KeepAlive 保活',
          link: '/qiankun/keep-alive-micro-app-switch',
        },
      ],
    },
    {
      text: '其他',
      items: [
        { text: 'Vite 动态修改 base', link: '/qiankun/asset-path' },
        { text: 'OCRM 接入问题排查', link: '/qiankun/ocrm-troubleshooting' },
        { text: 'CSS 样式隔离', link: '/qiankun/style-isolation' },
        { text: '常见问题与解决方案', link: '/qiankun/troubleshooting' },
      ],
    },
  ],
}
