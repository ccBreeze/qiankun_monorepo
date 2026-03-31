---
title: 微应用注册表
---

# 微应用注册表

本文档说明 `apps/main-app/src/views/MicroApp/utils/registry.ts` 的职责与实现。它是主应用识别和配置微应用的静态配置中心。

## 职责

微应用注册表维护一份 **packageName → RegistrableMicroApp** 的映射关系，供主应用在以下场景中复用：

- 根据当前路由识别激活的微应用
- 为菜单模块提供 `fallbackActiveRule`
- 为主应用路由生成微应用别名

## 核心类型

```ts [apps/main-app/src/views/MicroApp/utils/registry.ts]
export interface MicroAppConfig {
  /** 微应用包名，用于生成路由前缀 */
  packageName: string
  pathPrefix?: string
}

export interface RegistrableMicroApp extends MicroAppConfig {
  /**
   * 路由前缀
   * - 主应用据此匹配微应用
   * - 微应用需将其作为 createWebHistory 的 base
   */
  pathPrefix: string
  /** 主应用与 qiankun 共用的激活规则 */
  activeRule: string
}
```

| 字段          | 说明                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `packageName` | 微应用唯一标识，同时也是 `microAppRegistry` 的 key                                                                      |
| `pathPrefix`  | 路由前缀（如 `/vue3-history/`、`/ocrm/#/`），主应用通过它做前缀匹配，微应用也要把它作为 Vue Router 的 `base`            |
| `activeRule`  | 主应用与 qiankun 共用的路由匹配规则，同时也复用于共享路由模块的 `fallbackActiveRule`。当前实现里它直接复用 `pathPrefix` |

## 路由前缀生成规则

`getPathPrefix` 函数将 `packageName` 转换为默认路由前缀：

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
| `vue3-history`  | —                      | `/vue3-history/`   |
| `breeze-crm-v8` | —                      | `/crm-v8/`         |

## 注册表条目是如何生成的

每个 `MicroAppConfig` 会经过 `createRegistrableMicroApp()` 补全成 `RegistrableMicroApp`：

```ts [apps/main-app/src/views/MicroApp/utils/registry.ts]
const createRegistrableMicroApp = (
  microAppConfig: MicroAppConfig,
): RegistrableMicroApp => {
  const pathPrefix =
    microAppConfig.pathPrefix || getPathPrefix(microAppConfig.packageName)

  return {
    ...microAppConfig,
    pathPrefix,
    activeRule: pathPrefix,
  }
}
```

可以看到，当前实现里：

- `pathPrefix` 是路由层的基础前缀
- `activeRule` 是 qiankun 层的激活规则
- 两者目前取值相同，但命名分别服务于不同上下文

## 注册表结构

最终导出 `microAppRegistry`，类型为 `Map<string, RegistrableMicroApp>`，key 是 `packageName`：

```ts [apps/main-app/src/views/MicroApp/utils/registry.ts]
export const microAppRegistry = new Map(
  microAppConfigs.map((microAppConfig) => [
    microAppConfig.packageName,
    createRegistrableMicroApp(microAppConfig),
  ]),
)
```

当前注册的微应用：

| packageName     | pathPrefix       | activeRule       |
| --------------- | ---------------- | ---------------- |
| `ocrm`          | `/ocrm/#/`       | `/ocrm/#/`       |
| `vue3-history`  | `/vue3-history/` | `/vue3-history/` |
| `breeze-crm-v8` | `/crm-v8/`       | `/crm-v8/`       |

## 如何新增微应用

在 `microAppConfigs` 数组中添加一项即可：

```ts
const microAppConfigs = [
  { packageName: 'ocrm', pathPrefix: '/ocrm/#/' },
  { packageName: 'vue3-history' },
  { packageName: 'breeze-crm-v8' },
  { packageName: 'breeze-new-app' }, // 新增，pathPrefix 自动生成为 /new-app/
]
```

如果微应用使用 hash history 模式，需显式指定含 `#` 的 `pathPrefix`；否则留空即可自动派生。

::: warning 微应用侧的配套要求
新增微应用后，微应用自身需将 `pathPrefix`（如 `/new-app/`）配置为 Vue Router 的 `base`，否则主子应用的路由将无法对齐。
:::

## 如何读取注册表

当前代码统一通过 `packageName` 读取注册表条目：

```ts
const microApp = microAppRegistry.get(packageName)
```

典型用法有两类：

- 菜单构建时读取 `microApp.activeRule`，作为共享路由的 `fallbackActiveRule`
- 批量遍历 `microAppRegistry.values()`，提取所有 `activeRule` 作为已注册微应用激活规则列表

## 被谁使用

- **[菜单状态管理](./menu-store.md)**：读取 `microAppRegistry.get(item.packageName)!.activeRule` 作为 `fallbackActiveRule`，同时提取所有 `activeRule` 作为 `registeredActiveRules`
- **[微应用状态管理](./micro-app-store.md)**：根据当前路由路径和 `microApp.activeRule` 查找激活的微应用配置
- **主应用路由配置**：根据注册表里的 `activeRule` 为每个微应用生成对应的路由别名
