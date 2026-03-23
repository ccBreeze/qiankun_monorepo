# 项目初始搭建

本文档记录从零创建 pnpm Monorepo 项目，并配置 TypeScript、ESLint、Prettier 的完整过程。

## 1. 创建 Monorepo 基础结构

### 1.1 初始化项目

```bash [shell ~vscode-icons:file-type-shell~]
mkdir qiankun_monorepo && cd qiankun_monorepo
pnpm init
```

### 1.2 配置 pnpm workspace

创建 `pnpm-workspace.yaml`，声明工作区包的目录：

```yaml [pnpm-workspace.yaml]
packages:
  - 'apps/*'
  - 'packages/*'
```

- `apps/*`：存放最终应用（主应用、子应用等）
- `packages/*`：存放可复用库（工具函数、共享配置等）

### 1.3 安装 TypeScript 基础依赖

```bash [pnpm]
pnpm add -Dw typescript @types/node ts-node
```

> [!TIP] `-Dw` 参数说明
>
> - `-D`：安装为 devDependencies
> - `-w`：安装到 workspace 根目录（而非某个子包）

### 1.4 配置 TypeScript

项目采用分层继承的 tsconfig 结构，根目录提供基础配置，各子项目通过 `extends` 继承并补充差异。

完整的配置说明和各字段含义请参阅 [tsconfig 项目配置](/packages/eslint-config/tsconfig)。

### 1.5 创建目录与示例包

```bash [shell ~vscode-icons:file-type-shell~]
# 创建应用和包目录
mkdir -p apps/ex-app/src packages/utils/src
```

每个子包需要独立的 `package.json` 和 `tsconfig.json`：

```json [packages/utils/package.json]
{
  "name": "@breeze/utils",
  "version": "1.0.0",
  "main": "src/index.ts"
}
```

```json [packages/utils/tsconfig.json]
{
  "extends": "../../tsconfig.option.json"
}
```

### 1.6 配置 .gitignore

```gitignore [.gitignore]
node_modules/
```

此时的项目结构：

```
qiankun_monorepo/
├── apps/
│   └── ex-app/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── main.ts
├── packages/
│   └── utils/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── tsconfig.option.json
└── .gitignore
```

## 2. 配置 ESLint v9

ESLint v9 采用 [Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files) 格式，完整的依赖安装、配置结构、规则说明和 NPM Scripts 请参阅 [ESLint 项目配置](/guide/eslint-config)。

## 3. 配置 Prettier 并集成 ESLint

### 3.1 安装依赖

Prettier 本身安装在 workspace 根目录，ESLint 集成插件安装在共享配置包 `@breeze/eslint-config` 中：

```bash [pnpm]
# Prettier 安装到 workspace 根
pnpm add -Dw prettier

# ESLint 集成插件安装到共享配置包
cd packages/eslint-config
pnpm add eslint-config-prettier eslint-plugin-prettier
```

| 包名                     | 安装位置                | 用途                                               |
| ------------------------ | ----------------------- | -------------------------------------------------- |
| `prettier`               | workspace 根            | 代码格式化工具                                     |
| `eslint-config-prettier` | `@breeze/eslint-config` | 关闭所有与 Prettier 冲突的 ESLint 规则             |
| `eslint-plugin-prettier` | `@breeze/eslint-config` | 将 Prettier 作为 ESLint 规则运行，格式问题直接报错 |

同时在 `@breeze/eslint-config` 的 `package.json` 中声明 `prettier` 为 peerDependency：

```json [packages/eslint-config/package.json]
{
  "peerDependencies": {
    "prettier": "^3.0.0"
  }
}
```

### 3.2 创建 Prettier 配置

```yaml [.prettierrc.yaml]
semi: false
singleQuote: true
tabWidth: 2
proseWrap: preserve
```

| 选项          | 值         | 说明                                   |
| ------------- | ---------- | -------------------------------------- |
| `semi`        | `false`    | 不使用分号                             |
| `singleQuote` | `true`     | 使用单引号                             |
| `tabWidth`    | `2`        | 缩进宽度 2 空格                        |
| `proseWrap`   | `preserve` | 保持 Markdown 等散文内容的原始换行方式 |

### 3.3 创建 .prettierignore

```gitignore [.prettierignore]
node_modules/
pnpm-lock.yaml

.eslintcache
.prettiercache
.stylelintcache

# 自动生成的类型声明文件
**/auto-imports.d.ts
**/components.d.ts
```

除了基本的 `node_modules` 和锁文件外，还忽略了 lint 工具的缓存文件以及由 `unplugin-auto-import` / `unplugin-vue-components` 自动生成的类型声明文件。

### 3.4 集成到 ESLint

Prettier 与 ESLint 的集成封装在共享配置包 `@breeze/eslint-config` 中，详细的实现原理和配置说明请参阅 [ESLint 配置 — prettier.ts](/guide/eslint-config#prettier-ts)。

### 3.5 添加 format 脚本

```json [package.json]
{
  "scripts": {
    "format": "prettier '.' --write --cache"
  }
}
```

| 参数      | 说明                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| `'.'`     | 格式化目标为当前目录（整个项目），Prettier 会根据 `.prettierignore` 排除不需要的文件                                |
| `--write` | 将格式化结果直接写入源文件（不加此参数只会输出 diff，不修改文件）                                                   |
| `--cache` | 启用文件缓存（缓存存放于 `node_modules/.cache/prettier/.prettier-cache`），后续执行时仅处理有变更的文件，加速格式化 |

## 最终项目结构

```
qiankun_monorepo/
├── apps/
│   └── ex-app/
│       └── eslint.config.js      ← 导入 @breeze/eslint-config
├── packages/
│   ├── eslint-config/            ← 共享 ESLint 配置包
│   │   └── src/
│   │       ├── index.ts          ← 统一导出
│   │       ├── base.ts           ← 基础配置（JS + TS + Prettier）
│   │       ├── prettier.ts       ← Prettier 集成
│   │       ├── typescript.ts     ← TypeScript 规则
│   │       ├── vue3.ts           ← Vue 3 配置
│   │       └── ignores.ts        ← 全局忽略规则
│   └── utils/
├── package.json                  ← type: module, scripts
├── pnpm-workspace.yaml           ← workspace 声明
├── tsconfig.json                 ← 继承 tsconfig.option.json
├── tsconfig.option.json          ← 通用 TS 编译选项
├── eslint.config.js              ← 根目录 ESLint 配置（导入 base）
├── .prettierrc.yaml              ← Prettier 格式化规则
├── .prettierignore               ← Prettier 忽略文件
└── .gitignore
```
