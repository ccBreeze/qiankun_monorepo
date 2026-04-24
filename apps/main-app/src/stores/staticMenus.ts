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
    name: '命令式弹窗',
    code: 'STATIC_VUE3_HISTORY_MODAL',
    parentCode: 'STATIC_VUE3_HISTORY_EXAMPLES',
    sort: -9999,
    manualSort: -9999,
    url: '/Modal',
    icon: '',
    status: 1,
  },
  {
    id: -10003,
    name: '页面缓存',
    code: 'STATIC_VUE3_HISTORY_KEEP_ALIVE',
    parentCode: 'STATIC_VUE3_HISTORY_EXAMPLES',
    sort: -9998,
    manualSort: -9998,
    url: '/KeepAliveDemo',
    icon: '',
    status: 1,
  },
  {
    id: -10004,
    name: '页面缓存详情',
    code: 'STATIC_VUE3_HISTORY_KEEP_ALIVE_DETAIL',
    parentCode: 'STATIC_VUE3_HISTORY_KEEP_ALIVE',
    sort: -9997,
    manualSort: -9997,
    url: '/KeepAliveDemo/Detail',
    icon: '{"activeMenuPath":"/KeepAliveDemo"}',
    status: 1,
  },
  {
    id: -10005,
    name: '资源路径测试',
    code: 'STATIC_VUE3_HISTORY_ASSET_PATH_TEST',
    parentCode: 'STATIC_VUE3_HISTORY_EXAMPLES',
    sort: -9996,
    manualSort: -9996,
    url: '/AssetPathTest',
    icon: '',
    status: 1,
  },
]

const staticMenuDataByMenuKey: Record<string, RawMenuItem[]> = {
  crmReadFunctionList: vue3HistoryStaticMenuData,
}

export const getStaticMenuDataByMenuKey = (menuKey: string): RawMenuItem[] =>
  staticMenuDataByMenuKey[menuKey] ?? []
