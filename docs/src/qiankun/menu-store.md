---
title: 菜单状态管理
outline: [2, 4]
---

# 菜单状态管理

本文档说明 `apps/main-app/src/stores/menu.ts` 与 `apps/main-app/src/stores/staticMenus.ts` 的职责与实现。该 Store 负责将后端用户数据中的菜单字段按菜单分组读取，并在需要时补充本地静态菜单，最终转化为可渲染的菜单树，同时提供当前路由的菜单匹配能力。

## 职责

- 将后端 `UserData` 中的多个菜单字段（如 `coms8ReadFunctionList`、`crmReadFunctionList`）解析为独立的菜单分组
- 按 `menuKey` 注入本地静态菜单，用于补充 DEMO/示例页面的菜单项
- 维护 `MenuModule` 缓存，供菜单组件、标签栏等消费
- 提供当前路由与菜单的匹配关系（激活菜单、激活分组）
- 按 `activeRule` 聚合所有菜单分组的授权路由，供主应用通过 qiankun props 下发给各子应用

## 核心约束：菜单分组与子应用不是一对一关系

在阅读本文档前，需要先建立两个核心认知：

::: warning

- <span style="color: var(--vp-c-danger-1); font-weight: bold;"> `activeRule` 前缀只能判断路由属于哪个子应用，不能判断它属于哪个菜单分组。</span>菜单归属依赖 `DynamicRoute` 构建的完整路由表进行匹配，无法简化为 `pathPrefix → menuGroup` 的映射。
- <span style="color: var(--vp-c-danger-1); font-weight: bold;">一个菜单分组里可以混合多个子应用的路由。</span>例如"会员管理"下面既可能有 `/vue3-history/memberList`，也可能有 `/crm-v8/memberCard`，它们分属不同子应用，但同属一个菜单分组。
  :::

这两个约束决定了菜单系统的核心设计：必须遍历所有菜单分组完成全量解析，并按 `meta.activeRule` 重新聚合授权路由，而不能直接用"菜单分组 → 子应用"的映射来派发。

## 菜单分组配置

`menuModuleConfigs` 定义了菜单分组与后端数据字段的对应关系：

```ts [apps/main-app/src/stores/menu.ts]
import { MICRO_APP_ACTIVE_RULE } from '@breeze/runtime'

const menuModuleConfigs = [
  {
    menuKey: 'coms8ReadFunctionList',
    title: '餐饮管理',
    iconName: 'menu-catering-management',
    fallbackActiveRule: MICRO_APP_ACTIVE_RULE.OCRM,
  },
  {
    menuKey: 'crmReadFunctionList',
    title: '会员管理',
    iconName: 'menu-membership-management',
    fallbackActiveRule: MICRO_APP_ACTIVE_RULE.VUE3_HISTORY,
  },
]
```

| 字段                 | 说明                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| `menuKey`            | 对应 `UserData` 中的字段名，后端下发的菜单数据从此字段读取                   |
| `title`              | 菜单分组的显示名称                                                           |
| `iconName`           | 菜单分组图标，用于顶部导航渲染                                               |
| `fallbackActiveRule` | 仅表示当菜单 `path` 没有任何子应用 `activeRule` 前缀时，默认归属哪个子应用。 |

### `menuModuleConfigs` 和 `microAppDefinitions` 区别

先看代码：

```ts [apps/main-app/src/stores/menu.ts]
import { MICRO_APP_ACTIVE_RULE } from '@breeze/runtime'

const menuModuleConfigs = [
  {
    // [!code focus]
    menuKey: 'coms8ReadFunctionList',
    // [!code focus]
    fallbackActiveRule: MICRO_APP_ACTIVE_RULE.OCRM,
    title: '餐饮管理',
    iconName: 'menu-catering-management',
  },
  {
    // [!code focus]
    menuKey: 'crmReadFunctionList',
    // [!code focus]
    fallbackActiveRule: MICRO_APP_ACTIVE_RULE.VUE3_HISTORY,
    title: '会员管理',
    iconName: 'menu-membership-management',
  },
]
```

```ts [apps/main-app/src/utils/microAppRegistry.ts]
import { MICRO_APP_ACTIVE_RULE } from '@breeze/runtime'

const microAppDefinitions: MicroAppDefinition[] = [
  {
    // [!code focus]
    activeRule: MICRO_APP_ACTIVE_RULE.OCRM,
    entryMap: {},
  },
  {
    // [!code focus]
    activeRule: MICRO_APP_ACTIVE_RULE.VUE3_HISTORY,
    entryMap: {},
  },
  {
    // [!code focus]
    activeRule: MICRO_APP_ACTIVE_RULE.BREEZE_CRM_V8,
    entryMap: {},
  },
]
```

两者都和"路由"有关，但解决的问题完全不同：

| 配置                  | 关注维度              | 主要作用                                                                       |
| --------------------- | --------------------- | ------------------------------------------------------------------------------ |
| `menuModuleConfigs`   | 菜单分组 / 业务视角   | 决定当前路由属于哪个菜单分组                                                   |
| `microAppDefinitions` | 子应用注册 / 技术视角 | 根据 `activeRule` 决定应该加载哪个子应用，并提供 qiankun 所需的入口 URL 等配置 |

因此**判断路由属于哪个菜单分组**，不能只做路由前缀匹配，而要在初始化阶段一次性构建所有菜单，依赖 `DynamicRoute` 生成的完整路由表进行匹配，详见[核心约束](#核心约束-菜单分组与子应用不是一对一关系)。

## 补充本地静态菜单

调用 `DynamicRoute.create()` 前，会先按 `menuKey` 读取对应静态数据，再与后端返回的菜单列表合并后统一建树。

::: warning 仅用于 DEMO 演示

当前这份静态菜单仅用于演示 `vue3-history` 子应用中的 KeepAlive 页面。在真实业务项目中，不建议把本地硬编码菜单和后端权限菜单长期混用，否则容易让权限来源、排序规则和菜单维护入口变得不清晰。

:::

```ts [apps/main-app/src/stores/staticMenus.ts]
import type { RawMenuItem } from '@breeze/router'

const vue3HistoryStaticMenuData: RawMenuItem[] = [
  {
    id: -10001, // [!code focus]
    name: '开发示例',
    code: 'STATIC_VUE3_HISTORY_EXAMPLES',
    parentCode: 'ROOT', // [!code focus]
    sort: -10000, // [!code focus]
    manualSort: -10000, // [!code focus]
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
    icon: '{"activeMenuPath":"/KeepAliveDemo"}', // [!code focus]
    status: 1,
  },
]

// [!code focus]
const staticMenuDataByMenuKey: Record<string, RawMenuItem[]> = {
  crmReadFunctionList: vue3HistoryStaticMenuData, // [!code focus]
} // [!code focus]

export const getStaticMenuDataByMenuKey = (menuKey: string): RawMenuItem[] =>
  staticMenuDataByMenuKey[menuKey] ?? []
```

这里有几个关键点：

- `staticMenuDataByMenuKey` 以 `menuKey` 为索引，说明静态菜单是“挂到某个菜单分组下”，而不是直接绑定到某个子应用
- `id`、`sort`、`manualSort` 使用负数，是为了和后端真实菜单数据隔离，避免与正常主键或排序值冲突
- `parentCode: 'ROOT'` 说明 `开发示例` 是一级菜单，后续节点再通过 `parentCode` 串成树

## 构建流程

`buildAllMenus(userData)` 是菜单初始化的入口，通常在登录成功后调用。

::: warning 为什么要一次性构建所有菜单

- `activeMenuRoute` 需要根据当前 `route.fullPath` 在**所有菜单分组**里做匹配，才能判断这条路由属于哪个菜单。
- 由于 `activeRule` 只能判断路由属于哪个子应用、不能判断菜单归属，因此不能按需懒加载某个分组，必须一次性构建全部菜单。
  :::

```ts [apps/main-app/src/stores/menu.ts]
const buildAllMenus = (userData: UserData) => {
  resetMenus()
  if (Object.keys(userData).length === 0) return

  const registeredActiveRules = microApps.map((app) => app.activeRule)

  for (const item of menuModuleConfigs) {
    const menuData = userData[item.menuKey as keyof UserData]
    if (!Array.isArray(menuData) || !menuData.length) {
      console.error('[Menu] 菜单数据为空', { menuKey: item.menuKey })
      continue
    }

    // 1. 合并静态菜单数据（如有）与后端返回的菜单数据
    const staticMenuData = getStaticMenuDataByMenuKey(item.menuKey)
    const mergedMenuData = staticMenuData.concat(menuData)

    // 2. 创建 DynamicRoute 实例（内部完成路由树构建 + 匹配器注册）
    const dynamicRoute = DynamicRoute.create(mergedMenuData, {
      menuKey: item.menuKey,
      fallbackActiveRule: item.fallbackActiveRule,
      registeredActiveRules,
    })

    // 3. 将本分组的 routesByActiveRule 合并到全局 authorizedRoutesByActiveRule
    for (const [activeRule, routes] of dynamicRoute.routesByActiveRule) {
      let existingRoutes = authorizedRoutesByActiveRule.get(activeRule)
      if (!existingRoutes) {
        existingRoutes = []
        authorizedRoutesByActiveRule.set(activeRule, existingRoutes)
      }
      existingRoutes.push(...routes)
    }

    // 4. 提取子应用首页，缓存到 menuMap
    const appHomePath = findFirstLeafPath(dynamicRoute.rootRoutes)
    if (!appHomePath) {
      console.error('[Menu] 菜单路由树无叶子节点，跳过分组', {
        menuKey: item.menuKey,
      })
      continue
    }

    menuMap.set(item.menuKey, {
      ...item,
      appHomePath,
      dynamicRoute,
    })
  }
}
```

这里有几个容易混淆的点：

- `fallbackActiveRule` 用于在菜单 `url` 本身不带子应用前缀时兜底补齐
- `registeredActiveRules` 用于判断菜单 `url` 是否已经自带某个子应用前缀，避免重复拼接
- `authorizedRoutesByActiveRule` 是跨分组聚合的结果，同一 `activeRule` 的路由来自多个菜单分组时会累积合并

## 计算属性

### `homePath`

根据当前用户实际拥有的菜单权限，动态返回第一个菜单模块下首个页面的路径，作为登录后的首页。

::: warning 为什么不直接写死一个固定的首页路径？

- 不同账号配置的**菜单权限**不同，固定路径可能指向当前用户没有权限访问的页面。

- 通过动态取第一个可用叶子节点，确保任何账号登录后都能跳转到自己有权限的页面。
  :::

### `activeMenuRoute`

当前路由在菜单树中对应的 `MenuRoute`，跨模块匹配。未匹配到时为 `undefined`。

::: details 示例：当前路由为 /vue3-history/couponListTemp 时

```json
{
  "path": "/vue3-history/couponListTemp",
  "name": "CouponListTemp",
  "meta": {
    "name": "券模版",
    "code": "000200010001",
    "parentCode": "00020001",
    "parentPath": "/vue3-history/00020001",
    "menuKey": "crmReadFunctionList",
    "filePath": "CouponListTemp",
    "activeRule": "/vue3-history/"
  },
  "children": [
    {
      "path": "/vue3-history/couponDetail",
      "name": "CouponDetail",
      "meta": {
        "name": "创建券模版",
        "code": "0002000100010002",
        "parentCode": "000200010001",
        "parentPath": "/vue3-history/couponListTemp",
        "menuKey": "crmReadFunctionList",
        "activeMenuPath": "/couponListTemp",
        "isHiddenMenu": true,
        "filePath": "CouponDetail",
        "activeRule": "/vue3-history/"
      }
    },
    {
      "path": "/vue3-history/creatCouponTemp",
      "name": "CreatCouponTemp",
      "meta": {
        "name": "模版详情",
        "code": "0002000100010003",
        "parentCode": "000200010001",
        "parentPath": "/vue3-history/couponListTemp",
        "menuKey": "crmReadFunctionList",
        "activeMenuPath": "/couponListTemp",
        "isHiddenMenu": true,
        "filePath": "CreatCouponTemp",
        "activeRule": "/vue3-history/"
      }
    }
  ]
}
```

子路由定义了 `activeMenuPath`，因此 `isHiddenMenu` 被自动设为 `true`——它们不会出现在侧边菜单中，但当用户访问这些页面时，侧边栏会选中 `activeMenuPath` 指向的父级菜单项。
:::

### `activeMenuKey`

当前路由所属的菜单模块 key，如 `'coms8ReadFunctionList'`、`'crmReadFunctionList'`。

### `activeMenuModule`

当前路由所属的完整 `MenuModule` 对象。

```ts [apps/main-app/src/stores/menu.ts]
interface MenuModule {
  title: string
  iconName: string
  /** 子应用首页路径 */
  appHomePath: string
  dynamicRoute: DynamicRoute
}
```

每个 `MenuModule` 包含一个完整的 `DynamicRoute` 实例，具备独立的路由树构建和路径匹配能力。

### authorizedRoutesByActiveRule

`buildAllMenus` 在构建菜单的同时，会将所有菜单分组产出的路由按 `meta.activeRule` 聚合到 `authorizedRoutesByActiveRule`：

```ts
/** 按子应用 activeRule 聚合后的授权路由表 */
const authorizedRoutesByActiveRule = shallowReactive(
  new Map<string, MenuRoute[]>(),
)
```

该 Map 的作用是让 `microApp store` 能够按 `activeRule` 取出对应子应用的全部授权路由，通过 qiankun `props` 下发给子应用。

::: warning 为什么不能直接用"菜单分组 → 子应用"的映射来派发授权路由

由于一个菜单分组可以混合多个子应用的路由（见[核心约束](#核心约束-菜单分组与子应用不是一对一关系)），必须**按 `meta.activeRule` 维度重新聚合**，将每条路由按自身的归属归入对应的桶，最终每个子应用拿到属于自己的**全量授权路由**，无论这些路由分散在哪个菜单分组中。
:::

::: details 示例：authorizedRoutesByActiveRule 的最终结构

```ts
Map {
  '/ocrm/#' => [MenuRoute, MenuRoute, ...],
  '/vue3-history/' => [MenuRoute, MenuRoute, ...],
}
```

- key 是子应用的 `activeRule`
- value 是**该子应用在所有菜单分组中**被授权的路由总和。

:::
