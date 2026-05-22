# qiankun Monorepo

基于 [qiankun](https://qiankun.umijs.org/) 的微前端 Monorepo 工程模板，使用 pnpm workspace 管理多包，提供完整的主子应用通信、动态路由、Tab 管理等开箱即用能力。

**说明文档**：[https://ccbreeze.github.io/qiankun_monorepo/](https://ccbreeze.github.io/qiankun_monorepo/) — 包含详细的项目架构说明及实际开发中遇到的问题与解决方案

## 技术栈

- **包管理**：pnpm workspace
- **主应用**：Vue 3 + qiankun + Vue Router + Pinia
- **子应用**：Vue 3 + vite-plugin-qiankun
- **Mock 服务**：Nitro / h3
- **文档站**：VitePress
- **工具链**：TypeScript · ESLint · Stylelint · Prettier · Husky

## 目录结构

```
apps/
  main-app/        # 主应用（Host Shell）—— Vue 3 + qiankun
  vue3-history/    # 子应用示例（history 模式）—— Vue 3 + vite-plugin-qiankun
  mock-server/     # 本地 Mock 接口服务（Nitro/h3）
packages/
  runtime/         # @breeze/runtime：跨应用通信运行时
  router/          # @breeze/router：动态路由解析
  bridge-vue/      # @breeze/bridge-vue：Vue 子应用接入桥接层
  utils/           # @breeze/utils：环境判断等工具
  eslint-config/   # @breeze/eslint-config：共享 ESLint 配置
docs/              # VitePress 文档站
scripts/           # 工作区脚本（dev 并发启动等）
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动所有服务（主应用 + 子应用 + Mock + 文档站）
pnpm dev
```

## 常用命令

### 开发

```bash
pnpm dev               # 启动全部服务
pnpm dev main          # 仅启动主应用
pnpm dev vue3-history  # 仅启动 vue3-history 子应用
pnpm dev mock          # 仅启动 Mock 服务
```

### 构建

```bash
pnpm build                              # 构建全部 apps
pnpm --filter main-app run build        # 构建主应用
pnpm --filter vue3-history run build    # 构建 vue3-history 子应用
```

## License

ISC
