---
title: 微应用注册表
---

# 微应用注册表

本文档说明 `apps/main-app/src/views/MicroApp/utils/registry.ts` 的职责与实现，它是主应用识别和管理所有微应用的静态配置中心。

## 职责

微应用注册表维护一份 **packageName → 路由配置** 的映射关系，供主应用在路由匹配、微应用加载等场景中使用。

## 核心类型

```ts [apps/main-app/src/views/MicroApp/utils/registry.ts]
export interface MicroAppConfig {
  /** 微应用包名，用于生成路由前缀 */
  packageName: string
  /** 可选的自定义路由前缀，不指定时由 packageName 自动派生 */
  pathPrefix?: string
}

export interface RegistrableMicroApp extends MicroAppConfig {
  /**
   * 主应用通过这个标识切换不同的 APP
   * 微应用 router createWebHistory/createWebHashHistory 传入的 base
   */
  pathPrefix: string
}
```

| 字段          | 说明                                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packageName` | 微应用的包名（如 `breeze-crm`），是唯一标识                                                                                                                                               |
| `pathPrefix`  | 路由前缀（如 `/crm/`），可在配置中显式指定（如 hash history 场景的 `/ocrm/#/`），否则由 `packageName` 自动派生。微应用需将其作为 `createWebHistory`/`createWebHashHistory` 的 `base` 参数 |

## 路由前缀生成规则

`getPathPrefix` 函数将 `packageName` 转换为路由前缀：

```ts [apps/main-app/src/views/MicroApp/utils/registry.ts]
const getPathPrefix = (packageName: string) => {
  const routeSegment = packageName.replace(/^breeze-/, '')
  return `/${routeSegment}/`
}
```

转换规则：移除 `breeze-` 前缀，加上前后斜杠。如果配置中显式指定了 `pathPrefix`，则直接使用，不走自动派生。

| packageName     | pathPrefix（显式指定） | pathPrefix（最终） |
| --------------- | ---------------------- | ------------------ |
| `ocrm`          | `/ocrm/#/`             | `/ocrm/#/`         |
| `breeze-crm`    | —                      | `/crm/`            |
| `breeze-crm-v8` | —                      | `/crm-v8/`         |

## 注册表结构

最终导出 `microAppRegistry`，类型为 `Map<string, RegistrableMicroApp>`，key 是 `pathPrefix`：

```ts [apps/main-app/src/views/MicroApp/utils/registry.ts]
export const microAppRegistry = new Map(
  microAppConfigs.map(createMicroAppRegistryEntry),
)
```

当前注册的微应用：

| pathPrefix | packageName     |
| ---------- | --------------- |
| `/ocrm/#/` | `ocrm`          |
| `/crm/`    | `breeze-crm`    |
| `/crm-v8/` | `breeze-crm-v8` |

## 如何新增微应用

在 `microAppConfigs` 数组中添加一项即可：

```ts
const microAppConfigs = [
  { packageName: 'ocrm', pathPrefix: '/ocrm/#/' },
  { packageName: 'breeze-crm' },
  { packageName: 'breeze-crm-v8' },
  { packageName: 'breeze-new-app' }, // 新增，pathPrefix 自动生成为 /new-app/
]
```

如果微应用使用 hash history 模式，需显式指定含 `#` 的 `pathPrefix`；否则留空即可自动派生。

::: warning 微应用侧的配套要求
新增微应用后，微应用自身需将 `pathPrefix`（如 `/new-app/`）配置为 Vue Router 的 `base`，否则主子应用的路由将无法对齐。
:::

## `resolvePathPrefix(packageName)`

根据 `packageName` 从注册表中查找对应的 `pathPrefix`，找不到时抛出错误以确保配置一致性。供 `menu.ts` 在构建菜单时使用。

## 被谁使用

- **[菜单状态管理](./menu-store.md)**：通过 `resolvePathPrefix` 获取 `pathPrefix` 传给 `DynamicRoute`，并将 `microAppRegistry.keys()` 作为 `registeredPrefixes`
- **[微应用状态管理](./micro-app-store.md)**：根据当前路由路径在 `microAppRegistry` 中查找匹配的微应用配置
- **主应用路由配置**：根据注册表为每个微应用生成对应的路由别名
