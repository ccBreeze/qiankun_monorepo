---
title: 动态路由（qiankun-shared）
---

本页描述 `packages/qiankun-shared/src/router` 这套"后端菜单 → 前端路由树 → 菜单渲染/面包屑"的通用能力。它在主应用里与 `ConsoleMenu` 的使用方式是配套设计的：后端下发 `FunctionListItem[]`，前端生成 `MenuRecord[]`，再由菜单组件进行展示与选中态维护。

```ts
import { DynamicRoute } from '@breeze/qiankun-shared'
import type { FunctionListItem } from '@breeze/qiankun-shared'

const dynamicRoute = new DynamicRoute({
  // [!code highlight]
  routeBase: '/crm-v8',
  menuKey: 'coms8ReadFunctionList',
})

const list: FunctionListItem[] = []
dynamicRoute.generateRoutes(list) // [!code highlight]

const current = dynamicRoute.resolvePathToRoute('/crm-v8/home') // [!code highlight]
const breadcrumb = dynamicRoute.getBreadcrumb('/crm-v8/user/profile') // [!code highlight]
```

:::tip 你会得到什么

- **rootRoutes**：可直接用于渲染左侧菜单的"根级路由列表"（已排除 `hiddenMenu` 菜单对父级 redirect 的影响）
- **allRoutes**：包含隐藏菜单在内的"全量路由列表"（用于匹配、面包屑、选中态回退）
- **resolvePathToRoute(path)**：根据当前 URL 找到对应的菜单记录（支持动态路由）
- **getBreadcrumb(path)**：拿到从根到当前页的祖先链（用于面包屑）
  :::

## 主应用如何对接

主应用在路由层面通常只需要承接一个"微应用容器页"，并通过 `alias` 接住菜单生成出来的路径（例如 `/crm/...`、`/crm-v8/...`），从而让菜单跳转始终有效。

## ConsoleMenu 如何消费这些数据

`ConsoleMenu` 的核心依赖是"按路径命中菜单 + 隐藏菜单的高亮回退"：

- 渲染：递归将 `menuRoutes` 转成 `items`，遇到 `meta.isHiddenMenu === true` 的节点直接不渲染
- 选中：路径变化时根据 `getMenuByPath()` 命中菜单；若命中的是隐藏菜单，则回退到 `meta.parentPath` 对应的父菜单高亮

更完整的规则见「菜单与路由规则」页。

## 相关源码位置

- `packages/qiankun-shared/src/router/dynamicRoute.ts`
- `packages/qiankun-shared/src/router/routeTreeBuilder.ts`
- `packages/qiankun-shared/src/router/routeMatcher.ts`
- `packages/qiankun-shared/src/router/urlUtils.ts`
