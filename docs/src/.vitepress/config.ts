import { defineConfig } from 'vitepress'
import { figure } from '@mdit/plugin-figure'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from 'vitepress-plugin-group-icons'
import llmstxt from 'vitepress-plugin-llms'
import { nav } from './configs/nav'
import { sidebar } from './configs/sidebar'

export default defineConfig({
  base: process.env.VITEPRESS_BASE ?? '/',
  title: 'Docs',
  appearance: {
    initialValue: 'dark',
  },
  markdown: {
    theme: {
      light: 'one-dark-pro',
      dark: 'one-dark-pro',
    },
    config(md) {
      md.use(groupIconMdPlugin)
      md.use(figure)
    },
  },
  themeConfig: {
    nav,
    sidebar,
    outline: {
      level: [2, 3],
      label: '目录',
    },
  },
  vite: {
    plugins: [groupIconVitePlugin(), llmstxt()],
    server: {
      port: 8300,
      strictPort: true,
    },
  },
})
