---
title: 菜单与路由规则
---

本页把 `qiankun-shared` 的动态路由输出如何被主应用的 `ConsoleMenu` 消费，整理成一套可复用的规则说明，便于在新系统/新菜单源里保持一致行为。

## 数据入口（权限边界）

动态路由的输入是后端返回的菜单/功能项数组 `FunctionListItem[]`。

:::warning 权限边界

- 前端是否"看得见/跳得转"某条菜单，核心取决于后端是否下发该 `FunctionListItem`
- 前端侧仅做结构化、排序、隐藏菜单处理与路径匹配；不额外做基于 `status` 或权限码的二次过滤
  :::

## URL → 路由信息

对每个菜单项，会根据 `url` 与 `icon`（可选 JSON）解析出路由信息：

:::info URL 解析规则

- `normalizePath(url)`：补前导 `/`、去掉 query/hash、去掉尾随 `/`、合并多余 `//`
- `path = normalizePath((extraInfo.routeBase || routeBase) + url)`：最终路由路径会带上路由基础前缀
- `name/componentName`：由 url 分段首字母大写拼接生成（`name` 用 `-`，`viewPath` 用 `/`）
- `icon` 若是 JSON：会解析为 `MenuExtraInfo`，并把 `hiddenMenu: true` 归一成 `isHiddenMenu: true`
  :::

## 路由树构建（父子关系、redirect、排序）

路由树构建遵循：

:::tip 构建规则

- 通过 `code` 建立节点映射；再按 `parentCode` 建立父子关系
- 同一父节点下，按 `manualSort` 升序排序
- 父节点 `redirect` 指向排序后的第一个子路由
- **隐藏菜单（`isHiddenMenu === true`）仍会挂在父节点 children 下，但不会触发父节点 children 初始化/redirect 设置**，避免"隐藏页成为父菜单默认页"
  :::

## ConsoleMenu 渲染与选中态

菜单展示与路由树有两点关键耦合：

:::info 渲染与选中规则

- 渲染时：`meta.isHiddenMenu === true` 的节点不渲染（但依然存在于全量路由，用于命中/面包屑）
- 选中时：若当前路径命中的路由是隐藏菜单，则使用 `meta.parentPath` 回退到父菜单高亮/展开
  :::

## 动态路由匹配与面包屑

路径命中策略：

- 优先静态精确匹配（Map，O(1)）
- 再使用 `path-to-regexp` 做动态路由匹配（支持 `:param`、`*`）
- 面包屑通过 `meta.parentCode` 回溯父链构造

## 主应用侧的关键约定

:::warning 主应用对接要求

- 主应用需要能承接菜单生成出来的路径（通常通过 `alias` 将 `/crm/:subPath*`、`/crm-v8/:subPath*` 指向微应用容器页）
- 菜单渲染组件应忽略 `isHiddenMenu` 节点，但选中态/面包屑仍要以全量路由为准
  :::
