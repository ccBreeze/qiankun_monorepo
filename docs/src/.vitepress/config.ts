import { defineConfig } from 'vitepress'
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
      light: 'github-dark',
      dark: 'github-dark',
    },
    config(md) {
      md.use(groupIconMdPlugin)
    },
  },
  themeConfig: {
    nav,
    sidebar,
  },
  vite: {
    plugins: [groupIconVitePlugin(), llmstxt()],
    server: {
      port: 5200,
      strictPort: true,
    },
  },
})
