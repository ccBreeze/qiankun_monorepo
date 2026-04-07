---
title: 标签栏状态管理
outline: [2, 4]
---

# 标签栏状态管理

本文档说明 `apps/main-app/src/stores/tabBar.ts` 的职责与实现。该 Store 负责管理页面顶部的标签栏（多页签），支持标签的增删、持久化存储和导航联动。

## 职责

- 维护已打开标签页的列表，按访问顺序排列
- 标签数据持久化到 `localStorage`，刷新后恢复
- 关闭标签时自动跳转到相邻标签
- 支持子应用通过 `history.state.tabName` 动态修改标签标题

## 核心类型

```ts [apps/main-app/src/stores/tabBar.ts]
type Tab = {
  code?: string
  title: string
  fullPath: string
}
```

| 字段       | 说明                                              |
| ---------- | ------------------------------------------------- |
| `code`     | 菜单编码，来自 `MenuRoute.meta.code`              |
| `title`    | 标签显示标题，默认取菜单名称，支持动态覆盖        |
| `fullPath` | 完整路由路径，作为 Map 的 key（含 query 和 hash） |

## 存储方案

标签列表使用 `@vueuse/core` 的 `useLocalStorage` 持久化，存储 key 为 `tabBar:tabs`：

```ts [apps/main-app/src/stores/tabBar.ts]
const tabs = useLocalStorage<Map<string, Tab>>('tabBar:tabs', new Map(), {
  serializer: {
    read: (value) => new Map(JSON.parse(value)),
    write: (value) => JSON.stringify(Array.from(value.entries())),
  },
})
```

::: details 为什么使用自定义 serializer？
`Map` 不能直接被 `JSON.stringify` 序列化。自定义 serializer 将 `Map` 转为 `[key, value][]` 数组后序列化，反序列化时再还原为 `Map`。
:::

## 核心方法

### `addTab(fullPath)`

添加新标签。从 `useMenuStore` 的 `activeMenuRoute` 获取当前路由对应的菜单记录，提取 `code` 和 `name` 作为标签信息：

- 若 `fullPath` 已存在，不重复添加
- 若 `window.history.state.tabName` 有值，用其覆盖标签标题——这是子应用动态设置标签名的通道

### `removeTab({ fullPath, to? })`

关闭标签并处理导航跳转：

1. **路径归一化**：外部传入的路径可能未经 URI 编码，而 `tabs` 的 key 使用的是 vue-router 已编码的 `fullPath`，因此需要统一编码格式
2. **导航策略**：
   - 若关闭的不是当前标签，直接删除，不跳转
   - 若关闭的是当前标签且未指定 `to`，自动跳转到相邻标签（优先下一个，无则上一个）
   - 若指定了 `to`，跳转到目标路径（支持 hash 模式路径解析）

### `clearTabs()`

清空所有标签，通常在用户登出时调用。

## 与菜单 Store 的协作

标签栏依赖 `useMenuStore` 的 `activeMenuRoute` 来获取路由元信息：

```
路由变化 → activeMenuRoute 更新 → addTab 读取菜单记录 → 生成标签
```

这意味着只有在菜单中注册过的路由才会生成标签。未匹配到菜单记录的路由（如 404 页面）不会创建标签。
