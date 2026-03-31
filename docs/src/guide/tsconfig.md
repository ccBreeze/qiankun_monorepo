# tsconfig

本文档以**文件维度**逐一说明项目中每个 tsconfig 文件的完整配置内容及各字段含义。

## 整体结构

```
qiankun_monorepo/
├── tsconfig.base.json          ← 全局基础选项（所有项目共享）
├── tsconfig.lib.json           ← 库构建配置（需要产出声明文件的包继承）
├── tsconfig.node.base.json     ← Node.js 环境配置（构建脚本 / 配置文件继承）
├── tsconfig.json               ← 根入口（仅用于编辑器兼容）
│
├── apps/
│   ├── main-app/
│   │   ├── tsconfig.json       ← project references 入口
│   │   ├── tsconfig.app.json   ← 应用源码
│   │   └── tsconfig.node.json  ← Vite 配置等 Node 脚本
│   ├── vue3-history/
│   │   ├── tsconfig.json
│   │   ├── tsconfig.app.json
│   │   └── tsconfig.node.json
│   └── mock-server/
│       └── tsconfig.json
│
├── packages/
│   ├── eslint-config/
│   │   └── tsconfig.json       ← 不编译，仅类型检查
│   ├── utils/
│   │   └── tsconfig.json
│   └── router/
│       └── tsconfig.json
│
└── docs/
    └── tsconfig.json           ← VitePress 文档项目
```

## 为什么每个子项目都需要独立的 tsconfig.json

核心结论：Monorepo 应该是**根配置做共性，子项目 tsconfig 做边界**，不要全仓共用一个 tsconfig。

1. **运行环境不同**：浏览器、Node、服务端需要的类型不同（`DOM` / `node` / `nitropack`），必须隔离。
2. **`include` 范围不同**：每个项目只检查自己的源码，避免全仓扫描导致变慢和误报。
3. **编译选项不同**：`paths`、`types`、`declaration`、`noEmit` 等配置在不同项目里天然不一致。
4. **ESLint typed linting 依赖边界**：`typescript-eslint` 需要准确命中当前项目 tsconfig，独立配置更稳定。

推荐模式：`tsconfig.base.json` 统一基础规则；各子项目通过 `extends` 继承并只补充本项目差异。

## 核心概念：`target` vs `module` vs `lib`

这三个选项经常一起出现，但职责完全不同：

| 选项     | 控制什么                                            | 影响编译输出 | 影响类型检查 |
| -------- | --------------------------------------------------- | ------------ | ------------ |
| `target` | **语法降级** — 输出的 JS 使用哪个版本的语法         | ✅ 是        | ❌ 否        |
| `module` | **模块格式** — 输出的 JS 使用哪种模块系统           | ✅ 是        | ❌ 否        |
| `lib`    | **可用 API 类型** — 类型检查时承认哪些全局 API 存在 | ❌ 否        | ✅ 是        |

### target — 语法降级目标

决定 TypeScript 编译输出使用哪个版本的 **语法特性**。

```typescript
// 源码
const fn = async () => await fetch('/api')

// target: "ES5"  → 降级为 generator + __awaiter helper
// target: "ES2017" → 保留 async/await（ES2017 原生支持）
// target: "ESNext" → 完全不降级，保留所有最新语法
```

本项目设为 `ESNext`，因为 Vite/esbuild 负责实际转译，TypeScript 只做类型检查，不需要降级语法。

### module — 模块系统格式

决定编译输出使用哪种 **模块导入/导出** 语法。

```typescript
// 源码
import { ref } from 'vue'
export const count = ref(0)

// module: "CommonJS" → const { ref } = require('vue'); exports.count = ...
// module: "ESNext"   → 保留 import/export 原样输出
```

### lib — 可用 API 的类型声明

决定类型检查时 TypeScript **认识哪些全局 API**。它不影响编译输出，只影响类型系统能否找到对应的类型定义。

```typescript
// lib: ["ES2020"]
;[1, 2, 3].at(-1) // ❌ 类型错误：Property 'at' does not exist（ES2022 才有）
Object.hasOwn(obj, 'k') // ❌ 类型错误（ES2022 才有）
structuredClone(data) // ❌ 类型错误（ESNext 才有）
  [
    // lib: ["ES2022"]
    (1, 2, 3)
  ].at(-1) // ✅ 通过
Object.hasOwn(obj, 'k') // ✅ 通过
structuredClone(data) // ❌ 仍然报错（需要 ESNext）
```

各 `lib` 值包含的代表性 API：

| lib 值         | 新增的代表性 API                                                      |
| -------------- | --------------------------------------------------------------------- |
| `ES2020`       | `Promise.allSettled()`、`globalThis`、`BigInt`                        |
| `ES2022`       | `Array.prototype.at()`、`Object.hasOwn()`、`Error.cause`              |
| `ESNext`       | `Promise.withResolvers()`、`structuredClone()` 等提案阶段 API         |
| `DOM`          | `document`、`window`、`HTMLElement` 等浏览器 API                      |
| `DOM.Iterable` | `NodeList.forEach()`、`for...of HTMLCollection` 等 DOM 集合可迭代支持 |

::: tip 为什么 lib 使用固定版本号而非 ESNext？
`ESNext` 内容随 TypeScript 版本升级而变化。使用固定版本号（如 `ES2020`）可以：

1. **明确运行时兼容性**：声明"代码假设宿主环境至少支持 ES2020 的 API"
2. **充当护栏**：如果不小心用了超出范围的 API，TypeScript 会立刻报错，避免运行时崩溃
3. **跨 TS 版本行为一致**：不管团队成员用 TS 5.0 还是 5.5，类型检查结果都一样

本项目的 `lib: ["ES2020"]` 对齐了 [Vite 的默认构建目标](https://vite.dev/config/build-options.html#build-target)，这也是 [`@vue/tsconfig`](https://github.com/vuejs/tsconfig) 的官方选择。
:::

## 根目录 — 基础配置层

### tsconfig.base.json

全局共享的基础编译选项，所有浏览器端项目最终都继承自此文件。

```jsonc [tsconfig.base.json]
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    // 表示当前代码会被其他打包器（比如 Webpack、Vite、esbuild、Parcel、rollup、swc）处理，从而放宽加载规则
    "moduleResolution": "bundler",

    // 允许 import 命令导入 JSON 文件
    "resolveJsonModule": true,

    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,

    // 严格检查
    "strict": true,
    // 跳过 .d.ts 声明文件的类型检查
    "skipLibCheck": true,

    "noEmit": true,
  },
}
```

| 配置项                         | 值     | 含义                                                                                                                         |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `allowSyntheticDefaultImports` | `true` | 允许对没有默认导出的模块使用 `import x from 'module'` 语法，避免写繁琐的 `import * as x`                                     |
| `isolatedModules`              | `true` | 要求每个文件可被独立转译。Vite 使用 esbuild 逐文件转译，无法跨文件做类型分析，此选项禁止 `const enum` 等需要跨文件信息的写法 |
| `noEmit`                       | `true` | 不输出编译产物，所有子配置默认只做类型检查。需要输出的配置（如 `tsconfig.lib.json`）显式覆盖为 `false`                       |

::: details skipLibCheck: true 的作用范围与开启理由

**作用范围**：跳过所有 `.d.ts` 文件的类型检查，包括 `node_modules` 中第三方库的声明文件和项目内手写的 `.d.ts` 文件。`.ts` 源码文件不受影响，照常检查。

**为什么几乎所有项目都开启它：**

1. **速度**：大型项目 `node_modules` 里可能有上千个 `.d.ts` 文件，跳过它们能显著加快类型检查
2. **避免第三方库之间的类型冲突**：例如库 A 和库 B 的 `.d.ts` 对同一全局类型有不同定义，关闭 `skipLibCheck` 时会报错，但这不是你的代码问题
3. **版本兼容容忍**：某些库的 `.d.ts` 可能是用更高/更低版本的 TS 生成的，严格检查会报兼容性错误

**代价**：项目内手写的 `.d.ts` 文件（如 `src/types/custom.d.ts`）中的类型错误也不会被检查到。但在实践中影响很小，因为 `.d.ts` 中的类型会在被 `.ts` 文件引用时间接验证。

:::

::: details strict: true 等价于同时开启以下选项

| 子选项                         | 作用                                         |
| ------------------------------ | -------------------------------------------- |
| `strictNullChecks`             | `null` 和 `undefined` 不再可以赋值给其他类型 |
| `strictFunctionTypes`          | 函数参数类型检查更严格（逆变）               |
| `strictBindCallApply`          | 严格检查 `bind`、`call`、`apply` 的参数类型  |
| `strictPropertyInitialization` | 类属性必须在构造函数中初始化或声明为可选     |
| `noImplicitAny`                | 禁止隐式 `any` 类型，必须显式标注            |
| `noImplicitThis`               | 禁止 `this` 表达式隐式具有 `any` 类型        |
| `alwaysStrict`                 | 在每个源文件顶部添加 `"use strict"`          |
| `useUnknownInCatchVariables`   | `catch` 子句变量类型为 `unknown` 而非 `any`  |

:::

---

### tsconfig.lib.json

为将来需要发布到 npm 的库包准备的构建配置，继承 `tsconfig.base.json` 后追加声明文件输出和增量构建能力。当前 `packages/*` 均为源码直接消费的内部依赖，尚未使用此配置。

```jsonc [tsconfig.lib.json]
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    // 覆盖 base 的 noEmit: true，允许输出声明文件
    "noEmit": false,
    "composite": true,
    // 增量构建
    "incremental": true,

    // 声明文件输出
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,

    // 一旦编译报错，就不生成编译产物
    // 确保发布的声明文件不含错误
    "noEmitOnError": true,
  },
}
```

::: details composite 与 incremental 的协作机制

**`composite: true` — 项目引用模式**

开启后 TypeScript 将该项目视为一个"可被其他项目引用"的子项目，是 monorepo 中实现跨包类型引用的基础：

- 强制要求配置 `declaration: true`（生成 `.d.ts` 声明文件）
- 隐含了 `incremental: true` 生成 `.tsbuildinfo` 文件用于增量构建
- 强制要求所有文件都能被 `include`/`files` 匹配到，防止"幽灵文件"被意外遗漏：

  ```
  packages/utils/
  ├── src/
  │   ├── index.ts      ✅ 被 include 匹配
  │   └── helpers.ts    ✅ 被 include 匹配
  └── forgotten.ts      ❌ 编译报错：不在 include 范围内
  ```

- 允许其他 `tsconfig.json` 通过 `references` 字段引用此项目，实现按依赖顺序编译。例如 `main-app` 的入口 tsconfig 通过 `references` 组织子项目：

  ```jsonc [apps/main-app/tsconfig.json]
  {
    "files": [],
    "references": [
      { "path": "./tsconfig.app.json" }, // 浏览器端源码
      { "path": "./tsconfig.node.json" }, // Node 端构建脚本
    ],
  }
  ```

  配合 `tsc --build` 时，TypeScript 会自动按依赖拓扑排序编译各子项目，未改动的子项目直接跳过。

  > 本项目中 `apps/*` 消费 `packages/*` 是通过 **pnpm workspace + `moduleResolution: "bundler"`** 解析类型的，而非 `references`。`references` 主要用于同一应用内拆分不同运行环境（浏览器 vs Node.js）的类型检查配置。

**`incremental: true` — 增量编译**

> 只有改动的包会重新编译，提升 CI/本地构建效率

TypeScript 会在首次编译后生成 `.tsbuildinfo` 缓存文件，记录每个文件的签名和依赖关系。后续编译时只重新检查发生变化的文件及其依赖链，大幅加快重复构建速度。

:::

::: details declaration、declarationMap 与 emitDeclarationOnly 的分工

这三个选项共同实现了「TypeScript 管类型，Vite 管构建」的职责分离：

```
.ts 源码  ──tsc──▶  .d.ts（类型声明）+ .d.ts.map（源码映射）
                    ❌ 不生成 .js（交给 Vite/esbuild 处理）
```

- **`declaration`**：为每个 `.ts` 文件输出对应的 `.d.ts`，只包含类型信息（接口、类型别名、函数签名等），不包含实现代码。其他包引用时能获得类型提示和类型检查，而不需要直接读取源码。
- **`declarationMap`**：为 `.d.ts` 生成 `.d.ts.map` 源码映射。在 IDE 中对引用的包执行「Go to Definition」时，能直接跳转到 `.ts` 源码，而不是跳到 `.d.ts` 声明文件，提升 monorepo 内跨包开发体验。
- **`emitDeclarationOnly`**：只输出声明文件，不生成 `.js` 编译产物。因为实际的 JS 构建由 Vite（esbuild/rollup）负责，TypeScript 只承担类型检查和声明生成的职责，避免重复编译。

:::

---

### tsconfig.node.base.json

Node.js 环境的基础配置（用于 Vite 配置文件、构建脚本等），继承社区推荐的 `@tsconfig/node24`。

```jsonc [tsconfig.node.base.json]
{
  "extends": "@tsconfig/node24/tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "types": ["node"],
  },
}
```

| 配置项  | 值         | 含义                                                                                                                 |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `types` | `["node"]` | 只引入 Node.js 类型声明，限制全局类型作用域。默认情况下 TypeScript 会自动包含所有 `@types/*`，显式指定可避免类型污染 |

::: tip 为什么不开启 allowJs？

- 开启 `allowJs` 后，继承此配置的 `tsconfig.node.json` 会将 `eslint.config.js` 等 `.js` 文件纳入 TypeScript 项目范围。这会与共享 ESLint 配置中的 `allowDefaultProject` 冲突——同一个文件不能同时被 project service 和 `allowDefaultProject` 匹配，否则 ESLint 会报错。

- 本项目统一由 `allowDefaultProject` 处理 JS 配置文件的类型解析，`tsconfig.node.json` 仅负责 `.ts` 构建配置（如 `vite.config.ts`）。
  :::

::: details 为什么要覆盖 module 和 moduleResolution？

`@tsconfig/node24` 的默认值是 `module: "nodenext"` + `moduleResolution: "node16"`，这对应 Node.js 原生 ESM 规范，要求非常严格：

- 导入路径必须带 `.js` 扩展名（即使源码是 `.ts`）
- `package.json` 需要声明 `"type": "module"`
- 不支持 `paths` 别名等 bundler 特性

而本项目中这些 Node 端文件（`vite.config.ts` 等）实际由 **Vite/bundler** 处理，不走 Node.js 原生模块解析，所以需要覆盖为 `ESNext` + `Bundler` 来放宽限制。

| 来源               | `module`   | `moduleResolution` | 适用场景             |
| ------------------ | ---------- | ------------------ | -------------------- |
| `@tsconfig/node24` | `nodenext` | `node16`           | Node.js 原生运行     |
| 本项目覆盖         | `ESNext`   | `bundler`          | 由 Vite/bundler 处理 |

:::

::: details types 如何限制全局类型作用域？

默认情况下，TypeScript 会自动加载 `node_modules/@types/` 下**所有**包的类型声明到全局作用域：

```
node_modules/@types/
├── node/          # Node.js API 类型
├── lodash/        # lodash 类型
└── jest/          # Jest 测试框架类型
```

**不配置 `types`** — 三个包的类型全部自动加载，构建脚本中可以直接使用不相关的全局 API：

```typescript [vite.config.ts]
import _ from 'lodash' // ✅ 不报错 — 但构建脚本不应该依赖 lodash
_.merge(a, b) // ✅ 不报错 — 类型污染
```

**配置 `types: ["node"]`** — 只加载 `@types/node`，其他全部排除：

```typescript [vite.config.ts]
import path from 'node:path' // ✅ 正常 — node 类型已加载
process.env.NODE_ENV // ✅ 正常 — 属于 node 类型
describe('test', () => {}) // ❌ 类型错误 — jest 类型未加载
```

这样能确保 Node 端配置文件的类型作用域是干净的，不会意外引入不相关的全局类型。

:::

---

### tsconfig.json

仓库根目录的入口文件，继承 `tsconfig.node.base.json` 以提供 Node.js 环境类型（根目录的配置文件运行在 Node.js 环境）。`.js` 配置文件的类型解析由 ESLint 共享配置中的 `allowDefaultProject` 负责。

```jsonc [tsconfig.json]
{
  "extends": "./tsconfig.node.base.json",
}
```

## 应用配置（apps）

### Vue3 应用

#### tsconfig.json

应用入口文件，不直接包含源文件，通过 `references` 将类型检查委托给子项目。

```jsonc [apps/main-app/tsconfig.json]
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
  ],
}
```

| 配置项       | 值      | 含义                                                                                                                 |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `files`      | `[]`    | 空数组 — 入口文件本身不直接包含任何源文件，所有文件由配置文件管理                                                    |
| `references` | `[...]` | 声明两个配置文件：`tsconfig.app.json`（应用源码）和 `tsconfig.node.json`（构建脚本），各自有独立的编译选项和文件范围 |

::: tip 为什么拆分为两个配置文件？

- `tsconfig.app.json`（浏览器环境，需要 DOM 类型）和 `tsconfig.node.json`（Node.js 环境，需要 `node` 类型）的运行环境不同，放在同一个 tsconfig 中会导致类型互相污染。

- 拆分为两个文件，再由 `tsconfig.json` 通过 `references` 统一管理，是 Vue 官方推荐的组织方式。
  :::

---

#### tsconfig.app.json

应用源码的类型检查配置（浏览器环境）。

```jsonc [apps/main-app/tsconfig.app.json]
{
  "extends": ["@vue/tsconfig/tsconfig.dom.json", "../../tsconfig.base.json"],
  "include": ["env.d.ts", "src/**/*", "src/**/*.vue"],
  "compilerOptions": {
    "composite": true,
    "paths": {
      "@/*": ["./src/*"],
    },
  },
}
```

| 配置项      | 值                       | 含义                                                                                                        |
| ----------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `composite` | `true`                   | 被 `tsconfig.json` 的 `references` 引用的配置文件必须启用此选项                                             |
| `paths`     | `{ "@/*": ["./src/*"] }` | 路径别名，让 TypeScript 能解析 `@/components/Foo` 等路径。需在 Vite 的 `resolve.alias` 中做对应的运行时配置 |

::: tip extends 数组的继承顺序
后面的配置会覆盖前面的同名选项。

本地配置 `../../tsconfig.base.json` 放在最后，确保项目自身的设置优先级最高。
:::

---

#### tsconfig.node.json

构建配置文件的类型检查（Node.js 环境）。仅覆盖 `.ts` 构建配置，`.js` 配置文件由 ESLint 的 `allowDefaultProject` 处理。

```jsonc [apps/main-app/tsconfig.node.json]
{
  "extends": "../../tsconfig.node.base.json",
  "include": ["vite.config.*"],
  "compilerOptions": {
    "composite": true,
  },
}
```

### mock-server

Nitro mock 服务器的配置，仅用于类型检查，不需要输出声明文件。

```jsonc [apps/mock-server/tsconfig.json]
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["nitropack"],
  },
  "include": ["**/*"],
  // .nitro — Nitro 开发服务器的编译缓存（存放转译后的中间产物）
  // .output — Nitro 生产构建的最终输出（部署产物）
  "exclude": ["node_modules", ".nitro", ".output"],
}
```

## 包配置（packages）

### eslint-config

ESLint 配置包 — 源码直接被消费，不经过编译。

```jsonc [packages/eslint-config/tsconfig.json]
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "allowImportingTsExtensions": true,
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"],
}
```

| 配置项                       | 值     | 含义                                                                          |
| ---------------------------- | ------ | ----------------------------------------------------------------------------- |
| `allowImportingTsExtensions` | `true` | 允许导入路径使用 `.ts` 扩展名（ESM 模式下运行时需要明确的文件扩展名才能解析） |

::: details 为什么需要启用 allowImportingTsExtensions？

此包通过 `package.json` 的 `exports` 直接暴露 `.ts` 源码：

```jsonc [packages/eslint-config/package.json]
"exports": {
  ".": "./src/index.ts"   // 直接指向 .ts 源码
}
```

包声明了 `"type": "module"`，并且被 <span style="color: #e74c3c; font-weight: bold;">Node.js ESM 直接加载</span>（ESLint 运行时执行），而非通过 Vite 等 bundler 消费。Node.js ESM 严格要求导入路径必须是完整的文件路径（包含扩展名），不会自动补全：

```typescript [packages/eslint-config/src/base.ts]
import { ignores } from './ignores.ts' // ✅ Node.js ESM 能解析
import { ignores } from './ignores' // ❌ Node.js ESM 报错：Cannot find module
```

因此源码中必须带 `.ts` 扩展名，而 TypeScript 默认不允许这样写，需要 `allowImportingTsExtensions: true` 放开限制。该选项要求 `noEmit: true`（已由 `tsconfig.base.json` 统一提供），因为 `.js` 产物中不可能出现 `from './ignores.ts'` 这样的路径。

**与 `utils`/`router`/`runtime` 的区别：** 同样是 `packages/` 下的内部包，但消费方式决定了是否需要 `.ts` 扩展名：

| 包                           | 消费方                       | 模块解析方式           |
| ---------------------------- | ---------------------------- | ---------------------- |
| `eslint-config`              | Node.js ESM（ESLint 运行时） | 严格要求完整路径       |
| `utils`、`router`、`runtime` | Vite（bundler）              | bundler 自动补全扩展名 |

:::

### 内部消费（仅类型检查）

monorepo 内部依赖，消费方（Vite 应用）通过 `exports` 直接读取 `.ts` 源码，无需构建产物：

```jsonc [packages/utils/package.json]
"exports": {
  "./constants": "./src/constants/index.ts",
  "./env": "./src/env.ts",
  "./request": "./src/request/index.ts"
}
```

```jsonc [packages/router/package.json]
"exports": {
  ".": "./src/index.ts"
}
```

```jsonc [packages/runtime/package.json]
"exports": {
  ".": "./src/index.ts"
}
```

TypeScript 在这里的唯一职责是**类型检查**，不涉及声明文件输出或编译构建，因此只需继承 `tsconfig.base.json`。

```jsonc [packages/utils/tsconfig.json]
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"],
}
```

```jsonc [packages/router/tsconfig.json]
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"],
}
```

::: details 为什么不继承 tsconfig.lib.json？

- `tsconfig.lib.json` 提供的 `composite`、`declaration`、`emitDeclarationOnly` 等选项都是为**输出声明文件**（将来真正需要发布到 npm 的包）服务的。

- 这些包通过 `exports` 直接暴露 `.ts` 源码，不需要产出 `.d.ts`，因此只需继承 `tsconfig.base.json` 做类型检查即可。
  :::

## docs 文档配置

VitePress 文档站点的配置。

```jsonc [docs/tsconfig.json]
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"],
  },
  "include": ["src/.vitepress/**/*.ts", "src/.vitepress/**/*.vue", "env.d.ts"],
}
```

| 配置项  | 值         | 含义                                                    |
| ------- | ---------- | ------------------------------------------------------- |
| `types` | `["node"]` | VitePress 配置文件（如 `config.ts`）运行在 Node.js 环境 |

## FAQ

::: details `noEmit` 配置策略

TypeScript 只做类型检查，不产出任何文件（`.js`、`.d.ts`、`.map`）。

**需要 `noEmit: true`：**

- Vite / webpack / esbuild 负责构建，tsc 只做类型检查
- [`allowImportingTsExtensions: true`](https://www.typescriptlang.org/tsconfig/#allowImportingTsExtensions)（`.ts` 路径在 `.js` 产物中无法解析，TS 强制要求同时开启 `noEmit`）

**不能设置 `noEmit: true`：**

- `emitDeclarationOnly: true`（需要输出 `.d.ts`）
- tsc 作为构建工具直接产出 `.js` / `.d.ts`

> [!NOTE] `composite` + `noEmit` 的兼容性
> TypeScript 3.8.2 曾引入限制，禁止 `composite: true` 与 `noEmit: true` 同时使用（`TS5053`）。
> 该限制在 [PR #39122](https://github.com/microsoft/TypeScript/pull/39122)（约 **TypeScript 4.0** 时期）中被移除——`noEmit` 时仍会生成 `.tsbuildinfo`，使 composite 项目可以仅做类型检查而不产出其他文件。
>
> 注意：`noEmit: true` 与 `emitDeclarationOnly: true` **始终互斥**——前者禁止一切输出，后者要求输出 `.d.ts` 声明文件，不能同时为 `true`。

:::

::: details `// @ts-check` vs `checkJs`：JS 文件的类型检查策略

本仓库默认策略：**关闭 `checkJs`，按需在单个 JS 文件顶部添加 `// @ts-check`**。

先看结论：

- JS 文件少（主要是配置文件）：优先 `// @ts-check`
- JS 文件多、需要长期类型约束：再考虑 `allowJs + checkJs: true`
- `eslint.config.js` 这类文件的 ESLint 类型感知由 `allowDefaultProject` 兜底，不等于文件进入 `tsc` 项目

| 目标               | 推荐做法                  | 说明                            |
| ------------------ | ------------------------- | ------------------------------- |
| 仅检查个别 JS 文件 | `// @ts-check`            | 精准、低成本                    |
| 全项目 JS 类型检查 | `allowJs + checkJs: true` | 适合 JS 迁移期或大量 JS + JSDoc |
| 临时跳过历史文件   | `// @ts-nocheck`          | 仅建议短期使用                  |

```js [eslint.config.js]
// eslint.config.js
// @ts-check
```

> [!TIP] 与 ESLint、格式检查的关系
>
> - `// @ts-check` / `checkJs` 只影响 TypeScript，不影响 ESLint 是否 lint 该文件
> - `eslint.config.js` 的格式检查主要由 `prettier/prettier` 负责
> - `allowDefaultProject` 只给 ESLint 类型感知规则提供类型信息，不会让该文件自动进入 `tsc` 或 IDE 的完整类型项目

:::

::: details monorepo 内部消费 vs npm 独立发布：tsconfig 该怎么配？

本项目的 `packages/*` 目前都是 monorepo 内部消费，消费方通过 Vite 直接读取 `.ts` 源码。

> [!WARNING] 不建议提前配置
> 提前切换到发布模式会导致开发体验下降：
>
> - 每次改源码都需要先 build，`dist/` 才能更新
> - Vite 的 HMR 热更新会断开（不再直接读源码）
> - IDE 类型提示需要 rebuild 后才能反映最新改动
>
> 等真正需要发布时再迁移即可，改动量很小。

**发布到 npm 时需要改动两处：**

1. **tsconfig.json** — 改为继承 `tsconfig.lib.json`，补上输出目录配置：

   ```jsonc [tsconfig.json]
   {
     "extends": "../../tsconfig.lib.json",
     "compilerOptions": {
       "rootDir": "src", // [!code ++]
       "outDir": "dist", // [!code ++]
     },
     "include": ["src/**/*"],
   }
   ```

   - `rootDir: "src"` — 确保输出结构是 `dist/index.d.ts` 而非 `dist/src/index.d.ts`
   - `outDir: "dist"` — 声明文件输出到 `dist/` 目录
   - 注意：这两个路径相对于**配置文件自身所在目录**解析，因此不能提取到根目录的 `tsconfig.lib.json` 中

2. **package.json** — 入口从源码改为指向构建产物，统一使用 `exports` 条件导出：

   **单入口包**（如 `@breeze/runtime`）：

   ```jsonc [packages/runtime/package.json]
   {
     "exports": {
       ".": "./src/index.ts", // [!code --]
       ".": {
         // [!code ++]
         "types": "./dist/index.d.ts", // [!code ++]
         "import": "./dist/index.js", // [!code ++]
       }, // [!code ++]
     },
     "scripts": {
       "build": "tsc && vite build", // [!code ++]
     },
     "files": ["dist"], // [!code ++]
   }
   ```

   **多入口包**（如 `@breeze/utils`）：

   ```jsonc [packages/utils/package.json]
   {
     "exports": {
       "./env": "./src/env.ts", // [!code --]
       "./env": {
         // [!code ++]
         "types": "./dist/env.d.ts", // [!code ++]
         "import": "./dist/env.js", // [!code ++]
       }, // [!code ++]
     },
     "scripts": {
       "build": "tsc && vite build", // [!code ++]
     },
     "files": ["dist"], // [!code ++]
   }
   ```

   > [!NOTE] `types` 条件必须放在最前面
   > Node.js 和打包工具按**从上到下**的顺序匹配条件，`types` 放在 `import` 之前才能确保 TypeScript 优先命中类型声明文件。

:::

::: details 单入口包的 `package.json` 应该用 `exports` 还是 `main` + `types`？

```jsonc [packages/eslint-config/package.json]
{
  // 只声明 `exports` 即可
  // 不需要 `main` + `types`
  "exports": {
    ".": "./src/index.ts", // ✅ 单入口内部包，这一行就够了
  },
}
```

**原因：**

1. **`exports` 优先级最高** — Node.js 12.11+ 和所有现代打包工具（Vite、esbuild、Webpack 5）解析时 `exports` 优先于 `main`/`types`
2. **不需要向后兼容**

**什么时候需要额外加 `main` + `types`？**

当需要兼容旧版工具链（Node < 12.11）时，加上 `main`/`types` 作为 `exports` 的降级 fallback：

```jsonc [package.json]
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
    },
  },
}
```

:::

## 相关依赖

```bash
# 根目录（全局共享）
pnpm add -wD typescript @types/node @tsconfig/node24 ts-node

# Vue 应用（apps/main-app、apps/vue3-app）
pnpm add -D @vue/tsconfig vue-tsc --filter @breeze/main-app --filter @breeze/vue3-app
```

| 依赖包             | 版本    | 安装位置 | 说明                                                              |
| ------------------ | ------- | -------- | ----------------------------------------------------------------- |
| `typescript`       | ~5.9.0  | 根目录   | TypeScript 编译器                                                 |
| `@types/node`      | ^25.0.1 | 根目录   | Node.js 类型声明                                                  |
| `@tsconfig/node24` | ^24.0.3 | 根目录   | Node.js 24 官方 tsconfig 预设，`tsconfig.node.base.json` 继承使用 |
| `ts-node`          | ^10.9.2 | 根目录   | 在 Node.js 中直接运行 TypeScript 文件，用于脚本和配置文件         |
| `@vue/tsconfig`    | ^0.8.1  | Vue 应用 | Vue 官方 tsconfig 预设，提供 Vue SFC 所需的编译选项               |
| `vue-tsc`          | ^3.1.5  | Vue 应用 | Vue 项目的类型检查工具，替代 `tsc` 以支持 `.vue` 文件             |

## NPM Scripts

根目录 `package.json` 提供了全仓类型检查脚本：

```json [package.json]
{
  "scripts": {
    "type-check:all": "pnpm -r --parallel --if-present run type-check"
  }
}
```

各子包的 `type-check` 脚本根据项目类型使用不同的工具：

```json [apps/main-app/package.json · apps/vue3-history/package.json]
{
  "scripts": {
    // Vue 应用，需要 vue-tsc 处理 .vue 文件
    "type-check": "vue-tsc --build"
  }
}
```

```json [apps/mock-server · packages/eslint-config · packages/utils · packages/router · packages/runtime]
{
  "scripts": {
    // 纯 TypeScript 项目，直接使用 tsc
    "type-check": "tsc"
  }
}
```

> [!TIP] `vue-tsc` vs `tsc`
>
> - 包含 `.vue` 文件的项目必须使用 `vue-tsc`，它能解析 SFC 中的 `<script>` 块进行类型检查
> - 纯 TypeScript 项目直接使用 `tsc` 即可

## 相关链接

- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript 教程 - tsconfig.json](https://wangdoc.com/typescript/tsconfig.json) — 阮一峰 TypeScript 教程
- [vuejs/tsconfig](https://github.com/vuejs/tsconfig)
