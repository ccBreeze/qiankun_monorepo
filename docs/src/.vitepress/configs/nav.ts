import type { DefaultTheme } from 'vitepress'
import { sidebar } from './sidebar'

/** 取 sidebar 某个 prefix 分组中第一篇文章的链接 */
function firstLink(prefix: keyof typeof sidebar): string {
  const section = sidebar[prefix]
  const groups = Array.isArray(section) ? section : [section]
  return String(groups[0]?.items?.[0]?.link ?? prefix)
}

export const nav: DefaultTheme.NavItem[] = [
  {
    text: '工程化配置',
    link: firstLink('/guide/'),
  },
  {
    text: 'qiankun 架构',
    link: firstLink('/qiankun/'),
  },
  {
    text: '优化相关',
    link: firstLink('/optimization/'),
  },
  {
    text: 'Packages',
    items: [
      {
        text: 'utils',
        link: firstLink('/packages/utils/'),
      },
    ],
  },
]
