---
title: 路由协作机制
---

# 路由协作机制

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

相关工具函数（`normalizePath`、`stripActiveRule` 等）均以此为前提，处理时无需额外兼容尾部斜杠。
:::

::: warning 菜单与子应用的归属关系

- <span style="color: var(--vp-c-danger-1); font-weight: bold;">`activeRule` 前缀只能判断一条路由属于哪个子应用，不能判断它属于哪个菜单分组。</span>菜单归属依赖 `DynamicRoute` 构建出的完整路由表进行匹配，无法简化为 `pathPrefix → menuGroup` 的映射。
- <span style="color: var(--vp-c-danger-1); font-weight: bold;">一个菜单分组里可以混合多个子应用的路由。</span>例如"会员管理"的 `fallbackActiveRule` 是 `/vue3-history`，但其下完全可能同时存在 `/vue3-history/memberList` 和 `/crm-v8/memberCard`，它们分属不同子应用。因此授权路由必须按 `meta.activeRule` 维度重新聚合，而非直接按菜单分组派发。
  :::

- **非默认子应用**的菜单 `url` 必须显式携带目标 `activeRule` 前缀（如 `/crm-v8/xxx`），不可依赖 `fallbackActiveRule` 自动补齐；`fallbackActiveRule` 仅用于兼容旧项目中未带前缀的菜单配置。

- 路由（菜单）配置**不支持热更新**，修改后需用户重新登录方可生效。

- **子应用必须将 `activeRule` 配置为 vue-router 的 `base`**（即 `createWebHistory(activeRule)`），原因如下：
  - 子应用路由路径以 `/` 开头但**不携带** `activeRule` 前缀（如 `/CouponList` 而非 `/vue3-history/CouponList`）；vue-router 会在生成 URL 时自动补全 base、在路由匹配时自动剥离 base，符合 [Vue Router 官方"部署到子目录时须配置 `base`"的要求](https://router.vuejs.org/zh/guide/essentials/history-mode)。
  - 嵌套路由中[以 `/` 开头的路径被视为根路径](https://router.vuejs.org/zh/guide/essentials/nested-routes.html)——配置了 `base` 后，子应用路由同样以 `/` 开头定义，但 vue-router 会将其解析为相对于 base 的路径，而非绝对路径，两者行为一致。

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

> 参考：[Garfish — 路由协作机制](https://www.garfishjs.org/guide/concept/router.html)

## 一次导航的完整流程

以下以“用户已登录，直接打开 `/vue3-history/CouponListTemp`”为例，按项目中的真实代码链路说明一次导航如何完成。

### 第 0 步：导航前，主应用已经准备好子应用的运行时配置

登录成功或刷新页面（本地恢复用户信息）时，`useUserStore().setUserData()` 会调用 `menuStore.buildAllMenus(data)`，完成菜单解析（含按 `menuKey` 注入 DEMO 静态菜单）、路由树构建以及按 `activeRule` 聚合授权路由等工作。该流程的详细说明参见 [菜单状态管理 — 构建流程](./menu-store.md#构建流程)。

构建完成后，`useMicroAppStore` 基于静态注册表 `microApps` 生成运行时 `microAppConfigs`，将 `activeRule`、`authorizedRoutes`、`userData` 作为 qiankun `props` 挂到每个子应用配置上（详见 [子应用状态管理 — microAppConfigs](./micro-app-store.md#microappconfigs)）。

因此，进入 `MicroApp/index.vue` 之前，主应用已经拿到了 `vue3-history` 的完整配置：

- `name: 'vue3-history'`
- `entry: 'http://localhost:8101'`
- `container: '#micro-container__vue3-history'`
- `props.activeRule: '/vue3-history'`
- `props.authorizedRoutes: [...]`

### 第 1 步：主应用先把子应用 URL 命中到统一壳页面

主应用路由表没有为每个子应用单独声明页面，而是把所有子应用前缀路径都通过 **alias** 指到同一个 `/microApp` 路由（详见 [子应用注册表 — 路由别名](./micro-app-registry.md#路由别名)）。

因此，访问 `/vue3-history/CouponListTemp` 时，主应用 vue-router 会先命中别名 `/vue3-history/:subPath*`，最终渲染 `HomePage`。`HomePage` 本身只负责承载布局和子应用容器：

```vue [apps/main-app/src/views/HomePage/index.vue]
<template>
  <Layout>
    <MicroApp />
  </Layout>
</template>
```

在此之前，`createAuthGuard` 会先检查登录态；如果没有 `accessToken`，导航会被拦住并跳到 `/login`。

### 第 2 步：`MicroApp` 根据当前 URL 选中 `vue3-history`

`MicroApp/index.vue` 依赖 `useMicroAppStore` 暴露的 [`activeMicroApp`](./micro-app-store.md#activemicroapp)，通过 `route.fullPath.startsWith(app.activeRule)` 匹配当前应激活的子应用。

当 `route.fullPath === '/vue3-history/CouponListTemp'` 时，`activeRule === '/vue3-history'` 的配置被命中，因此当前激活应用就是 `vue3-history`。

组件模板会预先渲染所有子应用容器，只用 `v-show` 控制当前显示哪个容器（详见 [子应用状态管理 — 在 MicroApp 视图中的使用](./micro-app-store.md#在-microapp-视图中的使用)）。

### 第 3 步：首次命中时，主应用在 Store 中调用 `loadMicroApp` 加载子应用

`useMicroAppStore()` 内部监听 `activeMicroApp`，首次进入某个子应用时调用 `loadMicroApp(newApp)`，已加载过的实例直接复用；若该应用的最后一个 tab 被关闭，则进一步执行实例回收（详见 [子应用状态管理](./micro-app-store.md)）。

传给 `loadMicroApp` 的 `newApp` 就是主应用前面准备好的完整 qiankun 配置（`entry`、`container`、`props`）。因此 qiankun 在拉起 `vue3-history` 时，不只知道”把资源挂到哪里”，也知道”这个子应用当前应该以哪个路由前缀运行，以及它被授权了哪些页面”。

### 第 4 步：qiankun 执行子应用入口 `apps/vue3-history/src/main.ts`

`vue3-history` 的入口文件通过 `renderWithQiankun` 注册生命周期。主应用调用 `loadMicroApp` 后，qiankun 会执行它的 `mount(props)`（关于 `MicroAppContext` 的设计与使用方式，详见 [@breeze/runtime — MicroAppContext](./runtime.md#microappcontext)）：

```ts [apps/vue3-history/src/main.ts]
let app: App | null = null

function renderApp() {
  app = createApp(AppComponent)
  const router = generateRouter(microAppContext.activeRule)

  app.use(createPinia())
  app.use(router)
  app.use(Antd)

  app.mount(`#${import.meta.env.VITE_APP_NAME}`)
}

renderWithQiankun({
  mount(props) {
    microAppContext.setProps(props as QiankunLifecycleProps)
    renderApp()
  },
  unmount() {
    app?.unmount()
    app = null
    microAppContext.reset()
  },
})
```

这里有两个关键点：

1. `mount(props)` 先把主应用传入的 `props` 缓存在 `microAppContext` 中；
2. `renderApp()` 再读取 `microAppContext.activeRule` 来创建子应用自己的 router。

也就是说，子应用 router 的 `base` 不是硬编码的，而是由主应用运行时注入。

### 第 5 步：子应用用 `activeRule` 创建 router，并在首次导航时补注册动态路由

`generateRouter()` 会把主应用传入的 `activeRule` 作为 `createWebHistory(base)` 的 `base`：

```ts [apps/vue3-history/src/router/index.ts]
export const generateRouter = (base?: string) => {
  const router = createRouter({
    history: createWebHistory(base),
    routes: [],
  })

  setupDynamicRoute(router)
  return router
}
```

对于当前例子，`base === '/vue3-history'`。因此浏览器地址虽然是 `/vue3-history/CouponListTemp`，但在子应用 router 视角里，当前待匹配的路径已经变成 `/CouponListTemp`。

随后 `setupDynamicRoute(router)` 将 `authorizedRoutes` 和 `activeRule` 交给 `@breeze/bridge-vue` 的 `createDynamicRouteGuard()`。首次导航进入守卫时，它会做三件事：

1. 用 `matchActiveRule({ activeRule })` 判断当前 URL 是否属于本子应用，避免多个已挂载子应用互相误注册路由；
2. 遍历 `authorizedRoutes`，通过 `stripActiveRule` 剥离 `activeRule` 前缀后调用 `router.addRoute()` 注册路由；
3. 注册完成后返回 `to.fullPath`，让当前地址重新走一遍匹配流程。

守卫机制与注册流程的完整代码详见 [@breeze/bridge-vue — router 模块](./bridge-vue.md#router-模块)。

对 `/vue3-history/CouponListTemp` 这个例子来说：

- 主应用下发的授权路由 `route.path` 是 `/vue3-history/CouponListTemp`
- `stripActiveRule(route.path, '/vue3-history')` 之后，子应用实际注册的路径变成 `/CouponListTemp`
- `route.meta.filePath` 是 `/CouponListTemp`
- `resolveComponent()` 最终会命中 `apps/vue3-history/src/views/CouponListTemp/index.vue`

第一次守卫执行完成后，子应用 router 立刻对 `/CouponListTemp` 重新导航一次；此时路由已经存在，于是 `App.vue` 中的 `<RouterView />` 就能渲染出目标页面。

### 第 6 步：页面渲染完成，后续同应用内跳转不再重新加载子应用

到这里，一次从主应用到子应用页面的导航就完成了。后续如果还在 `/vue3-history/...` 前缀下切换页面：

- 主应用侧 `activeMicroApp` 不变，`loadMicroApp()` 不会再次执行；
- 子应用实例继续复用；
- 页面切换只由子应用自己的 vue-router 负责。

只有当 URL 前缀切到另一个 `activeRule`（例如 `/crm-v8/...`）时，主应用才会重新选择或加载另一个子应用实例。

## activeRule 的双重角色

`activeRule` 是整个路由机制的核心纽带，在主应用和子应用中承担不同的角色：

| 角色            | 使用方                          | 用途                                                      |
| --------------- | ------------------------------- | --------------------------------------------------------- |
| URL 前缀匹配    | 主应用 `activeMicroApp`         | `route.fullPath.startsWith(activeRule)` 识别激活的子应用  |
| 路由别名前缀    | 主应用路由配置                  | 生成 `/${segment}/:subPath*` 通配别名                     |
| vue-router base | 子应用 `createWebHistory(base)` | 子应用路由以此为基准路径                                  |
| 路由分组 key    | `@breeze/router`                | `routesByActiveRule` 按此分组，确保路由下发到正确的子应用 |

`activeRule` 的单一来源是 `@breeze/runtime` 导出的 `MICRO_APP_ACTIVE_RULE` 枚举：

```ts [packages/runtime/src/microApps.ts]
export const MICRO_APP_ACTIVE_RULE = {
  OCRM: '/ocrm/#',
  VUE3_HISTORY: '/vue3-history',
  BREEZE_CRM_V8: '/crm-v8',
} as const
```

### history 模式（推荐）

新项目应优先选择 HTML5 History 模式。

### hash 模式

> hash 模式主要用于兼容无法迁移的历史遗留子应用；主应用自身仍统一使用 `createWebHistory()`。

hash 子应用在本项目中的约定不是 `/#/ocrm/...`，而是 **`/ocrm/#/...`**。也就是说，它必须先占用一个独立的 `pathname` 前缀，再在 `#` 后维护自己的内部路由。

以 `/ocrm/#/index/system/userCenter` 为例，主应用侧看到的路由信息可以理解为：

- `route.path === '/ocrm/'`
- `route.hash === '#/index/system/userCenter'`
- `route.fullPath === '/ocrm/#/index/system/userCenter'`

这个拆分非常关键，因为主应用里有三处逻辑分别消费了不同层级的 URL。

**1. 主应用路由匹配只看 `pathname`，所以必须保留 `/ocrm` 这一段前缀**

主应用通过别名把所有子应用前缀都映射到同一个 `/microApp` 壳路由。对于 hash 子应用，别名只取 `#` 之前的路径段：

```ts [apps/main-app/src/router/index.ts]
const microAppAliases = microApps.map(({ activeRule }) => {
  const segment = activeRule.split('/')[1]
  return `/${segment}/:subPath*`
})

// '/ocrm/#' -> '/ocrm/:subPath*'
```

这意味着 `/ocrm/#/...` 仍然能先命中主应用壳页面并渲染 `MicroApp` 容器；如果 URL 写成 `/#/ocrm/...`，那么 `pathname` 只有 `/`，主应用根本无法判断应该加载哪个子应用。

**2. 子应用识别和菜单命中看的是 `fullPath`，所以 `#` 必须保留在 `activeRule` 里**

主应用不是把匹配逻辑交给 qiankun 自动处理，而是在 `useMicroAppStore` 里根据 `route.fullPath` 自己判断当前激活的子应用：

```ts [apps/main-app/src/stores/microApp.ts]
const activeMicroApp = computed(() => {
  return microAppConfigs.value.find((app) =>
    route.fullPath.startsWith(app.activeRule),
  )
})
```

因此：

```ts
'/ocrm/#/index/system/userCenter'.startsWith('/ocrm/#') // true
'/vue3-history/CouponList'.startsWith('/vue3-history') // true
```

两种模式最终仍然复用了同一套“前缀匹配”策略，只是 hash 子应用的前缀本身包含了 `#`。

同样的 `route.fullPath` 还会继续传给 `useMenuStore` 做菜单命中；而 `@breeze/router` 的 `normalizePath()` 只移除 query、保留 hash，因此 `/ocrm/#/...` 这类路径在菜单高亮、标签记录等主应用能力里也能正常工作。

**3. 当主应用主动跳转 hash 路径时，需要把 `path` 和 `hash` 分开传给 vue-router**

主应用的标签栏关闭逻辑里专门有一段 hash 分支：

```ts [apps/main-app/src/stores/tabBar.ts]
else if (to.path && /#/.test(to.path)) {
  const [path, hash] = to.path.split('#')
  void router.push({
    ...to,
    path,
    hash: '#' + hash,
  } as RouteLocationRaw)
}
```

原因很直接：主应用 router 仍然是 history 模式，`/ocrm/#/...` 对它来说是“`pathname + hash` 的组合”，而不是一个纯粹的字符串路径；如果不拆开传，hash 子应用的跳转和回退行为会变得不稳定。

**为什么 `activeRule` 必须写成 `/ocrm/#`**

总结下来，`/ocrm/#` 同时承担了两层语义：

- `/ocrm`：让主应用的 alias 能先命中壳路由并渲染容器
- `#` 及其后的内部路径：让主应用仍能用 `route.fullPath.startsWith(activeRule)`、菜单匹配和标签跳转去识别这个 hash 子应用

因此它既不能写成 `#/ocrm`，也不应该写成 `/#/ocrm`。前者无法和 `route.fullPath` 对齐，后者又丢失了独立的 `pathname` 前缀，会让主应用无法在进入壳页面之前就确定目标子应用。

::: details 测试性方案：如果只是验证可行性，如何临时改成 `/#/ocrm`
这种改法的目标是把地址改成 `/#/ocrm/index/welcome`。它能跑通，但前提是主应用同步改两处代码。

**1. 修改 `activeRule`，并确保应用标识仍然能解析出 `ocrm`**

```ts [packages/runtime/src/microApps.ts]
export const MICRO_APP_ACTIVE_RULE = {
  OCRM: '/ocrm/#', // [!code --]
  OCRM: '/#/ocrm', // [!code ++]
  VUE3_HISTORY: '/vue3-history',
  BREEZE_CRM_V8: '/crm-v8',
} as const
```

**2. 让根路由 `/` 直接承接壳页面，并跳过 `pathname === '/'` 的 alias 生成**

因为 `/#/ocrm/...` 对主应用来说，`#` 前面的 `pathname` 永远是 `/`，所以它不能再像 `/ocrm/#` 一样生成独立 alias，只能由根路由兜底承接：

<!-- prettier-ignore -->
```ts [apps/main-app/src/router/index.ts]
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login', // [!code --]
    alias: microAppAliases, // [!code ++]
    component: () => import('@/views/HomePage/index.vue'), // [!code ++]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage/index.vue'),
  },
  { // [!code --]
    path: '/microApp', // [!code --]
    name: 'microApp', // [!code --]
    alias: microAppAliases, // [!code --]
    component: () => import('@/views/HomePage/index.vue'), // [!code --]
  }, // [!code --]
]
```

这段配置的含义是：

- `/#/ocrm` 不再生成 alias，而是直接落到根路由 `/`
- `/vue3-history`、`/crm-v8` 这类仍有独立 `pathname` 前缀的子应用，继续使用 alias

主应用里 `activeMicroApp` 的识别逻辑本身不需要改，因为：

```ts
'/#/ocrm/index/welcome'.startsWith('/#/ocrm') // true
```

所以只要根路由已经渲染出 `HomePage`，后续的子应用匹配、容器显示、菜单命中依然可以继续工作。

**限制**

- `/#/ocrm` 没有独立 `pathname` 前缀，只能依赖根路由 `/` 兜底
- 根路由不能再只是简单重定向
- 这只是验证可行性的测试方案，不建议替代正式的 `/ocrm/#`
  :::

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

| 维度                | 写法 A（base）                                                       | 写法 B（嵌套路由）                                  |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| **组件渲染**        | 只渲染 `Profile`                                                     | `Layout` 包裹 `Profile`（需要两层 `<router-view>`） |
| **`route.path`**    | `/profile`（base 被剥离）<br/>子应用中 vue-router 内部不感知 `/user` | `/user/profile`                                     |
| **`router.push`**   | `router.push('/profile')`                                            | `router.push('/user/profile')`                      |
| **`route.matched`** | `[Profile 记录]`（1条）                                              | `[Layout 记录, Profile 记录]`（2条）                |
| **导航守卫**        | 只触发 Profile 自身守卫                                              | Layout 守卫 → Profile 守卫（父子均执行）            |

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

```ts [packages/runtime/src/microApps.ts]
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
