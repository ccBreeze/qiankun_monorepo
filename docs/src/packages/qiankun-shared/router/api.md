---
title: API 参考
---

本页按"推荐使用门面类 `DynamicRoute`"的方式整理导出 API，并补充最常用的输入/输出类型。

## DynamicRoute（推荐）

构造：

- `new DynamicRoute(options?: MenuParserOptions)`

导入：

```ts
import { DynamicRoute } from '@breeze/qiankun-shared' // [!code highlight]
```

常用方法：

- `generateRoutes(list: FunctionListItem[]): Map<string, MenuTreeNode>`
  - 同时产出并更新：`rootRoutes`、`allRoutes`
- `resolvePathToRoute(path: string | undefined): MenuRecord | undefined`
- `getBreadcrumb(path: string): MenuRecord[]`

常用选项（`MenuParserOptions`）：

- `routeBase?: string`：路由基础路径（例如 `/crm-v8`）
- `menuKey?: string`：菜单来源 key（用于写入 `meta.menuKey`，便于在主应用侧区分来源）
- `transformParsedUrl?: (parsed, context) => parsed`：在默认 URL 解析后进行二次变换（例如补 `componentPath` 或自定义 name/path）

## RouteTreeBuilder / RouteMatcher（按需）

- `new RouteTreeBuilder(options?: MenuParserOptions)`
  - `build(list, onRouteCreated?)`：后端菜单 → 路由树（可通过回调注册到匹配器）
- `new RouteMatcher()`
  - `register(route)`：注册单条路由（静态/动态自动分类）
  - `resolve(path)`：路径命中
  - `getBreadcrumb(path)`：面包屑

## 纯函数

- `normalizePath(path: string): string`
- `resolveExtraInfo(iconStr): MenuExtraInfo`
- `parseUrl(url, extraInfo, config): ParsedUrlInfo`

## 核心类型（节选）

- `FunctionListItem`：后端下发菜单/功能项结构
- `MenuRecord`：解析后的路由记录（含 `meta`、`children`、`redirect`）
- `MenuMeta`：菜单元信息（包含 `code/parentCode/parentPath/isHiddenMenu/componentName/manualSort` 等）
