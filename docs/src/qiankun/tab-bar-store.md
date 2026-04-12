---
title: 标签栏状态管理
outline: [2, 4]
---

# 标签栏状态管理

在多页签（Tab Bar）场景中，用户常常需要同时打开多个页面并在它们之间快速切换。`useTabBarStore` 就是为这一需求设计的——它管理已打开标签页的列表，处理标签的增删、持久化存储以及与路由导航的联动。

本文档基于 `apps/main-app/src/stores/tabBar.ts` 的实现展开说明。

## 持久化存储

刷新页面后，保留已打开的标签。标签数据使用 `localStorage` 进行持久化：

```ts [apps/main-app/src/stores/tabBar.ts]
import { StorageSerializers, useLocalStorage } from '@vueuse/core'

type Tab = {
  code?: string
  title: string
  fullPath: string
  /** 创建此 tab 时的来源路由（携带 activeRule） */
  source?: string
}

const tabs = useLocalStorage<Map<string, Tab>>('tabBar:tabs', new Map(), {
  serializer: StorageSerializers.map,
})
```

| 字段       | 说明                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `code`     | 菜单编码，来自 `MenuRoute.meta.code`                                                            |
| `title`    | 标签显示标题（支持动态覆盖）                                                                    |
| `fullPath` | 完整路由路径，作为 Map 的 key（含 query 和 hash）<br/>如 `/vue3-history/KeepAliveDemo?id=1#abc` |
| `source`   | 首次打开此 tab 时的来源路由，用于 `goToSource` 跳转                                             |

::: tip
`Map` 不能直接被 `JSON.stringify` 序列化。直接使用 VueUse 内置的 [StorageSerializers.map](https://vueuse.org/core/useStorage/#custom-serialization)。
:::

## API

### addTab()

当路由发生变化时，为当前页面创建一个标签。

```ts [apps/main-app/src/components/Layout/ConsoleTabs/index.vue]
watch(
  () => route.fullPath,
  async (fullPath: string, oldFullPath?: string) => {
    addTab(fullPath, oldFullPath)
    // ....
  },
  { immediate: true },
)
```

<!-- prettier-ignore -->
```ts [apps/main-app/src/stores/tabBar.ts]
const addTab = (fullPath: string, previousFullPath?: string) => {
  const routeRecord = activeMenuRoute.value
  if (!routeRecord) return

  let tab = tabs.value.get(fullPath)
  if (!tab) {
    tab = {
      code: routeRecord.meta.code,
      title: history.state?.tabName ?? routeRecord.meta.name, // [!code focus]
      fullPath,
      source: previousFullPath, // [!code focus]
    }
    tabs.value.set(fullPath, tab)
  }

  // 无论 tab 是否新建，都要清除， // [!code focus]
  // 避免刷新页面时 history.state 残留导致后续 addTab 读到脏数据 // [!code focus]
  if (history.state?.tabName) { // [!code focus]
    history.replaceState({ ...history.state, tabName: undefined }, '') // [!code focus]
  } // [!code focus]
}
```

这里有几个值得注意的细节：

- **精确匹配规则**：`tabs` 以 `fullPath` 字符串作为 key 做精确匹配。只有当 `fullPath` 完全相同时，才会复用已有标签；只要字符串不同，就会创建新的标签。也就是说，不仅 path、query、hash 的差异会生成不同 tab，连 query 参数顺序不同也会被视为不同 tab，例如 `/page?a=1&b=2` 和 `/page?b=2&a=1` 会被当作两个标签。
  :::tip
  采用精确匹配是为了支持"同一页面、不同参数各开一个标签"的典型场景——比如同时打开订单 `id=1` 和 `id=2` 的详情页，两者应该是独立的标签，而不是互相覆盖。
  :::

- **首次创建记录**：`source`、`title` 等信息均只在首次创建时记录，后续访问相同 `fullPath` 时不会覆盖。

- **子应用动态标题**：子应用可以通过 `router.push({ state: { tabName } })` 传递动态标题。`addTab` 会优先使用 `history.state.tabName` 作为标签标题，这是子应用设置标签名的唯一方式。

- **来源页记录**：`previousFullPath` 会被保存为 `tab.source`，记录"从哪个页面打开了当前标签"。关闭标签时，如果指定了 `goToSource: true`，就会跳回这个来源页（典型场景：从券模板列表进入创建页，关闭后自动返回列表，即使该标签已关闭也会重新打开）。

::: warning 关于 `history.state.tabName` 的清理
注意代码中 `tabName` 的清理逻辑位于 `if (!tab)` 块**之外**。这意味着无论标签是否已存在，`tabName` 都会被清除。这是有意为之——防止刷新页面后 `history.state` 中残留的脏数据影响后续调用。
:::

### removeTab()

关闭标签不仅是从列表中删除一项那么简单，还需要决定关闭后页面应该跳转到哪里。

```ts [apps/main-app/src/stores/tabBar.ts]
const removeTab = ({ fullPath, ...options }: RemoveTabOptions) => {
  fullPath = normalizeFullPath(fullPath)
  const tab = tabs.value.get(fullPath)
  if (!tab) return

  if (fullPath === route.fullPath) {
    const target = resolveTabCloseTarget({ tab, ...options })
    if (target) router.push(target)
  }

  tabs.value.delete(fullPath)
  emitTabRemove({ fullPath }) // [!code focus]
}
```

::: tip
关闭标签时，还需要通知对应的子应用清除 KeepAlive 缓存。详情查看 [子应用 KeepAlive 缓存机制](./keep-alive)。
:::

#### normalizeFullPath()

外部传入的路径可能未经 URI 编码（例如包含中文字符），而 `tabs` 的 key 使用的是 vue-router 已编码的 `fullPath`。如果不统一编码格式，`Map.get` / `Map.delete` 会因 key 不匹配而操作失败：

```ts [apps/main-app/src/stores/tabBar.ts]
const normalizeFullPath = (path: string) =>
  decodeURI(path) === path ? encodeURI(path) : path
```

#### 导航策略 {#navigation-strategy}

关闭标签后应跳转到哪个页面？`resolveTabCloseTarget` 内部按优先级依次决策：

1. **非当前标签**：如果被关闭的不是当前正在浏览的标签，直接从列表中删除，不做任何导航跳转。
2. **跳回来源页**：如果调用方传入了 `goToSource: true`，跳转回首次打开此标签时的来源页面（即使该标签已关闭也会重新打开）。代码示例参见 [`requestRemoveTabByRoute`](./runtime-events#requestremovetabbyroute)。
3. **显式指定目标**：如果指定了 `to` 参数，跳转到该目标路径。
4. **相邻标签**：以上两个条件都不满足时，自动跳转到相邻标签——优先右侧，如果已是最后一个则跳到左侧。当列表中只剩一个标签时，不执行跳转。

::: details 示例：关闭标签时的几种场景

假设当前标签顺序为 `[A, B, C]`，用户正在浏览 B：

- 关闭 B → 跳转到 C（优先右侧）
- 关闭 C → 直接删除 C，不跳转（关闭的不是当前标签）
- 关闭 A → 直接删除 A，不跳转（关闭的不是当前标签）

假设当前标签顺序为 `[A, B]`，用户正在浏览 B：

- 关闭 B → 跳转到 A（右侧没有了，跳左侧）

:::

### clearTabs()

用于一次性清空所有标签，通常在用户登出时调用。
