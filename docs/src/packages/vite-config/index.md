# @breeze/vite-config

本文说明 `@breeze/vite-config` 包的职责与用法。该包提供两个配置工厂函数，分别面向**主应用**与 **qiankun 子应用**，统一管理插件列表、构建拆包、路径别名和开发服务器选项，避免各应用重复维护相同配置。

## 包结构

```
packages/vite-config/
├── src/
│   ├── base.ts   # createVue3BaseConfig —— 通用基础配置
│   └── micro.ts  # createVue3MicroAppConfig —— 子应用配置（继承 base）
└── package.json
```

包名 `@breeze/vite-config`，通过两个具名导出路径对外提供：

| 导出路径                    | 导出内容                   | 适用场景       |
| --------------------------- | -------------------------- | -------------- |
| `@breeze/vite-config/base`  | `createVue3BaseConfig`     | 主应用         |
| `@breeze/vite-config/micro` | `createVue3MicroAppConfig` | qiankun 子应用 |

## createVue3BaseConfig

### 功能

创建适用于 Vue 3 + Vite 项目的通用配置，封装以下内容：

- **路径别名**：`resolve.alias`
- **开发服务器**：固定端口 + `strictPort` + 跨域支持
- [API/组件自动导入](../../optimization/auto-import)
- [Vite 构建拆包策略](../../optimization/vite-code-splitting)

### 参数

```ts
type SharedVueOptions = {
  /** 开发服务器端口（同时用作 preview 端口） */
  port: number
}
```

### 使用方式

```ts [apps/main-app/vite.config.ts]
import { defineConfig, mergeConfig } from 'vite'
import { createVue3BaseConfig } from '@breeze/vite-config/base'

export default defineConfig(
  mergeConfig(createVue3BaseConfig({ port: 8100 }), {
    // 主应用特有配置写在这里
  }),
)
```

## createVue3MicroAppConfig

### 功能

在 `createVue3BaseConfig` 的基础上，通过 `mergeConfig` 叠加 qiankun 子应用专属配置：

- **`vite-plugin-qiankun`**：向子应用注入 qiankun 生命周期钩子（`mount/unmount/bootstrap`）
- **`define`**：从 `package.json.name` 派生 `import.meta.env.VITE_APP_NAME`，统一应用代码与 HTML 挂载节点的名称
- **`server.origin`**：让开发模式下子应用的 `modulepreload` 链接携带完整 origin
- **`experimental.renderBuiltUrl`**：将 JS/CSS 中的静态资源路径改写为运行时表达式，解决子应用嵌入主应用后的 404 问题，详见 [Vite 动态修改 base](../../qiankun/asset-path)

### 参数

与 `createVue3BaseConfig` 相同，接受 `SharedVueOptions`（只需传 `port`）。

### 使用方式

```ts [apps/vue3-history/vite.config.ts]
import { createVue3MicroAppConfig } from '@breeze/vite-config/micro'

export default createVue3MicroAppConfig({ port: 8101 })
```

子应用只需提供端口，无需重复配置插件或构建选项。

## 子应用名称与构建常量

子应用名称统一以 `package.json.name` 为来源，值须与主应用 qiankun 注册表中的应用名一致。例如 `vue3-history` 的名称字段为：

```json [apps/vue3-history/package.json]
{
  "name": "vue3-history"
}
```

包管理器运行应用脚本时，会通过 `process.env.npm_package_name` 提供这个名称。`createVue3MicroAppConfig` 读取并校验一次，再将同一个 `appName` 用于以下位置：

| 使用位置                        | 名称的用途                                                         |
| ------------------------------- | ------------------------------------------------------------------ |
| `qiankun(appName)`              | qiankun 生命周期注册                                               |
| `renderBuiltUrl`                | 构建产物调用 `window.__assetsPath(appName, filename)` 时的应用标识 |
| `import.meta.env.VITE_APP_NAME` | Vue 挂载节点查找、404 页面的 `appName` 参数                        |
| HTML 中的 `%VITE_APP_NAME%`     | 子应用根节点 ID                                                    |

公共配置通过 `define` 注入客户端字段，配置片段如下：

```ts [packages/vite-config/src/micro.ts]
const appName = process.env.npm_package_name
const microAppConfig = {
  define: {
    'import.meta.env.VITE_APP_NAME': JSON.stringify(appName),
  },
}
```

`VITE_APP_NAME` 是固定的应用元数据，在生产构建时写入产物，无需在 `.env` 中重复维护。继续保留 `VITE_` 命名，应用代码和 HTML 沿用原有读取方式。其他随环境变化的 `VITE_*` 配置仍可放在 `.env` 文件中，由 Vite 正常加载。Vite 7.3.2 的 HTML 替换也会读取 `define` 中的 `import.meta.env.*` 定义。[Vite HTML 替换实现](https://github.com/vitejs/vite/blob/v7.3.2/packages/vite/src/node/plugins/html.ts)

应用代码与 HTML 使用同一个名称：

```ts [apps/vue3-history/src/main.ts]
const rootId = `#${import.meta.env.VITE_APP_NAME}`
const rootContainer = microAppContext.container?.querySelector(rootId) || rootId
app.mount(rootContainer)
```

```html [apps/vue3-history/index.html]
<div id="%VITE_APP_NAME%"></div>
```

各子应用的 `env.d.ts` 为该字段提供类型声明：

```ts [apps/vue3-history/env.d.ts]
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
}
```

通过子应用脚本启动或构建，以确保包管理器提供正确的包名：

```bash
pnpm --filter vue3-history run dev
pnpm --filter vue3-history run build
```

如果直接调用 Vite 且未提供 `npm_package_name`，配置工厂会立即报错：

```
[vite-config] 缺少 npm_package_name，请通过包管理器运行子应用脚本，以读取 package.json 中的应用名称。
```

## peer dependencies

`@breeze/vite-config` 不打包任何插件，插件均通过 peer dependencies 引入，由使用方按需安装：

| peerDependency            | 说明                 | 是否必须 |
| ------------------------- | -------------------- | -------- |
| `vite`                    | 构建工具本体         | 必须     |
| `@vitejs/plugin-vue`      | Vue SFC 编译         | 必须     |
| `@vitejs/plugin-vue-jsx`  | JSX 支持             | 必须     |
| `unplugin-auto-import`    | API 自动导入         | 必须     |
| `unplugin-vue-components` | 组件自动导入         | 必须     |
| `vite-plugin-qiankun`     | qiankun 生命周期注入 | 仅子应用 |

Monorepo 中所有插件已提升至根目录 `devDependencies`，各应用的 `package.json` 中无需重复声明。
