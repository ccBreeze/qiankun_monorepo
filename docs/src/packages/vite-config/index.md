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

## 子应用 .env 配置要求

子应用的 `.env` 文件必须包含 `VITE_APP_NAME`，值与主应用注册表中的应用名一致：

```ini [apps/vue3-history/.env]
VITE_APP_NAME=vue3-history
```

`VITE_APP_NAME` 缺失时构建或启动 dev server 会立即报错：

```
[vite-config] VITE_APP_NAME is required in .env for micro app config
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
