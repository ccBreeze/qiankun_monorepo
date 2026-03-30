---
title: 微应用状态管理
---

# 微应用状态管理

本文档说明 `apps/main-app/src/stores/microApp.ts` 的职责与实现。该 Store 负责根据当前路由自动识别激活的微应用。

## 职责

根据浏览器当前路由路径，在[微应用注册表](./micro-app-registry.md)中查找匹配的微应用配置，向外暴露响应式的 `activeMicroApp`。

## 实现

```ts [apps/main-app/src/stores/microApp.ts]
/** 根据路由路径匹配对应的微应用配置 */
const findMicroAppByPath = (path: string) => {
  for (const [pathPrefix, microApp] of microAppRegistry) {
    if (path.startsWith(pathPrefix)) {
      return microApp
    }
  }
}

export const useMicroAppStore = defineStore('microApp', () => {
  const route = useRoute()

  /** 根据当前路由自动匹配激活的微应用 */
  const activeMicroApp = computed(() => findMicroAppByPath(route.fullPath))

  return { activeMicroApp }
})
```

## 匹配逻辑

遍历 `microAppRegistry` 的所有条目，对当前路由的 `fullPath` 执行**前缀匹配**：

| 当前路径           | 匹配结果                           |
| ------------------ | ---------------------------------- |
| `/crm-v8/home`     | `breeze-crm-v8`（匹配 `/crm-v8/`） |
| `/crm/member/list` | `breeze-crm`（匹配 `/crm/`）       |
| `/login`           | `undefined`（无匹配）              |

### 这个匹配结果只能决定“微应用归属”

`useMicroAppStore` 的前缀匹配，只回答一个问题：当前页面应该由哪个微应用承接。

它**不负责**判断：

- 当前页面属于哪个顶部菜单分组
- 左侧菜单应该展示哪一组业务菜单
- 标签栏标题应该采用哪条菜单记录

这些问题由 [菜单状态管理](./menu-store.md) 负责，后者会遍历所有菜单分组里的 `DynamicRoute` 实例，按完整菜单路由表做匹配。

::: info 为什么不能直接用微应用前缀推导菜单分组
因为菜单分组是业务概念，微应用前缀是技术概念。一个菜单分组下面可能同时出现多个不同 `pathPrefix` 的页面，所以 `route.fullPath` 的前缀最多只能定位到“微应用”，不能直接定位到“菜单分组”。
:::

::: warning 注册顺序的影响
`microAppRegistry` 是一个 `Map`，遍历顺序与插入顺序一致。如果存在路由前缀相互包含的情况（如 `/crm/` 和 `/crm-v8/`），需要确保更长的前缀排在前面，否则 `/crm-v8/home` 可能被 `/crm/` 错误匹配。当前配置中 `breeze-crm-v8` 排在 `breeze-crm` 之前，因此匹配顺序是正确的。
:::

## 被谁使用

- **微应用容器组件**：根据 `activeMicroApp` 判断需要加载哪个微应用
- **ConsoleHeader**：根据是否存在 `activeMicroApp` 决定是否显示微应用相关的 UI 元素
