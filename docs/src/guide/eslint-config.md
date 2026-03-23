# ESLint 项目配置

本文档以**文件维度**逐一说明项目中每个 ESLint 配置文件的完整内容及各字段含义。

## 前置：启用 ESM

在根 `package.json` 中添加 `type: "module"`：

```json [package.json]
{
  "type": "module"
}
```

::: details 为什么需要启用 ESM？

Node.js 中 `.js` 文件默认被当作 CommonJS 模块，无法使用 `import` / `export` 语法。设置 `"type": "module"` 后，所有 `.js` 文件都被识别为 ESM，这对本项目尤其重要：

- **ESLint Flat Config**（`eslint.config.js`）要求使用 `export default`，ESM 是官方推荐写法
- **Vite** 原生基于 ESM，`vite.config.ts` 等配置文件也是 ESM
- **项目中所有配置文件**（`eslint.config.js`、`stylelint.config.js` 等）都使用了 `import` / `export` 语法

> [!TIP] 如果个别文件需要 CommonJS
> 可以将文件后缀改为 `.cjs`，Node.js 会将 `.cjs` 文件始终视为 CommonJS 模块，不受 `"type": "module"` 影响。

:::

## 整体结构

```
qiankun_monorepo/
├── eslint.config.js                  ← 根目录配置（仅 lint 根目录文件）
├── stylelint.config.js               ← 全局样式 lint 配置
├── .prettierrc.yaml                  ← Prettier 格式化配置
├── .lintstagedrc.yaml                ← 提交前自动检查配置
│
├── apps/
│   ├── main-app/
│   │   ├── eslint.config.js          ← Vue 3 + auto-import
│   │   └── .eslintrc-auto-import.json ← 自动生成的 globals
│   ├── vue3-app/
│   │   ├── eslint.config.js          ← Vue 3 + auto-import
│   │   └── .eslintrc-auto-import.json
│   └── mock-server/
│       └── eslint.config.js          ← 纯 TS（无 Vue）
│
└── packages/
    └── eslint-config/                ← 共享配置包 @breeze/eslint-config
        ├── package.json
        └── src/
            ├── index.ts              ← 统一导出入口
            ├── ignores.ts            ← 全局忽略规则
            ├── prettier.ts           ← Prettier 集成
            ├── typescript.ts         ← TypeScript 规则 + Project Service
            ├── base.ts              ← 基础配置（JS + TS + Prettier）
            └── vue3.ts              ← Vue 3 配置（包含 base）
```

## 为什么每个子项目都需要独立的 eslint.config.js

Monorepo 中并非不能只用根目录一份配置，但本项目采用**”共享配置包 + 子项目薄配置”**模式，主要基于以下原因：

1. **typed linting 需要明确的 tsconfig 边界**
   `typescript-eslint` 的类型感知规则需要知道每个文件属于哪个 tsconfig。子项目间的 `include`、`types`、路径别名各不相同，每个子项目设置 `tsconfigRootDir: import.meta.dirname` 指向自己的 tsconfig 是最清晰的做法。

2. **子应用需要注入各自的 auto-import globals**
   Vue 应用使用 `unplugin-auto-import` 生成各自的 `.eslintrc-auto-import.json`，这些 globals 必须在对应子应用的配置中注入，单根配置无法区分。

3. **Flat Config 不再层叠**
   ESLint v9 找到最近的 `eslint.config.js` 后就停止查找。子项目放置自己的配置文件，通过显式导入共享配置实现复用，既保持规则统一，又支持局部覆盖。

```javascript [apps/main-app/eslint.config.js]
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { vue3 } from '@breeze/eslint-config'
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

export default defineConfigWithVueTs(...vue3, {
  languageOptions: {
    globals: autoImportGlobals.globals,
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

> [!TIP] 什么时候可以只用根目录一份？
> 如果仓库规模小、技术栈单一、typed linting 覆盖需求简单，单根配置是可行的。  
> 一旦出现多框架、多运行时或复杂类型边界，建议尽早切换到“共享 + 子项目薄配置”模式。

**延伸阅读**：

- [Turborepo ESLint Guide](https://turborepo.dev/docs/guides/tools/eslint)
- [typescript-eslint Monorepo Typed Linting](https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/)
- [ESLint v9 in a Monorepo with Flat Config（Felipe Morais）](https://medium.com/@felipeprodev/how-to-use-eslint-v9-in-a-monorepo-with-flat-config-file-format-8ef2e06ce296)

## eslint.config.js 与 tsconfig.json 的协作关系

`eslint.config.js` 和 `tsconfig.json` 各有职责，但通过 **Typed Linting（类型感知 lint）** 机制紧密协作——ESLint 读取 `tsconfig.json` 提供的类型信息，从而启用更强大的检查规则。

### 各自的职责

| 维度         | `tsconfig.json`              | `eslint.config.js`                      |
| ------------ | ---------------------------- | --------------------------------------- |
| **核心职责** | 定义类型检查和编译行为       | 定义代码质量和风格规则                  |
| **独立功能** | 类型推导、路径别名、编译输出 | 普通 JS 规则、Vue 规则、Prettier 格式化 |
| **协作功能** | 被动提供类型信息             | 主动通过 `projectService` 消费类型信息  |

### 连接桥梁：`projectService` + `tsconfigRootDir`

两者的连接点在共享配置包的 `typescript.ts` 中：

```typescript [packages/eslint-config/src/typescript.ts]
parserOptions: {
  projectService: {
    allowDefaultProject: ['*.js', '*.mjs', '*.cjs'],
  },
}
```

`projectService` 声明"需要类型信息"，但还需要知道去哪里查找 `tsconfig.json`。每个子项目通过 `tsconfigRootDir` 指定搜索起点：

```javascript [apps/main-app/eslint.config.js]
parserOptions: {
  tsconfigRootDir: import.meta.dirname,  // → apps/main-app/
}
```

完整工作流程：

> [!TIP] 一句话总结
> `tsconfig.json` 负责"理解代码类型"，`eslint.config.js` 负责"基于类型信息检查代码质量"，`projectService` + `tsconfigRootDir` 是将两者串联起来的桥梁。

<ClientOnly>
  <DrawioViewer :data="typeAwareWorkflow" />
</ClientOnly>

### 为什么需要类型信息？

以下规则**必须依赖 `tsconfig.json` 提供的类型推导**才能工作：

- `@typescript-eslint/await-thenable`
- `@typescript-eslint/no-misused-promises`
- `@typescript-eslint/switch-exhaustiveness-check`
- `@typescript-eslint/no-unnecessary-condition`

没有 `tsconfig.json`，这些规则完全无法运行，ESLint 只能执行不依赖类型的基础规则。

## 核心概念：Flat Config 与配置数组

ESLint v9 引入了 [Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files) 格式，取代了旧的 `.eslintrc.*` 层叠配置。核心变化是：**配置文件导出一个数组，数组中的每个对象就是一条配置，按顺序合并**。

```javascript [eslint.config.js]
export default [
  config1, // 第一条配置
  config2, // 第二条，同名字段会覆盖第一条
  ...configs, // 展开其他配置数组
]
```

### 配置对象的核心字段

| 字段              | 类型       | 说明                                                             |
| ----------------- | ---------- | ---------------------------------------------------------------- |
| `name`            | `string`   | 配置名称，用于调试和日志中标识配置来源                           |
| `files`           | `string[]` | 匹配的文件范围（glob），不设则匹配所有文件                       |
| `ignores`         | `string[]` | 忽略的文件范围（glob）                                           |
| `languageOptions` | `object`   | 语言解析选项，包含 `parser`、`parserOptions`、`globals` 等       |
| `rules`           | `object`   | 规则配置，键为规则名，值为 `"off"` / `"warn"` / `"error"` 或数组 |
| `linterOptions`   | `object`   | Linter 行为选项，如 `reportUnusedDisableDirectives`              |

### Flat Config 的"向上查找"机制

ESLint 从被 lint 的文件所在目录开始查找 `eslint.config.*`，如果没有就向父目录继续查找直到仓库根。这意味着子项目放置自己的 `eslint.config.js` 就可以覆盖根配置，而不影响其他子项目。

::: tip 与旧版 `.eslintrc` 的区别

- 旧版 `.eslintrc` 支持层叠（子目录继承父目录配置）
- Flat Config 不再层叠——找到最近的 `eslint.config.js` 后就停止查找。因此本仓库在每个子项目中各放一个 `eslint.config.js`，通过显式导入共享配置来实现复用。
  :::

### 配置数组的组合顺序

数组中后面的配置会覆盖前面的同名 `rules`。本项目遵循以下顺序：

<ClientOnly>
  <DrawioViewer :data="configOrderXml" />
</ClientOnly>

## 共享配置包：@breeze/eslint-config

共享配置包是整个 ESLint 架构的核心，负责统一规则和依赖管理。所有子项目通过导入此包来获取一致的 lint 规则。

### package.json

```jsonc [packages/eslint-config/package.json]
{
  "name": "@breeze/eslint-config",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
  },
  "files": ["src"],
  "dependencies": {
    "@eslint/js": "catalog:",
    "@vue/eslint-config-typescript": "catalog:",
    "eslint-config-prettier": "catalog:",
    "eslint-plugin-prettier": "catalog:",
    "eslint-plugin-vue": "catalog:",
    "typescript-eslint": "catalog:",
  },
  "peerDependencies": {
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": ">=5.0.0",
  },
}
```

| 配置项             | 值                   | 含义                                                                         |
| ------------------ | -------------------- | ---------------------------------------------------------------------------- |
| `type`             | `"module"`           | 声明为 ESM 包，ESLint v9 通过 `import()` 加载配置文件                        |
| `exports`          | `"./src/index.ts"`   | 直接暴露 TypeScript 源码，由 Node.js ESM 通过 `--import tsx` 或类似机制加载  |
| `dependencies`     | `catalog:`           | 使用 pnpm catalog 统一管理版本号，所有 ESLint 插件和规则集都集中在此包       |
| `peerDependencies` | `eslint`、`prettier` | 声明为 peer 依赖，由消费方（各子项目）提供实际安装，避免重复安装和版本不一致 |

::: details 为什么 ESLint 依赖集中在配置包而不是各子项目？

将 ESLint 插件集中到 `@breeze/eslint-config` 的 `dependencies` 中有三个好处：

1. **版本统一**：所有子项目使用同一版本的 `eslint-plugin-vue`、`typescript-eslint` 等，避免"A 项目用 v8，B 项目用 v7"的混乱
2. **升级集中**：升级 ESLint 插件只需改配置包的 `package.json`，不用逐个子项目修改
3. **安装简化**：子项目只需安装 `@breeze/eslint-config`（加上 peer dependencies），不用关心内部用了哪些插件

这也是 [Turborepo 推荐的模式](https://turborepo.com/docs/guides/tools/eslint)：让配置包成为"ESLint 依赖的唯一真相来源"。

:::

---

### index.ts

```typescript [packages/eslint-config/src/index.ts]
export * from './base.ts'
export * from './vue3.ts'
export * from './prettier.ts'
export * from './typescript.ts'
export * from './ignores.ts'
```

::: tip 选择哪种导出？

- **`base`** 已包含 `typescript` 与 `prettier`，适合纯 TS / Node.js 项目
- **`vue3`** 已包含 `base`，适合 Vue 3 + TS 项目
- **需要精细控制再拆分**：单独组合 `typescript` / `prettier` / `ignores`
  :::

---

### ignores.ts — 全局忽略规则

```typescript [packages/eslint-config/src/ignores.ts]
import { globalIgnores } from 'eslint/config'

export const ignores = globalIgnores([
  // 依赖目录
  '**/node_modules/**',

  // 构建输出
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.output/**',

  // 框架特定
  '**/.next/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/.nitro/**',

  // 缓存和临时文件
  '**/.cache/**',
  '**/coverage/**',

  // 类型声明（自动生成）
  '**/*.d.ts',
  '!**/src/**/*.d.ts', // 但保留 src 目录下的手写声明
  '**/auto-imports.d.ts', // 忽略所有 auto-imports.d.ts
  '**/components.d.ts', // 忽略自动生成的组件类型声明

  // 锁文件
  '**/pnpm-lock.yaml',
  '**/package-lock.json',
  '**/yarn.lock',
])
```

::: details globalIgnores() 与普通 ignores 字段的区别

`globalIgnores()` 是 ESLint v9.0+ 提供的工具函数，等价于一个**只有 `ignores` 字段**的配置对象。当配置对象只有 `ignores`（没有 `files`、`rules` 等），ESLint 会将其视为"全局忽略"，对所有后续配置生效。

```javascript [globalIgnores ~vscode-icons:file-type-js~]
// 这两种写法等价：
globalIgnores(['**/dist/**'])
// ↕
{
  ignores: ['**/dist/**']
} // 没有 files/rules 等字段 → 全局生效
```

如果同时带有 `files` 或其他字段，`ignores` 就变成"仅在该配置对象范围内忽略"：

```javascript [ignores ~vscode-icons:file-type-js~]
{
  files: ['**/*.ts'],
  ignores: ['**/*.test.ts'],  // 仅在匹配 .ts 文件的上下文中忽略 .test.ts
  rules: { /* ... */ }
}
```

:::

---

### prettier.ts

```typescript [packages/eslint-config/src/prettier.ts]
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

/**
 * 使用官方推荐配置，一次性完成：
 * 1. 关闭所有与 Prettier 冲突的 ESLint 规则（eslint-config-prettier）
 * 2. 注册 prettier 插件并启用 prettier/prettier 规则
 *
 * ⚠️ 必须放在配置数组的最后，确保 eslint-config-prettier 能覆盖前面所有规则中的格式规则
 *
 * @see https://github.com/prettier/eslint-plugin-prettier#recommended-configuration
 */
export const prettier = [eslintPluginPrettierRecommended]
```

使用 [`eslint-plugin-prettier/recommended`](https://github.com/prettier/eslint-plugin-prettier#recommended-configuration) 官方推荐配置，一个导入完成 Prettier 集成：

- 关闭所有与 Prettier 格式规则冲突的 ESLint 规则（内含 `eslint-config-prettier`）
- 注册 `prettier` 插件并启用 `prettier/prettier: 'error'` 规则，`--fix` 时自动格式化

::: details 为什么用 eslint-plugin-prettier 而不是单独运行 Prettier？

两种方案对比：

**方案一：`eslint-plugin-prettier`（本项目采用）**

- 优点：一次 `eslint --fix` 同时修复规则和格式
- 缺点：ESLint 运行稍慢（需要调用 Prettier）

**方案二：分开运行 `eslint` + `prettier`**

- 优点：各工具独立运行，Prettier 速度更快
- 缺点：需要分别配置和运行两个命令

本项目选择方案一，确保 `eslint --fix` 一次搞定所有问题。同时在 `lint-staged` 中也配置了 `prettier --write`，提交前批量格式化速度更快。

:::

---

### typescript.ts

```typescript [packages/eslint-config/src/typescript.ts]
import type { Linter } from 'eslint'
import tseslint from 'typescript-eslint'

export const typescript: Linter.Config[] = [
  // TypeScript 推荐规则
  ...tseslint.configs.recommended,

  {
    name: '@breeze/typescript/typed-linting',
    // 类型感知配置
    languageOptions: {
      parserOptions: {
        // 使用 Project Service API（v8+ 推荐）
        // 自动查找最近的 tsconfig.json，无需 monorepo 特殊配置
        projectService: {
          // 为不在 tsconfig 范围内的 JS 配置文件提供类型解析兜底
          allowDefaultProject: ['*.js', '*.mjs', '*.cjs'],
        },
      },
    },
    rules: {
      // === Promise 相关规则（核心规则，防止异步错误）===
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // === 类型完整性检查 ===
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // === 类型安全规则（警告级别）===
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',

      // === 代码质量规则 ===
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
```

配置分为两部分：

- **规则集继承**：[`tseslint.configs.recommended`](https://typescript-eslint.io/users/configs#recommended) 提供 TypeScript 推荐规则预设
- **类型感知 + 自定义规则**：通过 [`projectService: true`](https://typescript-eslint.io/blog/project-service/)（v8+ 推荐）启用 Project Service API，自动发现最近的 `tsconfig.json`，无需手动指定路径

::: details Project Service 与 parserOptions.project 的区别

`typescript-eslint` 提供两种方式接入 TypeScript 类型信息：

| 方式                           | 配置方式                          | 适用场景                 |
| ------------------------------ | --------------------------------- | ------------------------ |
| `parserOptions.project`        | 手动指定 tsconfig 路径或 glob     | 精细控制，需维护路径列表 |
| `parserOptions.projectService` | 自动发现就近 tsconfig（v8+ 推荐） | Monorepo 友好，零配置    |

Project Service 的核心优势：

- **零配置**：无需手动列出所有子项目的 tsconfig 路径
- **Monorepo 友好**：自动匹配每个文件最近的 tsconfig
- **支持 .vue 文件**：原生支持 Vue 单文件组件的类型解析
- **与编辑器一致**：使用与 VS Code TypeScript 语言服务相同的逻辑

:::

::: details allowDefaultProject 的使用场景与注意事项

当 Project Service 找不到某个 JS 文件对应的 tsconfig 时，会出现：

```text
Parsing error: eslint.config.js was not found by the project service.
Consider either including it in the tsconfig.json or including it in allowDefaultProject.
```

**先看结论**

- 只想让少量 JS 配置文件（如 `eslint.config.js`）支持 ESLint 类型感知规则，且不想改各项目 tsconfig：用 `allowDefaultProject`（本项目采用）。
- 想让这些 JS 文件成为 TypeScript 项目成员（`tsc`/IDE 也完整接管）：用 `allowJs + include`。
- 两种方式不能同时命中同一文件。

**两种方案对比**

| 方案                  | 维护成本                     | ESLint 类型感知规则 | `tsc` / IDE 类型服务 | 适用场景             |
| --------------------- | ---------------------------- | ------------------- | -------------------- | -------------------- |
| `allowDefaultProject` | 低（集中在 ESLint 共享配置） | ✅                  | ❌                   | 少量 JS 配置文件兜底 |
| `allowJs + include`   | 中高（每项目维护 tsconfig）  | ✅                  | ✅                   | 大量 JS 需长期类型化 |

**本项目采用方式**

```ts
projectService: {
  allowDefaultProject: ['*.js', '*.mjs', '*.cjs'],
}
```

`allowDefaultProject` 匹配到的文件会通过 `defaultProject`（默认 `tsconfig.json`）获取类型信息；路径相对于 `tsconfigRootDir` 解析。

由于每个 `eslint.config.js` 都设置了 `tsconfigRootDir: import.meta.dirname`，默认项目会自动落到各自目录：

| eslint.config.js 位置 | tsconfigRootDir   | defaultProject 解析为          |
| --------------------- | ----------------- | ------------------------------ |
| 仓库根目录            | 仓库根            | 根 `tsconfig.json`             |
| `apps/main-app/`      | `apps/main-app/`  | `apps/main-app/tsconfig.json`  |
| `packages/utils/`     | `packages/utils/` | `packages/utils/tsconfig.json` |

示例（类型感知规则依赖类型信息）：

```js [eslint.config.js]
async function demo() {
  await 123
}
```

- 没有 `allowDefaultProject` 且文件不在 tsconfig `include`：可能报 project service 错误，或类型感知规则无法工作
- 有 `allowDefaultProject`：`@typescript-eslint/await-thenable` 可正常报告问题

> [!NOTE] 与“格式检查”的关系
> `allowDefaultProject` 只影响“类型信息来源”，不决定是否 lint 该文件，也不负责格式化。
> `eslint.config.js` 的格式检查主要由 `prettier/prettier` 规则负责。

> [!WARNING] 使用边界
>
> - 不支持 `**` 递归 glob，且官方建议谨慎使用（sparingly）
> - 不要与 `allowJs + include` 同时命中同一文件，否则会冲突报错
> - 在 Vue 项目中，`defineConfigWithVueTs` 默认会对 JS 应用 `disableTypeChecked`，如需对 JS 启用类型感知规则需要额外覆盖配置

:::

---

### base.ts — 基础配置

```typescript [packages/eslint-config/src/base.ts]
import type { Linter } from 'eslint'
import eslint from '@eslint/js'
import { ignores } from './ignores.ts'
import { prettier } from './prettier.ts'
import { typescript } from './typescript.ts'

export const base: Linter.Config[] = [
  // 全局忽略规则
  ignores,

  // Linter 选项
  {
    name: '@breeze/base/linter-options',
    linterOptions: {
      // 报告无用的 eslint-disable 注释
      reportUnusedDisableDirectives: 'warn',
    },
  },

  // ESLint 推荐规则
  eslint.configs.recommended,

  // TypeScript 规则
  ...typescript,

  // Prettier 集成（放在最后以覆盖冲突规则）
  ...prettier,
]
```

::: details reportUnusedDisableDirectives 的作用

当代码中的 `eslint-disable` 注释所对应的规则在当前位置不会报错时，这个选项会产生警告：

```javascript
// eslint-disable-next-line no-console -- 这里没有 console，注释是多余的
const x = 1
// ⚠️ 警告：Unused eslint-disable directive (no problems were reported from 'no-console')
```

这通常发生在修复了 ESLint 问题后忘记删除 `eslint-disable` 注释，或者代码重构后注释失去了意义。设为 `'warn'` 而非 `'error'` 是为了不阻断 CI，同时提醒开发者清理。

:::

---

### vue3.ts

```typescript [packages/eslint-config/src/vue3.ts]
import type { Linter } from 'eslint'
import { vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import { base } from './base.ts'
import { prettier } from './prettier.ts'

export const vue3: Linter.Config[] = [
  // 基础配置（JS + TS + Prettier）
  ...base,

  // Vue 推荐规则
  ...pluginVue.configs['flat/recommended'],

  // Vue + TypeScript 集成
  vueTsConfigs.recommended,

  // Vue 自定义规则
  {
    name: '@breeze/vue3/custom-rules',
    files: ['**/*.{vue,jsx,tsx}'],
    rules: {
      // 关闭与 Prettier 冲突但未被 eslint-config-prettier 覆盖的规则
      'vue/first-attribute-linebreak': 'off',

      // 组件名规则
      'vue/multi-word-component-names': [
        'error',
        {
          // 允许 index.vue 作为组件名
          ignores: ['index'],
        },
      ],

      // 检测模板中使用的未定义组件
      'vue/no-undef-components': [
        'error',
        {
          // 忽略 router 组件和 ant-design-vue 组件
          ignorePatterns: ['router-view', 'router-link', '^a-', '^A[A-Z]'],
        },
      ],
    },
  },

  // Prettier 集成（必须放在最后以关闭所有格式化冲突规则，包括 Vue 插件的）
  ...prettier,
]
```

::: details 为什么 `...base` 中已包含 `...prettier`，末尾还要再加一次？

`...base` 展开后 Prettier 在中间，后续追加的 Vue 推荐规则会重新引入格式化冲突。末尾再次展开 `...prettier` 确保它始终在最后。

:::

::: details vue/first-attribute-linebreak 为什么要手动关闭？

[`eslint-config-prettier`](https://github.com/prettier/eslint-config-prettier) 已经自动关闭了大部分与 Prettier 冲突的 Vue 格式规则，但 `vue/first-attribute-linebreak` **不在其覆盖范围内**。

该规则控制组件第一个属性是否必须换行，与 Prettier 的格式化行为冲突——Prettier 会根据行宽自动决定是否换行，而该规则强制要求特定格式。因此需要手动设为 `'off'`。

:::

::: details vue/no-undef-components 的 ignorePatterns 说明

| 模式            | 匹配示例                  | 说明                              |
| --------------- | ------------------------- | --------------------------------- |
| `'router-view'` | `<router-view />`         | Vue Router 内置组件               |
| `'router-link'` | `<router-link to="/">`    | Vue Router 内置组件               |
| `'^a-'`         | `<a-button>`、`<a-table>` | Ant Design Vue 组件（kebab-case） |
| `'^A[A-Z]'`     | `<AButton>`、`<ATable>`   | Ant Design Vue 组件（PascalCase） |

这些组件通过全局注册或 `unplugin-vue-components` 自动导入，ESLint 无法通过静态分析发现它们的注册位置，因此需要用模式匹配来排除。

:::

::: details 为什么 Vue 项目里 `eslint.config.js` 可能不会触发 `@typescript-eslint/await-thenable`？

在 Vue 子项目中，我们通常会这样写：

```js
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
export default defineConfigWithVueTs(...)
```

`defineConfigWithVueTs` 内部会为 `**/*.js` / `**/*.mjs` / `**/*.cjs` 注入一段“跳过类型检查”配置（`disableTypeChecked`）。这段配置会：

- 将 `parserOptions.projectService` 置为 `false`
- 关闭 `@typescript-eslint/await-thenable`、`@typescript-eslint/no-misused-promises` 等类型感知规则

因此，`eslint.config.js` 虽然会被 ESLint 扫描到，但不会再执行类型感知规则，像下面代码就不会报你期望的错误：

```js
async function demo() {
  await 123
}
```

这也是“为什么在 Vue 项目中，`eslint.config.js` 看起来没做类型检查”的根本原因。  
注意：`tsconfig` 中的 `allowJs/checkJs` 只影响 `tsc/vue-tsc`，不会自动重新开启 ESLint 里被 `disableTypeChecked` 关掉的规则。

如果你确实需要对该文件启用类型感知规则，做法是：在 `defineConfigWithVueTs(...)` 之后追加一个后置 override（必须后置，避免再次被覆盖）：

```js
export default [
  ...defineConfigWithVueTs(...vue3, {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }),
  {
    files: ['eslint.config.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'error',
    },
  },
]
```

同时需要让 TypeScript 项目服务能找到 `eslint.config.js`——在 `tsconfig.node.json` 中将其纳入 `include`，并开启 `allowJs`（TypeScript 默认不处理 `.js` 文件，仅添加 glob 不够）：

```jsonc [tsconfig.node.json]
{
  "extends": "../../tsconfig.node.base.json",
  "include": ["vite.config.*", "eslint.config.*"], // [!code ++]
  "compilerOptions": {
    "composite": true,
    "allowJs": true, // [!code ++]
  },
}
```

:::

## 根目录 — eslint.config.js

```javascript [eslint.config.js]
import { base } from '@breeze/eslint-config'

export default [
  ...base,
  {
    // 显式设置 tsconfigRootDir，避免 monorepo 中多候选目录冲突
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 只 lint 根目录的文件，子项目使用各自的配置
    ignores: ['apps/**', 'packages/**', 'docs/**', '.claude'],
  },
]
```

| 配置项            | 值                    | 含义                                                                                         |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `tsconfigRootDir` | `import.meta.dirname` | 指向仓库根目录，让 Project Service 从此处查找 `tsconfig.json`                                |
| `ignores`         | `apps/**` 等          | 排除所有子项目目录，仅 lint 根目录自身的文件（如 `eslint.config.js`、`stylelint.config.js`） |

::: details 为什么根目录必须设置 tsconfigRootDir？

在 Monorepo 中，如果不设置 `tsconfigRootDir`，Project Service 会检测到多个候选根目录：

```
发现 tsconfig.json 的位置：
├── ./tsconfig.json              ← 候选 1
├── apps/main-app/tsconfig.json  ← 候选 2
├── apps/vue3-app/tsconfig.json  ← 候选 3
└── apps/mock-server/tsconfig.json ← 候选 4
```

Project Service 无法判断该用哪个，会报 **"multiple candidate TSConfigRootDirs"** 错误。

显式设置 `tsconfigRootDir: import.meta.dirname` 后，Project Service 只从指定目录查找，消除了歧义。**每个 `eslint.config.js` 都必须设置此项**。

:::

::: details 为什么不需要 // @ts-check？

共享 ESLint 配置中的 `allowDefaultProject: ['*.js', '*.mjs', '*.cjs']` 会为 JS 配置文件通过 `defaultProject`（默认 `tsconfig.json`）提供类型信息，ESLint 的类型感知规则已可正常工作，因此无需额外添加 `// @ts-check` 注释。

:::

## 应用配置（apps）

### Vue 3 应用

两个 Vue 3 应用使用完全相同的配置结构，仅 `name` 不同：

```javascript [apps/main-app/eslint.config.js]
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { vue3 } from '@breeze/eslint-config'
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

export default defineConfigWithVueTs(...vue3, {
  name: 'main-app/auto-import',
  languageOptions: {
    globals: autoImportGlobals.globals,
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

```javascript [apps/vue3-app/eslint.config.js]
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { vue3 } from '@breeze/eslint-config'
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

export default defineConfigWithVueTs(...vue3, {
  name: 'vue3-app/auto-import',
  languageOptions: {
    globals: autoImportGlobals.globals,
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

| 配置项            | 值                    | 含义                                                 |
| ----------------- | --------------------- | ---------------------------------------------------- |
| `tsconfigRootDir` | `import.meta.dirname` | 指向各自的 `apps/main-app/` 或 `apps/vue3-app/` 目录 |

::: details defineConfigWithVueTs 做了什么？

`defineConfigWithVueTs` 是 `@vue/eslint-config-typescript` 提供的辅助函数，它在传入的配置数组基础上：

1. 确保 `vue-eslint-parser` 被正确设置为 `.vue` 文件的解析器
2. 确保 `@typescript-eslint/parser` 被设置为 `<script>` 块的子解析器
3. 处理 Vue + TypeScript 的解析器嵌套关系

如果不使用此函数，直接展开 `vue3` 配置，`.vue` 文件中的 `<script lang="ts">` 可能无法被正确解析。

:::

::: details .eslintrc-auto-import.json 的内容与作用

`.eslintrc-auto-import.json` 由 `unplugin-auto-import` 在构建时自动生成，内容类似：

```json [.eslintrc-auto-import.json]
{
  "globals": {
    "ref": true,
    "reactive": true,
    "computed": true,
    "watch": true,
    "watchEffect": true,
    "onMounted": true,
    "onUnmounted": true,
    "useRoute": true,
    "useRouter": true,
    "defineStore": true,
    "storeToRefs": true
    // ... 约 90 个全局变量
  }
}
```

这些变量在源码中**无需 `import` 即可使用**（由构建工具自动注入导入语句），但 ESLint 默认不认识它们，会报 `no-undef` 错误。通过将 `globals` 注入到 `languageOptions.globals`，告诉 ESLint "这些变量是合法的全局变量，不要报错"。

> **注意**：此文件由构建工具自动生成并维护，不应手动编辑。

::: details import ... with { type: 'json' } 语法说明

这是 [Import Attributes](https://github.com/tc39/proposal-import-attributes) 提案（Stage 4），用于在 `import` 语句中声明模块类型。Node.js v22+ 和 TypeScript 5.3+ 已原生支持。

```javascript
// 旧语法（Node.js v16–v20）
import data from './data.json' assert { type: 'json' }

// 新语法（Node.js v22+，本项目使用）
import data from './data.json' with { type: 'json' }
```

对于 JSON 文件，声明 `type: 'json'` 告诉运行时将其解析为 JSON 模块（而非可能的 JavaScript 模块），是安全和性能的最佳实践。

:::

---

### mock-server

纯 TypeScript 后端项目（Nitro mock 服务器），不需要 Vue 规则：

```javascript [apps/mock-server/eslint.config.js]
import { base } from '@breeze/eslint-config'

export default [
  ...base,
  {
    name: 'mock-server/tsconfig',
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
```

## FAQ

::: details 如何添加项目特定的自定义规则？

可以。核心是顺序：**预设 → 项目自定义规则 → Prettier 兜底**。

> [!TIP] 会不会和 Prettier 冲突？
>
> - 如果你只加业务规则（如 `no-console`、`@typescript-eslint/no-explicit-any`），通常不会冲突
> - 如果你在子项目追加了格式类规则（如 `semi`、`quotes`、`vue/max-attributes-per-line`），可能重新引入与 Prettier 的冲突
> - 最稳妥做法是在子项目配置末尾再追加一次 `...prettier`

**Vue 子应用（推荐模板）**：

```javascript [apps/main-app/eslint.config.js]
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { prettier, vue3 } from '@breeze/eslint-config'
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

const preset = defineConfigWithVueTs(...vue3, {
  name: 'main-app/auto-import',
  languageOptions: {
    globals: autoImportGlobals.globals,
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})

export default [
  ...preset,
  {
    name: 'main-app/custom-rules',
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  ...prettier, // 放最后，避免后续自定义规则引入格式冲突
]
```

**非 Vue 项目（base）**：

```javascript [eslint.config.js]
import { base, prettier } from '@breeze/eslint-config'

export default [
  ...base,
  {
    name: 'my-project/custom-rules',
    rules: {
      'no-console': 'warn',
    },
  },
  ...prettier, // 同样建议放最后兜底
]
```

说明：`base` 本身已包含 `...prettier`，这里再次追加是为了“防止后续新增的项目规则”重新引入格式冲突，属于防御式写法。

:::

::: details 只想检查 eslint.config.js 的格式，是否需要 allowDefaultProject？

**不需要。**

`eslint.config.js` 的格式检查主要来自 `prettier/prettier` 规则（通过 `eslint-plugin-prettier` 集成），与 `allowDefaultProject` 无关。

- `allowDefaultProject`：解决“类型感知规则的类型信息来源”
- `prettier/prettier`：解决“代码格式是否符合 Prettier”

常用命令：

```bash [pnpm]
# 根目录配置文件
pnpm eslint eslint.config.js --max-warnings=0

# 子项目配置文件（示例）
pnpm --filter main-app exec eslint eslint.config.js --max-warnings=0
```

> [!TIP] 为什么根目录执行 `pnpm -w run lint` 看不到子项目的 `eslint.config.js`？
> 根目录配置里通过 `ignores: ['apps/**', 'packages/**']` 排除了子项目；检查子项目配置文件需要在子项目目录执行，或使用 `pnpm --filter <project> exec eslint ...`。

:::

::: details ESLint 缓存失效了怎么办？

当遇到"明明改了配置但 lint 结果没变"等问题时，清除缓存文件即可：

```bash [shell ~vscode-icons:file-type-shell~]
# 清理全仓 lint/format 缓存（含子项目）
find . -type f \( -name '.eslintcache' -o -name '.stylelintcache' -o -name '.prettiercache' \) \
  -not -path '*/node_modules/*' -delete

# 可选：同时清理 TypeScript 增量缓存
find . -type f -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete

# 重新运行 lint
pnpm -w run lint:all
```

以下情况缓存会自动失效：

- 文件内容发生变化
- ESLint 配置文件变化

以下情况可能需要手动清除缓存：

- 升级了 ESLint 插件版本
- 修改了 `tsconfig.json`（影响类型感知规则的结果）
- 切换 Git 分支后出现异常

:::

## NPM Scripts

根目录 `package.json` 中提供了以下 ESLint 相关脚本：

```json [package.json]
{
  "scripts": {
    "lint": "eslint . --max-warnings=0 --cache",
    "lint:fix": "eslint . --fix --cache",
    "lint:all": "pnpm -r --parallel run lint",
    "lint:all:fix": "pnpm -r --parallel run lint:fix"
  }
}
```

- `--cache`：启用缓存（缓存文件 `.eslintcache` 生成在运行命令的目录下），仅检查变更的文件，显著提升大型 monorepo 的执行速度
- `--max-warnings=0`：任何 warning 都会导致 lint 失败，强制团队解决所有警告

| 命令                | 说明                                                         |
| ------------------- | ------------------------------------------------------------ |
| `pnpm lint`         | 在根目录运行 ESLint 检查（仅检查根目录自身的文件）           |
| `pnpm lint:fix`     | 同上，但自动修复可修复的问题                                 |
| `pnpm lint:all`     | 递归执行所有子包（`apps/*`、`packages/*`）各自的 `lint` 脚本 |
| `pnpm lint:all:fix` | 递归执行所有子包各自的 `lint:fix` 脚本                       |

> [!TIP] `lint` vs `lint:all`
>
> - `lint` / `lint:fix` 只使用根目录的 `eslint.config.js`，仅覆盖根目录文件
> - `lint:all` / `lint:all:fix` 会触发每个子包各自的 `eslint.config.js`，实现全仓检查

## 相关依赖

### `packages/eslint-config`（共享配置包）

```bash
pnpm add -D @eslint/js @vue/eslint-config-typescript eslint-config-prettier \
  eslint-plugin-prettier eslint-plugin-vue typescript-eslint \
  --filter @breeze/eslint-config
```

| 依赖包                          | 版本    | 说明                                                     |
| ------------------------------- | ------- | -------------------------------------------------------- |
| `@eslint/js`                    | ^9.39.2 | ESLint 官方 JS 推荐规则集                                |
| `@vue/eslint-config-typescript` | ^14.6.0 | Vue + TypeScript 的 ESLint 预设，整合解析器与规则        |
| `eslint-config-prettier`        | ^10.1.8 | 关闭所有与 Prettier 冲突的 ESLint 规则                   |
| `eslint-plugin-prettier`        | ^5.5.4  | 将 Prettier 作为 ESLint 规则运行，格式问题报为 lint 错误 |
| `eslint-plugin-vue`             | ^10.5.1 | Vue SFC 的 ESLint 规则集                                 |
| `typescript-eslint`             | ^8.49.0 | TypeScript ESLint 解析器与规则集                         |

### 根目录

```bash
pnpm add -wD eslint prettier @breeze/eslint-config lint-staged
```

| 依赖包                  | 版本         | 说明                               |
| ----------------------- | ------------ | ---------------------------------- |
| `eslint`                | ^9.39.2      | ESLint 核心                        |
| `prettier`              | ^3.7.4       | 代码格式化工具                     |
| `@breeze/eslint-config` | workspace:\* | 本仓库的共享 ESLint 配置包         |
| `lint-staged`           | ^16.2.7      | Git 提交前对暂存文件运行 lint 检查 |

### Vue 应用（`apps/main-app`、`apps/vue3-app`）

```bash
pnpm add -D @breeze/eslint-config @vue/eslint-config-typescript \
  --filter @breeze/main-app --filter @breeze/vue3-app
```

| 依赖包                          | 版本         | 说明                                                               |
| ------------------------------- | ------------ | ------------------------------------------------------------------ |
| `@breeze/eslint-config`         | workspace:\* | 共享 ESLint 配置包                                                 |
| `@vue/eslint-config-typescript` | ^14.6.0      | Vue + TypeScript 预设，各 Vue 应用的 `eslint.config.js` 中直接使用 |

### 非 Vue 应用（`apps/mock-server`）

```bash
pnpm add -D @breeze/eslint-config --filter @breeze/mock-server
```

| 依赖包                  | 版本         | 说明                                       |
| ----------------------- | ------------ | ------------------------------------------ |
| `@breeze/eslint-config` | workspace:\* | 共享 ESLint 配置包，使用其中的 `base` 预设 |

## 相关链接

- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [typescript-eslint Project Service](https://typescript-eslint.io/blog/project-service/)
- [typescript-eslint 规则列表](https://typescript-eslint.nodejs.cn/rules/)
- [eslint-plugin-vue 规则列表](https://eslint.vuejs.org/rules/)
- [Prettier 与 ESLint 集成](https://prettier.io/docs/en/integrating-with-linters.html)

<script setup>
import configOrderXml from './drawio/eslint-config-order.drawio?raw'
import typeAwareWorkflow from './drawio/eslint-type-aware-workflow.drawio?raw'
</script>
