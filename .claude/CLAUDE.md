# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

### 启动开发服务

```bash
# 启动所有服务（主应用 + 所有子应用 + mock server + docs）
pnpm dev

# 启动单个服务（可选：mock / main / vue3-history / docs）
pnpm dev main
pnpm dev vue3-history
pnpm dev mock
```

### 构建

```bash
# 构建所有 apps
pnpm build

# 构建单个 app
pnpm --filter main-app run build
pnpm --filter vue3-history run build
```

### 类型检查

```bash
# 全量类型检查
pnpm type-check:all

# 单包类型检查
cd apps/main-app && pnpm run type-check
cd packages/bridge-vue && pnpm run type-check
```

### 代码检查与格式化

```bash
# ESLint 修复 + stylelint 修复 + prettier 格式化（推荐修改代码后运行）
pnpm -w run lint:fix && pnpm -w run stylelint:fix && pnpm -w run format
```

---

## 架构概览

本项目是基于 **qiankun** 的微前端 Monorepo，使用 pnpm workspace 管理。

### 目录结构

```
apps/
  main-app/        # 主应用（Host Shell）—— Vue 3 + qiankun
  vue3-history/    # 子应用示例（history 模式）—— Vue 3 + vite-plugin-qiankun
  mock-server/     # 本地 mock 接口服务（Nitro/h3）
packages/
  runtime/         # @breeze/runtime：跨应用通信运行时
  router/          # @breeze/router：动态路由解析
  bridge-vue/      # @breeze/bridge-vue：Vue 子应用接入桥接层
  utils/           # @breeze/utils：环境判断等工具
  eslint-config/   # @breeze/eslint-config：共享 ESLint 配置
docs/              # VitePress 文档站
```

### 子应用注册与激活（主应用侧）

子应用的静态配置集中在 `apps/main-app/src/utils/microApp/registry.ts`，通过 `MICRO_APP_ACTIVE_RULE`（定义于 `packages/runtime/src/microApps.ts`）统一管理激活路径。

主应用路由仅有 `/login` 和 `/microApp` 两个静态路由，子应用路径通过 `alias` 动态映射到 `/microApp`，由 `useMicroAppStore`（`apps/main-app/src/stores/microApp.ts`）在路由变化时调用 `loadMicroApp` / `unmount` 管理子应用生命周期。

### 子应用接入模式（子应用侧）

1. **入口文件**（参考 `apps/vue3-history/src/main.ts`）：通过 `vite-plugin-qiankun` 暴露 `mount/unmount/bootstrap` 生命周期钩子，支持独立运行和嵌入主应用两种模式。

2. **动态路由**：子应用不硬编码路由，在 `mount` 阶段通过 `authorizedRoutes`（主应用注入）注册后端权限路由，由 `@breeze/bridge-vue` 的 `dynamicRouteGuard` 实现（`packages/bridge-vue/src/router/dynamicRouteGuard.ts`）。

3. **Props 缓存**：使用 `MicroAppContext`（`packages/runtime/src/MicroAppContext.ts`）在 `mount` 阶段缓存 qiankun 注入的 `props`，子应用通过继承该类扩展。

### 主子应用通信

通过挂载在 `window.QiankunRuntime.channel`（EventEmitter2）的事件总线实现，事件定义见 `packages/runtime/src/events.ts`：

| 事件                   | 方向  | 说明                                          |
| ---------------------- | ----- | --------------------------------------------- |
| `tab:navigate:request` | 子→主 | 子应用请求主应用跳转/打开 tab                 |
| `tab:remove:request`   | 子→主 | 子应用请求主应用关闭 tab                      |
| `tab:remove`           | 主→子 | 主应用关闭 tab，通知子应用清除 KeepAlive 缓存 |

子应用使用 `@breeze/bridge-vue` 中的 `requestNavigateTab` / `requestRemoveTabByRoute` / `useTabRemoveListener` 与主应用交互。

### 子应用静态资源路径

子应用使用 Vite `experimental.renderBuiltUrl` 将资源路径推迟到运行时解析，主应用在加载子应用前注入 `window.__assetsPath`（`apps/main-app/src/utils/microApp/assetsPath.ts`）。

### Tab 管理

主应用 `tabBarStore`（`apps/main-app/src/stores/tabBar.ts`）基于 `fullPath` 维护 tab Map（持久化到 localStorage），支持按 tab 维度回收对应子应用实例（无同应用 tab 时自动 unmount）。

---

## 编码规范

### Monorepo 约定

- 跨包依赖统一写成 `workspace:*`/`workspace:^`，禁止相对路径引用其他包源码
- 包名使用 `@breeze/*` 作用域，目录名不含作用域前缀（例：目录 `packages/vite-config`，包名 `@breeze/vite-config`）
- 新增包的 TS 配置继承根目录 `tsconfig.lib.json` / `tsconfig.node.base.json`
- 公共依赖提升到根，安装/更新依赖在仓库根执行 `pnpm install`

### 语言与类型

- 所有新代码使用 TypeScript（`.ts`、`.tsx`），配置文件除外
- 代码注释使用中文

### 命名规范

- 组件文件：PascalCase（`UserProfile.vue`）
- 普通模块：camelCase（`microApp.ts`）
- 路由 path 与目录/文件名一致，路由 name 用短横线连接目录与文件名：

```typescript
// 文件：src/views/Demo/AutoImportExample.vue
{ path: '/Demo/AutoImportExample', name: 'Demo-AutoImportExample' }
```

### AI 修改代码后必须执行

1. 运行 lint + 格式化（见[常用命令](#代码检查与格式化)）
2. 运行类型检查：`cd [包目录] && pnpm run type-check`
3. 有无法自动修复的 warning 时向用户说明原因

**禁止主动修改文档**：未经明确指令，不得修改 `docs/` 目录下的任何内容。
