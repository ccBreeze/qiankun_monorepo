---
title: 子应用状态管理
---

# 子应用状态管理

本文档说明 `apps/main-app/src/stores/microApp.ts` 的职责与实现。该 Store 负责构建 qiankun 应用配置列表，并根据当前路由自动识别激活的子应用。

## 职责

- 将[子应用注册表](./micro-app-registry.md)中的 `ResolvedMicroApp` 补全为 qiankun 可用的应用配置（含 `props`）
- 根据浏览器当前路由路径，响应式地暴露 `activeMicroApp`
- 将主应用的授权路由和用户数据以静态值形式注入子应用 props

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

## 在 MicroApp 视图中的使用

`apps/main-app/src/views/MicroApp/index.vue` 是消费这两个值的核心视图。

### 模板：用 microAppConfigs 预渲染所有容器

// TODO: 接入 Keep-alive 再完善文档

```vue [apps/main-app/src/views/MicroApp/index.vue]
<div
  v-for="app in microAppConfigs"
  v-show="app.name === activeMicroApp?.name"
  :id="app.container.slice(1)"
  :key="app.name"
></div>
```

- `v-for` 遍历 `microAppConfigs`，为每个子应用创建一个挂载容器 `div`
- `:id="app.container.slice(1)"` 去掉 `container` 字段的 `#` 前缀作为 DOM `id`，与 qiankun 的 CSS 选择器同源，确保始终匹配
- `v-show` 根据 `activeMicroApp` 控制可见性：只显示当前激活应用的容器，其余隐藏

这样做的好处是已加载的子应用在切换时不会被销毁，避免重复初始化。

### 脚本：用 activeMicroApp 驱动按需加载

```ts [apps/main-app/src/views/MicroApp/index.vue]
const { activeMicroApp, microAppConfigs } = storeToRefs(useMicroAppStore())

/** 已加载的子应用实例，key 为应用 name */
const loadedApps = shallowRef(new Map<string, MicroApp>())

watch(
  activeMicroApp,
  async (newApp, oldApp) => {
    // 等待前一个应用挂载完成，防止切换过快导致加载失败
    if (oldApp?.name) {
      await loadedApps.value.get(oldApp.name)?.mountPromise
    }

    if (!newApp || loadedApps.value.has(newApp.name)) return
    loadedApps.value.set(newApp.name, loadMicroApp(newApp))
  },
  { immediate: true },
)
```

`watch(activeMicroApp)` 在每次路由切换后执行：

1. **等待旧应用挂载完成**：若上一个应用仍在挂载中，先 `await mountPromise`，防止快速切换时的竞态问题
2. **首次访问才加载**：`loadedApps` Map 记录已加载实例，`has(newApp.name)` 为真则跳过，实现懒加载
3. **调用 `loadMicroApp(newApp)`**：将完整的 `MicroAppConfig`（含 `props`）传入 qiankun，完成子应用注册与挂载

::: tip loadMicroApp 与 registerMicroApps 的区别
此处使用 `loadMicroApp`（手动加载模式）而非 `registerMicroApps`，可以自主控制加载时机，也方便拿到每个应用的 `MicroApp` 实例（用于 `mountPromise` 等生命周期等待）。
:::
