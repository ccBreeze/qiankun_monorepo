---
title: '@breeze/bridge-vue'
outline: [2, 4]
---

# @breeze/bridge-vue

`@breeze/bridge-vue` 是面向微前端场景的 Vue 生态适配层，负责将 qiankun 主应用下发的上下文（授权路由、权限信息等）桥接到子应用的各类 Vue 机制中。

## 包结构

```
packages/bridge-vue/src/
├── hostBridge/            # 主子应用运行时桥接
│   └── tab.ts             # tab 导航 / 关闭相关封装
├── router/                # 路由相关桥接
│   └── dynamicRouteGuard.ts
├── hooks/                 # 通用 hooks
│   └── useKeepAlive.ts
└── index.ts               # 包入口，统一导出
```

当前已按职责拆分为 `router`、`hostBridge`、`hooks` 三类模块。

## router 模块

### 职责

- 提供 `createDynamicRouteGuard`，封装"首次进入时注册动态路由"的完整逻辑
- **多应用隔离**：守卫内通过 `window.location.pathname` 比对 `activeRule`，当前 URL 不属于本应用时直接放行，避免跨应用路由干扰
- 处理 qiankun 模式下的 `activeRule` 前缀剥离（`stripBase`），使 vue-router 只感知子应用内的相对路径
- 通过 `import.meta.glob` 的组件映射（`endsWith`）自动解析页面组件

### beforeEach 守卫机制

守卫内部使用 `initialized` 标记控制注册时机，避免重复注册：

```ts
// 与主应用下发 props 的结构保持同源一致
export interface DynamicRouteGuardOptions extends Pick<
  MicroAppHostProps,
  'authorizedRoutes' | 'activeRule'
> {
  router: Router
  /** 子应用通过 import.meta.glob 获取的页面组件映射表 */
  pages: GlobPages
}

/**
 * 创建动态路由守卫
 */
export const createDynamicRouteGuard = (options: DynamicRouteGuardOptions) => {
  const { router, authorizedRoutes, activeRule } = options

  let initialized = false
  router.beforeEach((to) => {
    // qiankun 多应用场景：当前 URL 不属于本应用（其他子应用的路由），直接放行无需注册
    // 注意：to.fullPath 已由 createWebHistory(activeRule) 去除了 activeRule 前缀，
    // 需通过 window.location.pathname 还原完整路径进行比对
    if (activeRule && !window.location.pathname.startsWith(activeRule)) return

    if (!authorizedRoutes.length) return

    // 路由未注册
    // 首次进入 to.name 为 undefined 无法通过 router.hasRoute() 判断
    if (!initialized) {
      initialized = true
      registerDynamicRoutes(options) // 全量路由注册
      return to.fullPath
    }
  })
}
```

::: details Q：为什么不用 `router.hasRoute()` 判断路由是否已注册？
核心原因是**首次进入时 `to.name === undefined`**。

动态路由注册在守卫内部完成，首次进入时路由表为空，导航目标无法匹配到任何路由记录，因此 `to.name` 为 `undefined`。此时调用 `router.hasRoute(to.name)` 等价于 `router.hasRoute(undefined)`，永远返回 `false`，无法作为判断依据。
:::

相关链接

- [Vue Router — 在导航守卫中添加路由](https://router.vuejs.org/zh/guide/advanced/dynamic-routing.html#%E5%9C%A8%E5%AF%BC%E8%88%AA%E5%AE%88%E5%8D%AB%E4%B8%AD%E6%B7%BB%E5%8A%A0%E8%B7%AF%E7%94%B1)

### 注册流程

#### 第一步：组件解析

由于 `pages` 的 key 包含 glob 前缀（如 `../../views/`），用 `endsWith` 匹配可无视前缀，子应用无需关心 glob 的相对路径写法。

```ts
/**
 * 根据 filePath 从 pages 中匹配页面组件
 *
 * 示例（filePath = "/CouponListTemp/CreatCouponTemp"）：
 *   1. 优先匹配 .../CouponListTemp/CreatCouponTemp/index.vue  ✗ 未命中
 *   2. 其次匹配 .../CouponListTemp/CreatCouponTemp.vue        ✓ 命中
 */
const resolveComponent = (pages: GlobPages, filePath: string) => {
  const key = Object.keys(pages).find(
    (key) =>
      key.endsWith(`${filePath}/index.vue`) || // [!code focus]
      key.endsWith(`${filePath}.vue`), // [!code focus]
  )
  return key && pages[key]
}
```

::: details Q：为什么不用 `longestCommonPrefix` 最长公共前缀，而是用 `endsWith` 遍历？

曾考虑过以下优化方案：先提取所有 `pages` key 的最长公共前缀（glob 根路径），再通过 `prefix + filePath` 直接访问对象属性，将单次查找从 O(P) 降为 O(1)：

```ts
/**
 * 字符串数组的最长公共前缀（纵向扫描）
 *
 * - 时间复杂度：O(n × m)，n 为字符串数量，m 为最短字符串长度
 * - 空间复杂度：O(1)，不计返回值本身
 *
 * @see https://leetcode.cn/problems/longest-common-prefix/
 */
const longestCommonPrefix = (strs: string[]): string => {
  // ...
}

const resolveComponent = (pages: GlobPages, prefixedPath: string) => {
  return pages[`${prefixedPath}/index.vue`] ?? pages[`${prefixedPath}.vue`]
}

// registerDynamicRoutes 函数内部
const prefix = longestCommonPrefix(Object.keys(pages))
for (const route of flatRoutes) {
  const component = resolveComponent(pages, prefix + route.meta.filePath)
  // ...
}
```

**算法层面对比**（P = 页面数，R = 路由数，m = 公共前缀长度）：

|              | endsWith 方案      | longestCommonPrefix 方案 |
| ------------ | ------------------ | ------------------------ |
| 预处理       | 无                 | O(P × m)，求公共前缀     |
| 单次查找     | O(P)，遍历所有 key | O(1)，直接属性访问       |
| R 条路由总计 | O(R × P)           | O(P × m + R)             |

当 R、P 都很大时，`longestCommonPrefix` 方案确实有收益。但分析后决定保留 `endsWith` 方案，原因如下：

1. **只执行一次**：`registerDynamicRoutes` 在守卫初始化时调用，不在每次导航时重复
2. **规模很小**：真实项目页面通常 50～200，O(R × P) ≈ 10,000 次字符串操作，毫秒级

结论：此处是一次性初始化、小规模数据，`endsWith` 已是足够好的方案，`longestCommonPrefix` 属于过度优化。

:::

#### 第二步：activeRule 前缀剥离

qiankun 模式下，`createWebHistory(activeRule)` 已将 `activeRule` 作为路由基础路径，`addRoute` 注册时 path 需要是相对于 `activeRule` 的路径：

```ts
// activeRule = "/vue3-history"
// "/vue3-history/CouponListTemp"  →  "/CouponListTemp"
const stripBase = (path: string, activeRule?: string) => {
  if (!activeRule) return path
  if (path.startsWith(activeRule)) {
    return path.slice(activeRule.length) || '/'
  }
  return path
}
```

> 为什么用 `createWebHistory(activeRule)` 而不用嵌套路由？详见[路由协作机制 — 常见问题](./routing-mechanism.html#q-为什么不用嵌套路由替代-createwebhistory-activerule-的-base)。

#### 第三步：根路径重定向

注册完所有路由后，自动添加根路径到第一个有效路由的重定向：

```ts
/** 注册动态路由 */
const registerDynamicRoutes = (options: DynamicRouteGuardOptions) => {
  const { router, pages, authorizedRoutes, activeRule } = options

  for (const route of authorizedRoutes) {
    const component = resolveComponent(pages, route.meta.filePath)
    if (!component) continue

    router.addRoute({
      path: stripBase(route.path, activeRule),
      name: route.name,
      component,
    })
  }

  // 根路径重定向到第一个有效路由
  // 路由注册时已执行 stripBase，path 无需再次处理
  // [!code focus]
  const firstRoutePath = router.getRoutes()[0]?.path
  // [!code focus]
  if (firstRoutePath) {
    // [!code focus]
    router.addRoute({ path: '/', redirect: firstRoutePath }) // [!code focus]
  } // [!code focus]
}
```

### 子应用接入示例

在子应用创建路由实例时注册。

```ts [apps/vue3-history/src/router/guard/dynamicRouteGuard.ts]
import type { Router } from 'vue-router'
import { createDynamicRouteGuard } from '@breeze/bridge-vue'
import { microAppContext } from '@/utils/microAppContext'

const pages = import.meta.glob([
  '../../views/**/*.vue',
  '!../../views/**/components/*',
])

export const setupDynamicRoute = (router: Router) =>
  createDynamicRouteGuard({
    router,
    pages,
    authorizedRoutes: microAppContext.authorizedRoutes,
    activeRule: microAppContext.activeRule,
  })
```

```ts [apps/vue3-history/src/router/index.ts]
import { createRouter, createWebHistory } from 'vue-router'
import { setupDynamicRoute } from './guard/dynamicRouteGuard'

/** 创建路由实例 */
export const generateRouter = (base?: string) => {
  const router = createRouter({
    history: createWebHistory(base),
    routes: [],
  })

  setupDynamicRoute(router) // [!code focus]

  return router
}
```

## hostBridge 模块

`hostBridge` 负责封装主子应用间基于 `window.QiankunRuntime.channel` 的运行时通信，当前主要覆盖：

- 子应用请求主应用打开 / 跳转到目标路由
- 子应用请求主应用关闭 tab
- 子应用监听主应用关闭 tab 后的反向通知，并清理本地 KeepAlive 缓存

这一部分和运行时事件、主应用监听、子应用调用示例强相关，详细说明统一放在 [应用间的通信（runtime-events）](./runtime-events.md) 中，避免在两处文档重复维护。
