---
title: 子应用注册表
---

# 子应用注册表

本文档说明 `apps/main-app/src/utils/microAppRegistry.ts` 的职责与实现。它是主应用识别和配置子应用的静态配置中心。

## 职责

子应用注册表维护所有子应用的配置，供主应用在以下场景中复用：

- 根据当前路由识别激活的子应用
- 为菜单模块提供 `fallbackActiveRule`
- 为各运行环境解析子应用入口 URL

## 为什么单独一个文件，而不是放进 microApp store

**原因：放进 store 会产生循环依赖**

`menu store` 需要 `microApps` 来获取 `registeredActiveRules`；`microApp store` 需要 `menu store` 来读取 `authorizedRoutesByActiveRule`：

```
menu store  →  microApp store  →  menu store  → ♻️ 循环
```

提取为独立工具模块所有消费方直接 import，依赖方向保持单向，没有循环。

## 类型

```ts [apps/main-app/src/utils/microAppRegistry.ts]
export interface MicroAppDefinition {
  /**
   * 激活规则（收窄为 string）
   * - 主应用据此匹配子应用
   * - 子应用需将其作为 createWebHistory 的 base
   */
  activeRule: string
  /** 各运行环境的入口 URL 映射 */
  entryMap: Partial<Record<RuntimeEnv, string>>
}

/**
 * 子应用静态解析结果
 *
 * - `activeRule` 收窄为 `string`
 * - `props` 由 `useMicroAppStore` 在运行时注入，不在此处定义
 *
 * @see https://qiankun.umijs.org/zh/api#registermicroappsapps-lifecycles
 */
export type ResolvedMicroApp = RegistrableApp<object> &
  Pick<MicroAppDefinition, 'activeRule'> & {
    container: string
  }
```

## 静态配置

语义化 key 引用各子应用的 `activeRule`，避免业务代码中出现**硬编码**路由字符串。当前这份枚举已提升到共享包 `@breeze/runtime`，主应用和子应用共用同一份定义：

```ts [packages/runtime/src/microApps.ts]
/** 子应用激活规则枚举 */
export const MICRO_APP_ACTIVE_RULE = {
  OCRM: '/ocrm/#',
  VUE3_HISTORY: '/vue3-history',
  BREEZE_CRM_V8: '/crm-v8',
} as const
```

如果子应用使用 hash history 模式，`activeRule` 需包含 `#`（如 `/new-app/#`）。

`microAppDefinitions` 直接引用枚举值，确保 activeRule 只有单一来源：

```ts [apps/main-app/src/utils/microAppRegistry.ts]
import { MICRO_APP_ACTIVE_RULE } from '@breeze/runtime'

const microAppDefinitions: MicroAppDefinition[] = [
  {
    activeRule: MICRO_APP_ACTIVE_RULE.OCRM,
    entryMap: {},
  },
  {
    activeRule: MICRO_APP_ACTIVE_RULE.VUE3_HISTORY,
    entryMap: {},
  },
  {
    activeRule: MICRO_APP_ACTIVE_RULE.BREEZE_CRM_V8,
    entryMap: {},
  },
]
```

## 注册表结构

静态配置补全，对外唯一接口：

```ts [apps/main-app/src/utils/microAppRegistry.ts]
/**
 * 从 activeRule 提取应用标识符
 * @example '/ocrm/#' → 'ocrm'
 * @example '/vue3-history' → 'vue3-history'
 */
const getPackageId = (activeRule: string) => {
  return activeRule
    .replace(/^\//, '') // 去掉开头的斜杠
    .replace(/[/#].*$/, '') // 去掉第一个 /# 及其后的内容
}

/** 将子应用静态配置补全 */
export const microApps = microAppDefinitions.map((config): ResolvedMicroApp => {
  const id = getPackageId(config.activeRule)
  return {
    activeRule: config.activeRule,
    entry: config.entryMap[runtimeEnv]!,
    name: id,
    container: `#micro-container__${id}`,
  }
})
```

<details>
<summary>解析结果示例（DEV 环境）</summary>

```json
[
  {
    "activeRule": "/ocrm/#",
    "name": "ocrm",
    "entry": "http://localhost:8102",
    "container": "#micro-container__ocrm"
  },
  {
    "activeRule": "/vue3-history",
    "name": "vue3-history",
    "entry": "http://localhost:8101",
    "container": "#micro-container__vue3-history"
  }
]
```

</details>

## 主应用路由匹配

主应用路由使用通配路由 `/:pathMatch(.*)*` 兜底，所有非 `/login` 的子应用路径均自动命中壳页面，无需依赖注册表为每个子应用单独生成别名：

```ts [apps/main-app/src/router/index.ts]
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginPage },
  {
    path: '/:pathMatch(.*)*',
    name: 'microApp',
    component: HomePage, // 所有子应用路径均渲染同一个壳页面
  },
]
```

Vue Router 静态路由优先级高于通配符路由，`/login` 会优先匹配；其余所有路径（`/vue3-history/...`、`/crm-v8/...`、`/ocrm/#/...` 等）均自动落到 `/:pathMatch(.*)*`。
