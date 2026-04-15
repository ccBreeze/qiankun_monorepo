---
title: 子应用状态管理
---

# 子应用状态管理

本文档说明 `apps/main-app/src/stores/microApp.ts` 的职责与实现。该 Store 不只负责构建 qiankun 应用配置列表和识别当前激活子应用，也统一管理子应用实例的挂载、卸载与回收。

## 职责

- 将[子应用注册表](./micro-app-registry.md)中的 `ResolvedMicroApp` 补全为 qiankun 可用的应用配置（含 `props`）
- 根据浏览器当前路由路径，响应式地暴露 `activeMicroApp`
- 将主应用的授权路由和用户数据以静态值形式注入子应用 props
- 在 Store 内统一维护 `loadMicroApp` / `unmount` 的生命周期，避免视图层持有子应用实例状态
- 当某个子应用对应的最后一个 tab 被关闭时，回收该子应用实例

## 类型

在静态的 `ResolvedMicroApp` 基础上注入 `props`，并在消费侧收窄 `userData` 的类型：

```ts [apps/main-app/src/stores/microApp.ts]
/** 运行时子应用配置 */
type MicroAppConfig = ResolvedMicroApp & {
  props: MicroAppHostProps & {
    userData: UserData // 收窄类型
  }
}
```

## microAppConfigs

扩展 `props` 的运行时配置，用于 qiankun `loadMicroApp` 手动加载子应用。

```ts [apps/main-app/src/stores/microApp.ts]
const menuStore = useMenuStore()
const userStore = useUserStore()

const microAppConfigs = computed<MicroAppConfig[]>(() => {
  return microApps.map((app) => ({
    ...app,
    props: {
      activeRule: app.activeRule,
      authorizedRoutes:
        menuStore.authorizedRoutesByActiveRule.get(app.activeRule) ?? [],
      userData: userStore.userData,
    },
  }))
})
```

| props 字段         | 说明                                                      |
| ------------------ | --------------------------------------------------------- |
| `activeRule`       | 子应用路由前缀，子应用用于 `createWebHistory(activeRule)` |
| `authorizedRoutes` | 子应用的授权路由列表                                      |
| `userData`         | 当前登录用户数据                                          |

## activeMicroApp

通过对 `route.fullPath` 做前缀匹配，从 `microAppConfigs` 中找出当前路由所属的子应用配置。

```ts [apps/main-app/src/stores/microApp.ts]
/** 根据当前路由自动匹配激活的子应用 */
const activeMicroApp = computed(() => {
  return microAppConfigs.value.find((app) =>
    route.fullPath.startsWith(app.activeRule),
  )
})
```

| 当前路径                       | 匹配结果                               |
| ------------------------------ | -------------------------------------- |
| `/crm-v8/home`                 | `breeze-crm-v8`（匹配 `/crm-v8`）      |
| `/vue3-history/couponListTemp` | `vue3-history`（匹配 `/vue3-history`） |
| `/login`                       | `undefined`（无匹配）                  |

## 子应用实例生命周期

### 实例缓存与卸载

```ts [apps/main-app/src/stores/microApp.ts]
/** 已加载的子应用实例，key 为应用 name */
const loadedMicroApps = new Map<string, MicroApp>()
/** 正在卸载中的子应用任务，避免并发重复卸载 */
const unmountingTasks = new Map<string, Promise<void>>()

const unmountMicroAppInstance = async (appName: string) => {
  const runningTask = unmountingTasks.get(appName)
  if (runningTask) {
    await runningTask
    return
  }

  const app = loadedMicroApps.get(appName)
  if (!app) return

  const task = (async () => {
    try {
      await app.unmount()
    } finally {
      loadedMicroApps.delete(appName)
      unmountingTasks.delete(appName)
    }
  })()

  unmountingTasks.set(appName, task)
  await task
}
```

这里做了两层保护：

- `loadedMicroApps` 负责缓存已成功创建的 qiankun 实例，避免重复 `loadMicroApp`
- `unmountingTasks` 负责合并同一应用的并发卸载请求，避免重复执行 `unmount()`

### 按 tab 生命周期回收实例

```ts [apps/main-app/src/stores/microApp.ts]
const releaseMicroAppIfOrphaned = async (
  activeRule: string | undefined,
  tabs: Array<{
    activeRule?: string
  }>,
) => {
  if (!activeRule) return

  const hasRemainingTab = tabs.some((item) => item.activeRule === activeRule)
  if (hasRemainingTab) return

  const microApp = microApps.find((app) => app.activeRule === activeRule)
  await unmountMicroAppInstance(microApp!.name)
}
```

回收判定是“应用维度”的，而不是“页面维度”的：

- 只要 `tabs` 中还存在任意一个 `tab.activeRule === 当前 activeRule`，就继续保留子应用实例
- 只有最后一个关联 tab 被关闭时，才真正执行 `unmount`

这和子应用内部的 KeepAlive 是两层不同机制：

- KeepAlive 负责缓存子应用内部某个页面的组件实例
- `releaseMicroAppIfOrphaned()` 负责回收整个 qiankun 子应用实例

### 切换时的挂载顺序控制

```ts [apps/main-app/src/stores/microApp.ts]
watch(
  activeMicroApp,
  async (newApp, oldApp) => {
    // 等待前一个应用挂载完成，防止切换过快导致加载失败
    // TODO: #31: Lifecycle function's promise did not resolve or reject
    if (oldApp?.name) {
      await loadedMicroApps.get(oldApp.name)?.mountPromise.catch(async () => {
        await unmountMicroAppInstance(oldApp.name)
      })
    }

    if (!newApp || loadedMicroApps.has(newApp.name)) return
    try {
      const microApp = loadMicroApp(newApp, newApp.configuration)
      loadedMicroApps.set(newApp.name, microApp)
      await microApp.mountPromise
    } catch (error) {
      await unmountMicroAppInstance(newApp.name)
      console.error(`[MicroApp] 子应用 ${newApp.name} 挂载失败`, error)
    }
  },
  { immediate: true },
)
```

这段 watch 负责两件事：

- 切换前先等待上一个应用挂载完成，避免 single-spa 生命周期并发打架
- 新应用挂载失败时主动清理半初始化实例，防止后续切换继续复用脏状态

## 在 MicroApp 视图中的使用

`apps/main-app/src/views/MicroApp/index.vue` 是 `microAppConfigs` 和 `activeMicroApp` 的消费入口，但它现在已经不直接管理子应用实例。

### 模板：用 microAppConfigs 预渲染所有容器

`MicroApp` 视图采用“先渲染全部挂载点，再按激活态切换可见性”的策略，而不是“命中路由才创建容器”。

```vue [apps/main-app/src/views/MicroApp/index.vue]
<div class="micro-container">
  <div
    v-for="app in microAppConfigs"
    v-show="app.name === activeMicroApp?.name"
    :id="app.container.slice(1)"
    :key="app.name"
  ></div>
</div>
```

- 外层 `.micro-container` 提供统一布局约束，配合子容器 `height: 100%` 让每个子应用填满可视区域

```scss [apps/main-app/src/views/MicroApp/index.vue]
.micro-container {
  height: 100%;

  & > :deep(div) {
    height: 100%;
  }
}
```

| 路由切换场景          | 容器层行为                    | 子应用实例行为              |
| --------------------- | ----------------------------- | --------------------------- |
| 首次进入 A 应用       | 所有容器已存在，仅 A 容器可见 | 创建并挂载 A                |
| A 切到 B（首次）      | A 容器隐藏，B 容器显示        | A 保留；创建并挂载 B        |
| B 切回 A（已加载）    | B 容器隐藏，A 容器显示        | 直接复用 A，不重复初始化    |
| 关闭 A 的最后一个 tab | A 容器不再参与显示            | A 执行 `unmount` 并释放实例 |

::: tip 为什么这里用 v-show 而不是 v-if
详情见 [子应用切换 KeepAlive 保活](./keep-alive-micro-app-switch.md)
:::

### 脚本：视图层只消费 Store 状态

```ts [apps/main-app/src/views/MicroApp/index.vue]
const { activeMicroApp, microAppConfigs } = storeToRefs(useMicroAppStore())

installMicroAppAssetRuntime()
```

`MicroApp/index.vue` 现在只负责两件事：

- 读取 `microAppConfigs` / `activeMicroApp` 来渲染容器与控制显隐
- 安装 `window.__assetsPath` 运行时能力

真正的 `loadMicroApp`、挂载异常兜底、实例回收逻辑都已经下沉到 `useMicroAppStore()` 中，避免视图层再维护一份并发状态。
