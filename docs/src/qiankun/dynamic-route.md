---
title: 动态路由源码解析
outline: [2, 4]
---

# 动态路由源码解析

本文档按"核心概念 → 文件职责"的顺序，说明 `packages/router/src` 如何把后端菜单数据转换成可渲染、可匹配、可回溯的路由结构。

## 整体结构

```text
packages/router/src/
├── index.ts              ← 统一导出入口
├── types.ts              ← 领域类型定义
├── parsers.ts           ← URL 解析与路径规范化
├── RouteTreeBuilder.ts   ← 菜单列表转路由树
├── RouteMatcher.ts       ← 路径匹配与祖先链回溯
└── DynamicRoute.ts       ← 对外门面类
```

## types.ts

这个文件定义了整个模块的领域模型，是阅读其他文件时的字典。

最值得先记住的几个类型：

| 类型                  | 用途                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `RawMenuItem`         | 接口返回的路由原始数据                                                                                |
| `MenuRouteMeta`       | 扩展的路由元数据                                                                                      |
| `MenuRoute`           | 模块内部统一流转的路由记录                                                                            |
| `DynamicRouteOptions` | `DynamicRoute` / `RouteTreeBuilder` 的构造参数                                                        |
| `ResolvedRouteInfo`   | `resolveRoute` 的返回值，同时作为 `transformResolvedRoute` 的返回类型（纯路由字段，不含 `extraInfo`） |

::: details MenuRouteMeta 的组成
`MenuRouteMeta` 继承自 `RawMenuItem`、`MenuExtra`、`Pick<ResolvedRouteInfo, 'activeRule' | 'filePath'>`，并额外补充运行时字段：

- `parentPath`：父菜单路径，建树阶段填充
- `menuKey`：菜单分组标识

它是组件和匹配器统一依赖的类型，避免各处分别引用多个源类型。
:::

::: details MenuRoute 的组成
`MenuRoute` 继承自 `Pick<ResolvedRouteInfo, 'name' | 'path' | 'component'>`，其中 `name` 同时作为 vue-router 的路由名称和 keep-alive 的匹配标识。
:::

## parsers.ts

这个文件只做"单条菜单"的纯函数处理，没有状态。

### `normalizePath(path)`

职责是把任意输入标准化成可用于匹配的 pathname：

```ts [packages/router/src/parsers.ts]
normalizePath('order/list') // => '/order/list'
normalizePath('/order/list?id=1') // => '/order/list'
normalizePath('/order//list/') // => '/order/list'
```

它不只是给 `resolveRoute` 用，也被 `RouteMatcher.resolvePathToRoute()` 复用，这意味着 query 不会影响菜单命中。注意 hash 不会被移除，以支持 hash history 模式的路由前缀（如 `/ocrm/#/`）。

### `resolveExtraInfo(iconStr)`

这里约定：后端可以把扩展配置塞到 `icon` 字段里，**仅支持 JSON 对象字符串**。当前实际处理的主要字段有：

| 字段                    | 作用                                                            |
| ----------------------- | --------------------------------------------------------------- |
| `iconName`              | 侧边栏图标                                                      |
| `isHiddenMenu`          | 隐藏菜单标记，不出现在侧边栏，但保留在路径匹配和祖先链中        |
| `activeMenuPath`        | 指定激活时应选中的菜单路径；设置后 `isHiddenMenu` 自动为 `true` |
| `hiddenMenu` _(已废弃)_ | 旧版隐藏标记，自动归一化为 `isHiddenMenu`                       |
| `routeBase` _(已废弃)_  | 菜单路径前缀（兜底），建议直接在 `url` 中拼接完整路径           |

### `resolveActiveRule(params)`

解析激活规则。优先从 url 中匹配已注册的微应用前缀（如 `/ocrm/#/`、`/crm/`），未匹配到时按优先级取兜底值 `routeBase` > `fallbackActiveRule`。

### `resolveRoute(params)`

根据 url 解析路由信息。内部调用 `resolveActiveRule` 确定前缀后，生成以下字段：

| 输出字段     | 来源                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`       | 基于去除前缀后的路径，各段首字母大写后直接拼接，PascalCase（如 `/user/profile` → `UserProfile`）。同时作为 vue-router 路由名称和 keep-alive 匹配标识 |
| `path`       | `activeRule + url` 规范化后的完整路由路径                                                                                                            |
| `filePath`   | 基于去除前缀后的路径，各段首字母大写后用 `/` 拼接（如 `/user/profile` → `User/Profile`）                                                             |
| `activeRule` | 实际生效的激活规则                                                                                                                                   |
| `component`  | 默认不生成，交给 `transformResolvedRoute` 自定义                                                                                                     |

## RouteTreeBuilder.ts

这个类负责把扁平的 `RawMenuItem[]` 转成嵌套的 `MenuRoute[]`。

::: info 为什么分两次遍历？
后端返回的菜单列表是无序的扁平数组，子节点可能出现在父节点之前。若单次遍历边创建节点边建立关系，遇到子节点时父节点可能尚未存在，导致 `codeNodeMap.get(parentCode)` 返回 `undefined`。因此分两轮处理：

- **第一轮遍历**：创建节点并建立映射，确保所有节点就位
- **第二轮遍历**：根据 `parentCode` 建立父子关系
  :::

  ::: tip transformResolvedRoute 适合做什么
  在业务层通过 `import.meta.glob(['../views/**/*.vue', '!../views/**/components/*'])` 获取所有页面的组件补全 `component` 后调用 router.addRoute 实现动态路由。

支持泛型，业务方可以扩展返回类型：

```ts
import type { ResolvedRouteInfo, TransformResolvedRoute } from '@breeze/router'

interface MyParsedUrl extends ResolvedRouteInfo {
  customField: string
}

const myTransform: TransformResolvedRoute<MyParsedUrl> = (
  resolvedRoute,
  extraInfo,
) => {
  return { ...resolvedRoute, customField: 'value' }
}
```

采用双参数设计：

- 第一个参数 `resolvedRoute` 是纯路由字段（`ResolvedRouteInfo`）
- 第二个参数 `extraInfo` 是只读的菜单上下文（`MenuExtra`）。
- 返回值只需包含路由字段，`extraInfo` 不会混入路由数据（由 `MenuRouteMeta` 类型维护）。
  :::

::: info 关于 ROOT 虚拟根节点
`ROOT` 是后端约定的一级菜单 `parentCode` 固定值。
:::

## RouteMatcher.ts

根据 path 查找路由相关信息。

内部维护三张表，各司其职：

| 数据结构               | 用途                                   | 复杂度 |
| ---------------------- | -------------------------------------- | ------ |
| `routeCodeMap`         | `code -> route` 索引，专用于祖先链回溯 | O(1)   |
| `staticRouteMap`       | 静态路径的精确命中                     | O(1)   |
| `dynamicRouteMatchers` | 含 `:param` / `*` 的动态路径匹配       | O(n)   |

### register

`isDynamicPath()` 检测路径是否含有 `:` 或 `*`，`register()` 据此将路由写入对应的表。

动态路径语法遵循 [path-to-regexp](https://github.com/pillarjs/path-to-regexp) 规范，与 [Vue Router 动态路由](https://router.vuejs.org/zh/guide/essentials/dynamic-matching.html) 一致。

### resolvePathToRoute

查找路由信息

```ts [packages/router/src/RouteMatcher.ts]
resolvePathToRoute(path) {
  if (!path) return undefined
  path = normalizePath(path)

  // 1. 精确匹配静态路由
  const exactMatch = this.staticRouteMap.get(path)
  if (exactMatch) return exactMatch

  // 2. 动态路由匹配
  for (const { matcher, route } of this.dynamicRouteMatchers) {
    if (matcher(path)) return route
  }
  return undefined
}
```

`normalizePath()` 会去掉 query，但会保留 hash，因此 `route.fullPath` 可以直接传入做菜单命中，同时兼容 `/ocrm/#/` 这类 hash history 前缀。

### resolvePathToRouteAncestors 祖先链

根据传入的 `path` 获取路由的 `parentCode` 向上回溯，返回从根到当前页的有序菜单链。

主要用于菜单侧边栏展开。

## DynamicRoute.ts

这是模块的门面类，也是推荐的唯一入口。

```ts [packages/router/src/DynamicRoute.ts]
const dynamicRoute = DynamicRoute.create(menuList, {
  menuKey: 'coms8ReadFunctionList',
})

dynamicRoute.rootRoutes
dynamicRoute.resolvePathToRoute('/crm-v8/home')
dynamicRoute.resolvePathToRouteAncestors('/crm-v8/user/profile')
```

它主要做三件事：

1. 组装 `RouteTreeBuilder` 和 `RouteMatcher`
2. 在 `generateRoutes()` 时负责清空旧状态、构建完整路由树并统一注册到匹配器
3. 把 `rootRoutes` 挂到实例上，方便业务层直接消费

对于大多数调用方来说，看到这里就够了；只有在排查菜单层级或命中问题时，才需要继续往下看 `RouteTreeBuilder.ts` 和 `RouteMatcher.ts`。
