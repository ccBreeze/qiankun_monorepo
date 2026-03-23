# pnpm Workspace 与 Catalog

本文档记录本项目中用到的 pnpm Monorepo 相关知识，包括 Workspace 配置、Catalog 依赖管理、常用命令等。

## 1. Workspace 配置

pnpm 通过 `pnpm-workspace.yaml` 声明 Monorepo 的包目录：

```yaml [pnpm-workspace.yaml]
packages:
  - apps/*
  - packages/*
```

所有匹配的子目录（含 `package.json`）都会被识别为 workspace 包。

### 1.1 workspace 协议

workspace 内的包互相引用时，使用 `workspace:` 协议：

```json [package.json]
{
  "dependencies": {
    "@breeze/utils": "workspace:*",
    "@breeze/qiankun-shared": "workspace:*"
  }
}
```

| 写法          | 含义                                  |
| ------------- | ------------------------------------- |
| `workspace:*` | 匹配任意版本，始终链接本地包          |
| `workspace:^` | 发布时转换为 `^x.y.z`（兼容主版本）   |
| `workspace:~` | 发布时转换为 `~x.y.z`（兼容补丁版本） |

> [!TIP] 本项目约定
> 跨包依赖统一写成 `workspace:*`，禁止使用相对路径引用其他包的源码。

## 2. Catalog — 统一版本管理

Catalog 的基本用法（定义、引用、优势等）请参阅官方文档：[pnpm Catalogs](https://pnpm.io/zh/catalogs)。

### 迁移现有依赖到 Catalog

使用 codemod 工具可以自动将所有硬编码的版本号迁移到 catalog：

```bash
pnpx codemod pnpm/catalog
```

该命令会自动完成以下工作：

1. 扫描所有 workspace 包的 `package.json`
2. 将硬编码的版本号提取到 `pnpm-workspace.yaml` 的 `catalog` 中
3. 将原版本号替换为 `catalog:`
4. 自动执行 `pnpm install`

> [!TIP] 提示
> 如果同一依赖在不同包中存在多个不同版本，codemod 会交互式提示选择版本。

## 3. 常用命令

### 3.1 依赖管理

```bash
# 在根目录安装公共开发依赖（-w = --workspace-root）
pnpm add -Dw <package>

# 给指定包安装依赖
pnpm --filter <package-name> add <dependency>

# 全局安装（所有 workspace 包）
pnpm install
```

> [!TIP] 本项目约定
> 公共依赖优先提升到根，包内只保留运行/构建必需项。安装或更新依赖统一在仓库根目录执行 `pnpm install`。

### 3.2 脚本执行

```bash
# 执行指定包的脚本
pnpm --filter <package-name> run <script>

# 所有包并行执行脚本
pnpm -r --parallel run <script>

# 所有包顺序执行脚本（按拓扑排序）
pnpm -r run <script>

# 仅对 apps 下的包执行
pnpm --filter "./apps/*" run build
```

### 3.3 filter 过滤器

`--filter` 是 pnpm workspace 中最常用的参数，用于选定目标包：

| 用法                  | 说明                                          |
| --------------------- | --------------------------------------------- |
| `--filter <name>`     | 按包名匹配（`package.json` 中的 `name` 字段） |
| `--filter "./apps/*"` | 按目录 glob 匹配                              |
| `--filter <name>...`  | 包含该包及其所有依赖                          |
| `--filter ...<name>`  | 包含该包及所有依赖它的包                      |

### 3.4 前缀运行

使用 `--prefix` 在非 workspace 包目录中运行命令（如独立的 docs 目录）：

```bash
# 运行 docs 目录的 dev 脚本（docs 不在 workspace 中）
pnpm --prefix docs run dev
```

## 4. 本项目的 pnpm 脚本一览

```json [package.json（根目录）]
{
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "dev:mock": "pnpm --filter @breeze/mock-server run dev",
    "dev:main": "pnpm --filter main-app run dev",
    "dev:vue3-app": "pnpm --filter vue3-app run dev",
    "dev:all": "concurrently ... \"pnpm dev:mock\" \"pnpm dev:main\" \"pnpm dev:vue3-app\" \"pnpm docs:dev\"",
    "build": "pnpm -r run build",
    "build:apps": "pnpm --filter \"./apps/*\" run build",
    "type-check:all": "pnpm -r --parallel --if-present run type-check"
  }
}
```

| 命令                  | 说明                                         |
| --------------------- | -------------------------------------------- |
| `pnpm dev`            | 所有包并行启动开发服务                       |
| `pnpm dev:main`       | 仅启动主应用                                 |
| `pnpm dev:all`        | 使用 concurrently 同时启动所有服务           |
| `pnpm build`          | 按拓扑排序构建所有包                         |
| `pnpm build:apps`     | 仅构建 apps 目录下的应用                     |
| `pnpm type-check:all` | 并行对所有包执行类型检查（跳过无此脚本的包） |
