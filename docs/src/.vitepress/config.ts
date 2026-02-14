import { defineConfig } from 'vitepress'
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
  },
  themeConfig: {
    nav,
    sidebar,
  },
  vite: {
    server: {
      port: 5200,
      strictPort: true,
    },
  },
})
