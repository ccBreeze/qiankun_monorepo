---
title: 路由机制
---

# 路由机制

本文档从整体视角梳理主应用与子应用之间的路由协作机制，说明一次页面导航是如何在 qiankun 微前端架构中完成的。

## 背景与问题

在菜单驱动的微前端架构中，子应用需要知道"当前用户有权访问哪些页面"才能正确注册路由。

**旧方案的问题**：子应用依赖 `menuKey + userData[menuKey]` 获取**单个菜单分组**的数据，再以 `activeRule` 统一补前缀。这种方式存在两个缺陷：

1. **单个菜单分组的数据天然不完整**：子应用的路由往往分散在多个菜单分组中（如部分路由在"会员管理"、部分在"营销中心"），仅读取单个 `menuKey` 无法拿到全量数据，<span style="color: var(--vp-c-danger-1); font-weight: bold;">会导致路由注册不完整；缺失的路由无法确定归属于哪个菜单</span>，`createDynamicRouteGuard` 在执行动态路由注册时找不到对应条目，这部分路由将永远无法被注册；
2. **同一菜单分组可能跨子应用**：同一分组下可能同时包含 `/vue3-history/...` 和 `/crm-v8/...` 的路由，以 `activeRule` 统一补前缀会将其他子应用的路由错误注册到当前子应用。

**新方案**：主应用在菜单构建阶段 `buildAllMenus` 完成全量解析，按 `activeRule` 聚合成各子应用的授权路由集，再通过 qiankun `props` 的 `authorizedRoutes` 字段下发给对应子应用。

## 约束

::: tip 路径格式约定
本项目所有路径（`path`、`activeRule`）统一遵循：**以 `/` 开头，结尾不带 `/`**。

例如：`/vue3-history`、`/vue3-history/CouponListTemp`。

相关工具函数（`normalizePath`、`stripBase` 等）均以此为前提，处理时无需额外兼容尾部斜杠。
:::

::: warning 菜单与子应用的归属关系

- <span style="color: var(--vp-c-danger-1); font-weight: bold;">`activeRule` 前缀只能判断一条路由属于哪个子应用，不能判断它属于哪个菜单分组。</span>菜单归属依赖 `DynamicRoute` 构建出的完整路由表进行匹配，无法简化为 `pathPrefix → menuGroup` 的映射。
- <span style="color: var(--vp-c-danger-1); font-weight: bold;">一个菜单分组里可以混合多个子应用的路由。</span>例如"会员管理"的 `fallbackActiveRule` 是 `/vue3-history`，但其下完全可能同时存在 `/vue3-history/memberList` 和 `/crm-v8/memberCard`，它们分属不同子应用。因此授权路由必须按 `meta.activeRule` 维度重新聚合，而非直接按菜单分组派发。
  :::

- **非默认子应用**的菜单 `url` 必须显式携带目标 `activeRule` 前缀（如 `/crm-v8/xxx`），不可依赖 `fallbackActiveRule` 自动补齐；`fallbackActiveRule` 仅用于兼容旧项目中未带前缀的菜单配置。

- 路由（菜单）配置**不支持热更新**，修改后需用户重新登录方可生效。

- **子应用必须将 `activeRule` 配置为 vue-router 的 `base`**（即 `createWebHistory(activeRule)`）：子应用路由路径以 `/` 开头但**不携带** `activeRule` 前缀（如 `/CouponList` 而非 `/vue3-history/CouponList`）；vue-router 会在生成 URL 时自动补全 base、在路由匹配时自动剥离 base，符合 [Vue Router 官方"部署到子目录时须配置 `base`"的要求](https://router.vuejs.org/zh/guide/essentials/history-mode)。子应用独立运行时只需将 `base` 改为 `/`，**无需修改任何路由定义**。此外，嵌套路由中[以 `/` 开头的路径被视为根路径](https://router.vuejs.org/zh/guide/essentials/nested-routes.html)——配置了 `base` 后，子应用路由同样以 `/` 开头定义，但 vue-router 会将其解析为相对于 base 的路径，而非绝对路径，两者行为一致。

## 路由分层模型

本项目的路由体系分为三层，各层职责清晰、单向依赖：

<script setup>
import drawioXml from './drawio/routing-mechanism.drawio?raw'
</script>
<ClientOnly>
  <DrawioViewer :data="drawioXml" />
</ClientOnly>

**三层职责概述：**

| 层级         | 技术       | 职责                                          |
| ------------ | ---------- | --------------------------------------------- |
| 主应用路由层 | vue-router | 登录鉴权 + 子应用容器匹配（路由别名）         |
| 子应用激活层 | qiankun    | 根据 URL 前缀加载/显示对应子应用              |
| 子应用路由层 | vue-router | 根据授权路由动态注册页面（base = activeRule） |

## 路由劫持原理

微前端框架（qiankun / garfish）的路由驱动核心是**劫持浏览器的 URL 变化事件**，在主应用感知到路由变化后，根据预先注册的 `activeRule` 决定加载或切换哪个子应用。

具体机制：

1. **拦截 `history.pushState` / `history.replaceState`**：原生 API 不会触发 `popstate` 事件，框架通过重写这两个方法，在调用时主动派发自定义事件或直接触发匹配逻辑
2. **监听 `popstate` 事件**：捕获浏览器前进/后退操作
3. **URL 匹配**：每次 URL 变化时，遍历已注册的子应用列表，将当前 URL 与各应用的 `activeRule` 进行匹配，命中则激活对应子应用

这一层对业务代码透明——主应用和子应用各自使用标准的 vue-router，无需感知劫持的存在。qiankun 作为中间层，在 URL 变化时先于子应用路由执行匹配，确保正确的子应用被加载到 DOM 中，随后子应用的 vue-router 再接管内部路由。

> 参考：[Garfish — 路由机制](https://www.garfishjs.org/guide/concept/router.html)

## 一次导航的完整流程

以用户访问 `/vue3-history/CouponListTemp` 为例：

### 第一步：主应用路由匹配

主应用路由表通过**别名**机制让所有子应用前缀路径都匹配到同一个容器组件：

```ts [apps/main-app/src/router/index.ts]
// 从注册表中提取所有子应用的路径前缀，生成通配别名
const microAppAliases = microApps.map(({ activeRule }) => {
  const segment = activeRule.split('/')[1]
  return `/${segment}/:subPath*`
})
// 结果：['/ocrm/:subPath*', '/vue3-history/:subPath*', '/crm-v8/:subPath*']

const routes = [
  { path: '/login', name: 'Login', component: LoginPage },
  {
    path: '/microApp',
    name: 'microApp',
    alias: microAppAliases, // 别名让子应用路径命中此路由
    component: Home, // 包含侧边栏 + MicroApp 容器
  },
]
```

当访问 `/vue3-history/CouponListTemp` 时，vue-router 通过别名 `/vue3-history/:subPath*` 匹配到 `/microApp` 路由，渲染 `Home` 组件。

在此之前，`createAuthGuard` 会检查 `accessToken`，未登录时拦截并跳转到 `/login`：

```ts [apps/main-app/src/router/guard/auth.ts]
router.beforeEach((to) => {
  if (to.path === LOGIN_PATH) return true
  if (!authStore.accessToken) {
    // 弹窗提示后跳转登录页
    return false
  }
})
```

### 第二步：识别激活的子应用

`Home` 组件内嵌 `MicroApp/index.vue`，该组件依赖 `useMicroAppStore` 计算当前应激活的子应用：

```ts [apps/main-app/src/stores/microApp.ts]
const activeMicroApp = computed(() => {
  return microAppConfigs.value.find((app) =>
    route.fullPath.startsWith(app.activeRule),
  )
})
```

`route.fullPath` 为 `/vue3-history/CouponListTemp`，与 `activeRule: '/vue3-history'` 匹配，于是 `vue3-history` 被识别为当前激活应用。

### 第三步：加载子应用

`MicroApp/index.vue` watch `activeMicroApp` 的变化，首次命中时调用 qiankun 的 `loadMicroApp` 加载子应用：

```vue [apps/main-app/src/views/MicroApp/index.vue]
<template>
  <div class="micro-container">
    <div
      v-for="app in microAppConfigs"
      v-show="app.name === activeMicroApp?.name"
      :id="`micro-container__${app.name}`"
      :key="app.name"
    ></div>
  </div>
</template>
```

```ts
watch(
  activeMicroApp,
  async (newApp, oldApp) => {
    if (oldApp?.name) {
      await loadedApps.value.get(oldApp.name)?.mountPromise
    }
    if (!newApp || loadedApps.value.has(newApp.name)) return
    loadedApps.value.set(newApp.name, loadMicroApp(newApp))
  },
  { immediate: true },
)
```

关键设计：

- 所有子应用的容器 `div` 始终存在于 DOM 中，通过 `v-show` 控制显隐
- 已加载的子应用不会重复创建，通过 `loadedApps` Map 缓存实例
- 切换时等待前一个应用挂载完成，避免并发加载导致的生命周期冲突

### 第四步：Props 注入与子应用启动

qiankun 调用子应用的 `mount` 生命周期时，将主应用构造的 `props` 传入：

```ts [apps/main-app/src/stores/microApp.ts]
props: {
  activeRule: app.activeRule, // '/vue3-history'
  authorizedRoutes:
    menuStore.authorizedRoutesByActiveRule.get(app.activeRule) ?? [],
  userData: userStore.userData,
}
```

子应用在 `mount` 中接收并缓存：

```ts [apps/vue3-history/src/main.ts]
renderWithQiankun({
  mount(props) {
    microAppContext.setProps(props) // 缓存到上下文单例
    renderApp() // 创建 Vue 实例
  },
  unmount() {
    app?.unmount()
    microAppContext.reset() // 清空缓存
  },
})
```

### 第五步：子应用路由创建与动态注册

子应用创建 vue-router 实例时，以 `activeRule` 作为 `base`：

```ts [apps/vue3-history/src/router/index.ts]
export const generateRouter = (base?: string) => {
  const router = createRouter({
    history: createWebHistory(base), // base = '/vue3-history'
    routes: [], // 初始路由表为空
  })
  setupDynamicRoute(router, base)
  return router
}
```

路由表初始为空，由 `@breeze/bridge-vue` 提供的 `createDynamicRouteGuard` 在首次导航时动态注册：

```ts [packages/bridge-vue/src/dynamicRouteGuard.ts]
export const createDynamicRouteGuard = (options) => {
  let initialized = false
  router.beforeEach((to) => {
    const hasRoute = typeof to.name === 'string' && router.hasRoute(to.name)
    if (initialized && hasRoute) return true

    initialized = true
    if (!authorizedRoutes.length) return true

    registerDynamicRoutes({ router, pages, flatRoutes: authorizedRoutes, base })
    return to.fullPath // 重导航，让新注册的路由生效
  })
}
```

`registerDynamicRoutes` 遍历授权路由列表，通过 `import.meta.glob` 匹配页面组件并调用 `router.addRoute`：

```ts
const registerDynamicRoutes = ({ router, pages, flatRoutes, base }) => {
  for (const route of flatRoutes) {
    const component = resolveComponent(pages, route.meta.filePath)
    if (!component) continue

    router.addRoute({
      path: stripBase(route.path, base), // 去除 base 前缀
      name: route.name,
      component,
    })
  }
  // 根路径重定向到第一个有效路由
  const firstRoute = router.getRoutes()[0]
  router.addRoute({ path: '/', redirect: stripBase(firstRoute.path, base) })
}
```

至此，`/vue3-history/CouponListTemp` 被子应用的 vue-router 正确匹配到 `CouponListTemp/index.vue` 组件，页面渲染完成。

## activeRule 的双重角色

`activeRule` 是整个路由机制的核心纽带，在主应用和子应用中承担不同的角色：

| 角色            | 使用方                          | 用途                                                      |
| --------------- | ------------------------------- | --------------------------------------------------------- |
| URL 前缀匹配    | 主应用 `activeMicroApp`         | `route.fullPath.startsWith(activeRule)` 识别激活的子应用  |
| 路由别名前缀    | 主应用路由配置                  | 生成 `/${segment}/:subPath*` 通配别名                     |
| vue-router base | 子应用 `createWebHistory(base)` | 子应用路由以此为基准路径                                  |
| 路由分组 key    | `@breeze/router`                | `routesByActiveRule` 按此分组，确保路由下发到正确的子应用 |

`activeRule` 的单一来源是 `MICRO_APP_ACTIVE_RULE` 枚举：

```ts [apps/main-app/src/utils/microAppRegistry.ts]
export const MICRO_APP_ACTIVE_RULE = {
  OCRM: '/ocrm/#',
  VUE3_HISTORY: '/vue3-history',
  BREEZE_CRM_V8: '/crm-v8',
} as const
```

### history 模式（推荐）

新项目应优先选择 HTML5 History 模式。

### hash 模式

> hash 模式主要用于兼容无法迁移的历史遗留子应用。

**为什么 `activeRule` 是 `/ocrm/#` 而不是 `#/ocrm`**

这是一个**设计约束**：本项目要求所有子应用（无论 hash 还是 history 模式）都必须有独立的 `pathname` 前缀。

原因在于主应用使用 HTML5 History 模式，vue-router 只感知 `pathname`，路由别名 `/ocrm/:subPath*` 也只匹配 `pathname`。若 hash 子应用的 URL 格式为 `/#/ocrm/MemberList`（`pathname = /`），别名无法命中，主应用不会渲染容器，子应用无法加载。

退一步说，即使将主应用根路由 `/` 改为挂载容器组件来绕过别名问题，`activeMicroApp` 的匹配仍然不通：

```ts
// fullPath = '/#/ocrm/MemberList'，activeRule = '#/ocrm'
'/#/ocrm/MemberList'.startsWith('#/ocrm') // → false，# 前面有 /
```

此时还需要将 `activeRule` 同步改为 `/#/ocrm` 才能匹配，但这会引入新的问题：根路由 `/` 过于宽泛（任何未匹配路径都渲染容器）、鉴权逻辑复杂、两种模式的 `activeRule` 格式不一致。

因此统一要求 hash 子应用部署在独立的 `pathname` 前缀下，URL 格式为 `/ocrm/#/MemberList`，`activeRule` 写为 `/ocrm/#`，两种模式用相同的 `startsWith` 策略匹配：

```ts
'/ocrm/#/MemberList'.startsWith('/ocrm/#') // → true ✅ hash 模式
'/vue3-history/CouponList'.startsWith('/vue3-history') // → true ✅ history 模式
```

::: warning 主应用别名生成时的特殊处理
路由别名只取 `activeRule` 中 `#` 之前的路径段（`/ocrm`），`#` 及其后内容不参与别名匹配，仅用于子应用激活和路由分组。
:::

参考：

- [qiankun — 入门教程](https://qiankun.umijs.org/zh/cookbook)
- [garfish - 子应用拿到 basename 的作用？](https://www.garfishjs.org/issues.html#%E5%AD%90%E5%BA%94%E7%94%A8%E6%8B%BF%E5%88%B0-basename-%E7%9A%84%E4%BD%9C%E7%94%A8)

## 常见问题

### Q：为什么不用嵌套路由替代 `createWebHistory()` 的 base？

**嵌套路由方案**：在主应用 router 下挂一个父路由 `/vue3-history`，子应用的所有页面作为其子路由注册进来。

该方案存在以下根本性问题：

#### 1. `router.push` 写法不同

| 方案                     | 跳转写法                                        |
| ------------------------ | ----------------------------------------------- |
| 嵌套路由                 | `router.push('/vue3-history/Coupon')`（带前缀） |
| `createWebHistory(base)` | `router.push('/Coupon')`（只写相对路径）        |

`createWebHistory(base)` 方案让子应用代码与部署前缀彻底解耦：换前缀只改配置，无需修改代码；子应用独立运行时将 `base` 改为 `/` 即可。

#### 2. 不支持 hash 模式

嵌套路由本身不依赖 history 模式，hash 路由（`/#/path`）下也能正常工作。但 hash 模式下子应用的路径在 `#` 之后，`createWebHistory` 的 `base` 只作用于 pathname 部分，无法控制 hash 路径。

因此 hash 模式子应用（如 `activeRule = '/ocrm/#'`）无法通过 `base` 实现路径隔离，qiankun 需要通过函数式 `activeRule` 单独处理，这是两种模式在架构上的本质差异。

#### 3. URL 表面一致，但语义完全不同

两种写法产生相同的浏览器 URL `/user/profile`，但语义完全不同：

```ts
// 写法 A：base
createWebHistory('/user/')
routes: [{ path: '/profile', component: Profile }]

// 写法 B：嵌套路由
createWebHistory('/')
routes: [
  {
    path: '/user',
    component: Layout,
    children: [{ path: 'profile', component: Profile }],
  },
]
```

| 维度                | 写法 A（base）                                           | 写法 B（嵌套路由）                                  |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| **组件渲染**        | 只渲染 `Profile`                                         | `Layout` 包裹 `Profile`（需要两层 `<router-view>`） |
| **`route.path`**    | `/profile`（base 被剥离，vue-router 内部不感知 `/user`） | `/user/profile`                                     |
| **`route.matched`** | `[Profile 记录]`（1条）                                  | `[Layout 记录, Profile 记录]`（2条）                |
| **`router.push`**   | `router.push('/profile')`                                | `router.push('/user/profile')`                      |
| **导航守卫**        | 只触发 Profile 自身守卫                                  | Layout 守卫 → Profile 守卫（父子均执行）            |
| **独立运行适配**    | 将 `base` 改为 `/`                                       | 无需改动                                            |

写法 A 中的 `/user` 是纯粹的 **URL 命名空间**，vue-router 路由树对其一无所知；写法 B 中的 `/user` 是真实的**路由节点**，参与组件渲染、守卫执行和 `matched` 计算。

这一区别在以下两个场景中最容易混淆：

##### 场景 1：微前端子应用

```ts
createWebHistory('/sub-app/')
routes: [{ path: '/xxx', component: Page }]
```

视觉上 `/sub-app/xxx` 看起来像"嵌套在 `/sub-app` 下"，但 `/sub-app` 只是**部署基座（base）**，`/xxx` 才是业务路由。vue-router 路由树中根本没有 `/sub-app` 这个节点。

##### 场景 2：想要"模块前缀"时

如果目标是让 `/admin/user`、`/admin/order` 共享同一个 `AdminLayout` 外壳，应该用嵌套路由而非 `base`：

```ts
// ❌ base 无法共享布局组件
createWebHistory('/admin/')
routes: [
  { path: '/user', component: UserPage }, // 各自独立渲染，没有公共 Layout
  { path: '/order', component: OrderPage },
]

// ✅ 嵌套路由才能共享 AdminLayout
routes: [
  {
    path: '/admin',
    component: AdminLayout, // 公共外壳，包含侧边栏、面包屑等
    children: [
      { path: 'user', component: UserPage },
      { path: 'order', component: OrderPage },
    ],
  },
]
```

**结论**：`createWebHistory(activeRule)` 是微前端场景下的推荐方案，嵌套路由适合同构的单体应用，不适合跨实例的微前端架构。

参考：

- [Vue Router — History 模式](https://router.vuejs.org/zh/guide/essentials/history-mode)
- [Vue Router — 嵌套路由](https://router.vuejs.org/zh/guide/essentials/nested-routes.html)

### Q：子应用为什么不使用 Memory 模式？以及当前项目如何配置 Hash 模式与 HTML5 模式？

> 参考：[Vue Router — 不同的历史记录模式](https://router.vuejs.org/zh/guide/essentials/history-mode.html)

#### 子应用为什么不使用 Memory 模式

Memory 模式（`createMemoryHistory`）的核心特征是**路由状态只存活于内存中，子应用内部的路由跳转不会更新浏览器地址栏 URL**。这在微前端场景下会引发三个具体问题：

1. **刷新丢失页面**：子应用切换内部路由时 URL 不变，页面刷新后浏览器只能回到上一次 URL 对应的状态，子应用的当前路由无法被还原。

2. **无法分享/收藏页面**：URL 不携带子应用的内部路径，用户复制地址栏链接后，对方打开只能看到子应用的默认页，而非当前页面。

3. **浏览器历史记录混乱**：子应用内的路由跳转不写入浏览器历史栈，前进/后退按钮只能在主应用级别生效，无法在子应用内部的页面间回退。

Memory 模式适用于**非浏览器环境**（如 Node.js SSR、单元测试）或完全不需要地址栏感知的内嵌场景，微前端子应用不属于此类场景。

#### 当前项目的配置方式

本项目同时存在两种路由模式的子应用，通过 `activeRule` 的格式区分：

**HTML5 History 模式（`vue3-history`）**

| 配置项           | 值                                            |
| ---------------- | --------------------------------------------- |
| `activeRule`     | `/vue3-history`                               |
| 主应用 router    | `createWebHistory()`（无 base）               |
| 子应用 router    | `createWebHistory(base)`，`base = activeRule` |
| 主应用别名       | `/vue3-history/:subPath*`                     |
| qiankun 匹配逻辑 | `fullPath.startsWith('/vue3-history')`        |

```ts [apps/vue3-history/src/router/index.ts]
// 子应用路由创建
export const generateRouter = (base?: string) => {
  const router = createRouter({
    history: createWebHistory(base), // base = '/vue3-history'（由 qiankun props 传入）
    routes: [],
  })
  setupDynamicRoute(router)
  return router
}
```

**Hash 模式（`ocrm`）**

| 配置项           | 值                                         |
| ---------------- | ------------------------------------------ |
| `activeRule`     | `/ocrm/#`                                  |
| 主应用 router    | `createWebHistory()`（无 base）            |
| 子应用 router    | `createWebHashHistory()`                   |
| 主应用别名       | `/ocrm/:subPath*`（只取 `#` 之前的路径段） |
| qiankun 匹配逻辑 | `fullPath.startsWith('/ocrm/#')`           |

Hash 模式下 `activeRule` 带有 `#`，主应用生成别名时通过 `activeRule.split('/')[1]` 只截取 `ocrm` 用于路由匹配，但在 `startsWith` 判断和路由分组时使用完整的 `/ocrm/#`，从而让两种模式的子应用可以共存。

```ts [apps/main-app/src/utils/microAppRegistry.ts]
export const MICRO_APP_ACTIVE_RULE = {
  OCRM: '/ocrm/#', // Hash 模式：activeRule 包含 #
  VUE3_HISTORY: '/vue3-history', // HTML5 模式：纯路径前缀
  BREEZE_CRM_V8: '/crm-v8',
} as const
```

```ts [apps/main-app/src/router/index.ts]
// 主应用统一使用 HTML5 History 模式
const router = createRouter({
  history: createWebHistory(), // 无 base，管理 /login、/microApp 等自身路由
  routes,
})

// 生成子应用别名：只取 activeRule 的第一个路径段
// '/ocrm/#' → '/ocrm/:subPath*'
// '/vue3-history' → '/vue3-history/:subPath*'
const microAppAliases = microApps.map(({ activeRule }) => {
  const segment = activeRule.split('/')[1]
  return `/${segment}/:subPath*`
})
```

**两种模式对比总结**

| 对比项            | HTML5 History 模式                           | Hash 模式                                           |
| ----------------- | -------------------------------------------- | --------------------------------------------------- |
| `activeRule` 格式 | `/vue3-history`                              | `/ocrm/#`                                           |
| 子应用 router     | `createWebHistory(activeRule)`               | `createWebHashHistory()`                            |
| URL 示例          | `/vue3-history/CouponList`                   | `/ocrm/#/MemberList`                                |
| `base` 作用       | 对 pathname 生效，子应用内部路径自动剥离前缀 | `createWebHashHistory` 无需 base，hash 路径天然隔离 |
| 推荐程度          | ✅ 推荐，URL 简洁，SEO 友好                  | ⚠️ 兼容历史项目，新项目不推荐                       |
