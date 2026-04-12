import type { RawMenuItem } from '@breeze/router'

const vue3HistoryStaticMenuData: RawMenuItem[] = [
  {
    id: -10001,
    name: '开发示例',
    code: 'STATIC_VUE3_HISTORY_EXAMPLES',
    parentCode: 'ROOT',
    sort: -10000,
    manualSort: -10000,
    url: 'STATIC_VUE3_HISTORY_EXAMPLES',
    icon: '',
    status: 1,
  },
  {
    id: -10002,
    name: '页面缓存',
    code: 'STATIC_VUE3_HISTORY_KEEP_ALIVE',
    parentCode: 'STATIC_VUE3_HISTORY_EXAMPLES',
    sort: -9999,
    manualSort: -9999,
    url: '/KeepAliveDemo',
    icon: '',
    status: 1,
  },
  {
    id: -10003,
    name: '页面缓存详情',
    code: 'STATIC_VUE3_HISTORY_KEEP_ALIVE_DETAIL',
    parentCode: 'STATIC_VUE3_HISTORY_KEEP_ALIVE',
    sort: -9998,
    manualSort: -9998,
    url: '/KeepAliveDemo/Detail',
    icon: '{"activeMenuPath":"/KeepAliveDemo"}',
    status: 1,
  },
]

const staticMenuDataByMenuKey: Record<string, RawMenuItem[]> = {
  crmReadFunctionList: vue3HistoryStaticMenuData,
}

export const getStaticMenuDataByMenuKey = (menuKey: string): RawMenuItem[] =>
  staticMenuDataByMenuKey[menuKey] ?? []
