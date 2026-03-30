---
title: 菜单状态管理
outline: [2, 4]
---

# 菜单状态管理

本文档说明 `apps/main-app/src/stores/menu.ts` 的职责与实现。该 Store 负责将后端用户数据中的菜单字段转化为可渲染的菜单树，并提供当前路由的菜单匹配能力。

## 职责

- 将后端 `UserData` 中的多个菜单字段（如 `coms8ReadFunctionList`、`crmReadFunctionList`）解析为独立的菜单分组
- 维护 `MenuModule` 缓存，供菜单组件、标签栏等消费
- 提供当前路由与菜单的匹配关系（激活菜单、激活分组）

## 菜单分组配置

`menuModuleConfigs` 定义了菜单分组与后端数据字段的对应关系：

```ts [apps/main-app/src/stores/menu.ts]
const menuModuleConfigs = [
  {
    menuKey: 'coms8ReadFunctionList',
    title: '餐饮管理',
    iconName: 'menu-catering-management',
    packageName: 'ocrm',
  },
  {
    menuKey: 'crmReadFunctionList',
    title: '会员管理',
    iconName: 'menu-membership-management',
    packageName: 'breeze-crm',
  },
] as const
```

| 字段          | 说明                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| `menuKey`     | 对应 `UserData` 中的字段名，后端下发的菜单数据从此字段读取                               |
| `title`       | 菜单分组的显示名称                                                                       |
| `iconName`    | 菜单分组图标，用于顶部导航渲染                                                           |
| `packageName` | 微应用包名，通过 `resolvePathPrefix` 从注册表查找对应的 `pathPrefix` 传给 `DynamicRoute` |

### `menuModuleConfigs` 和 `microAppConfigs` 不是一回事

先看代码：

```ts [apps/main-app/src/stores/menu.ts]
const menuModuleConfigs = [
  {
    menuKey: 'coms8ReadFunctionList',
    title: '餐饮管理',
    iconName: 'menu-catering-management',
    packageName: 'ocrm',
  },
  {
    menuKey: 'crmReadFunctionList',
    title: '会员管理',
    iconName: 'menu-membership-management',
    packageName: 'breeze-crm',
  },
] as const
```

```ts [apps/main-app/src/views/MicroApp/utils/registry.ts]
const microAppConfigs = [
  {
    packageName: 'ocrm',
    pathPrefix: '/ocrm/#/',
  },
  {
    packageName: 'breeze-crm',
  },
  {
    packageName: 'breeze-crm-v8',
  },
]
```

两者都和“路由”有关，但解决的问题完全不同：

| 配置                | 关注维度              | 主要作用                                 |
| ------------------- | --------------------- | ---------------------------------------- |
| `menuModuleConfigs` | 菜单分组 / 业务视角   | 决定当前路由属于哪个菜单分组             |
| `microAppConfigs`   | 微应用注册 / 技术视角 | 根据 `pathPrefix` 决定应该加载哪个微应用 |

这两个问题不是一一对应关系。

::: warning 不能只靠 pathPrefix 判断菜单分组
通过 `route.fullPath` 解析出的前缀，只能判断当前页面属于哪个微应用，不能直接推出它属于哪个菜单分组。因为一个菜单分组里，完全可能混合多个不同 `pathPrefix` 的页面，也就是混合多个不同子应用的路由。
:::

例如：

- 顶部菜单“会员管理”是一个业务分组
- 它下面既可能有 `/crm/...` 的页面，也可能有 `/crm-v8/...` 的页面
- 这两个前缀会命中不同的微应用，但在菜单层面仍然属于同一个菜单分组

因此菜单归属不能只做前缀匹配，而要依赖 `DynamicRoute` 生成出来的完整菜单路由表进行匹配。

## 构建流程

`buildAllMenus(userData)` 是菜单初始化的入口，通常在登录成功后调用。

::: warning 为什么要一次性构建所有菜单

- `activeMenuRoute` 根据当前 `route.fullPath` 在**所有菜单**里做匹配，判断这条路由到底属于哪个菜单
- 仅靠 `route.fullPath` 的<span style="color: #d63384; font-weight: bold;">前缀只能判断属于哪个微应用，不能判断属于哪个菜单</span>，所以不能把菜单判断简化成 `pathPrefix -> menuGroup` 的映射

:::

```ts [apps/main-app/src/stores/menu.ts]
const buildAllMenus = (userData: UserData): void => {
  resetMenus()
  if (Object.keys(userData).length === 0) return

  for (const item of menuModuleConfigs) {
    const menuData = userData[item.menuKey]
    if (!menuData?.length) {
      console.warn('[Menu] 菜单数据为空', { menuKey: item.menuKey })
      continue
    }

    // [!code focus]
    // 1. 创建 DynamicRoute 实例（内部完成路由树构建 + 匹配器注册）
    // [!code focus]
    const pathPrefix = resolvePathPrefix(item.packageName) // [!code focus]
    const dynamicRoute = DynamicRoute.create(menuData, {
      menuKey: item.menuKey, // [!code focus]
      pathPrefix, // [!code focus]
      registeredPrefixes: [...microAppRegistry.keys()], // [!code focus]
    }) // [!code focus]

    // [!code focus]
    // 2. 提取根级菜单路由和子应用首页
    const menuRoutes = dynamicRoute.rootRoutes // [!code focus]
    const appHomePath = findFirstLeafPath(menuRoutes) // [!code focus]
    if (!appHomePath) {
      console.warn('[Menu] 菜单路由树无叶子节点，跳过分组', {
        menuKey: item.menuKey,
      })
      continue
    }

    // [!code focus]
    // 3. 缓存到 menuMap
    // [!code focus]
    menuMap.set(item.menuKey, {
      // [!code focus]
      ...item, // [!code focus]
      appHomePath, // [!code focus]
      menuRoutes, // [!code focus]
      dynamicRoute, // [!code focus]
    }) // [!code focus]
  }
}
```

::: tip DynamicRoute 与菜单分组的关系
每个菜单分组拥有独立的 `DynamicRoute` 实例。这意味着不同分组（如餐饮管理、会员管理）的路由树相互隔离，各自维护自己的路由匹配器和路径祖先链。详见 [动态路由源码解析](/qiankun/dynamic-route)。
:::

## 计算属性

### `homePath`

根据当前用户实际拥有的菜单权限，动态返回第一个菜单模块下首个页面的路径，作为登录后的首页。

::: details 为什么不直接写死一个固定的首页路径？

- 不同账号配置的菜单权限不同，固定路径可能指向当前用户没有权限访问的页面。

- 通过动态取第一个可用叶子节点，确保任何账号登录后都能跳转到自己有权限的页面。
  :::

### `activeMenuRoute`

当前路由在菜单树中对应的 `MenuRoute`，跨模块匹配。未匹配到时为 `undefined`。

::: details 示例：当前路由为 /crm/couponListTemp 时

```json
{
  "path": "/crm/couponListTemp",
  "name": "CouponListTemp",
  "meta": {
    "name": "券模版",
    "code": "000200010001",
    "parentCode": "00020001",
    "parentPath": "/crm/00020001",
    "menuKey": "crmReadFunctionList",
    "filePath": "CouponListTemp",
    "pathPrefix": "/crm/"
  },
  "children": [
    {
      "path": "/crm/couponDetail",
      "name": "CouponDetail",
      "meta": {
        "name": "创建券模版",
        "code": "0002000100010002",
        "parentCode": "000200010001",
        "parentPath": "/crm/couponListTemp",
        "menuKey": "crmReadFunctionList",
        "activeMenuPath": "/couponListTemp",
        "isHiddenMenu": true,
        "filePath": "CouponDetail",
        "pathPrefix": "/crm/"
      }
    },
    {
      "path": "/crm/creatCouponTemp",
      "name": "CreatCouponTemp",
      "meta": {
        "name": "模版详情",
        "code": "0002000100010003",
        "parentCode": "000200010001",
        "parentPath": "/crm/couponListTemp",
        "menuKey": "crmReadFunctionList",
        "activeMenuPath": "/couponListTemp",
        "isHiddenMenu": true,
        "filePath": "CreatCouponTemp",
        "pathPrefix": "/crm/"
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
  packageName: MicroAppConfig['packageName']
  /** 子应用首页路径 */
  appHomePath: string
  menuRoutes: MenuRoute[]
  dynamicRoute: DynamicRoute
}
```

每个 `MenuModule` 包含一个完整的 `DynamicRoute` 实例，具备独立的路由树构建和路径匹配能力。
