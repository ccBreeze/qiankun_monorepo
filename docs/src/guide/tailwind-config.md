---
outline: [2, 4]
---

# Tailwind CSS 项目配置

本文档说明项目中 Tailwind CSS v4 的集成方式，涵盖依赖安装、构建集成、CSS 入口、Lint 配置和编辑器支持。

## 整体结构

```
qiankun_monorepo/
├── pnpm-workspace.yaml              ← catalog 统一管理 Tailwind 相关依赖版本
│
├── apps/
│   ├── main-app/
│   │   ├── postcss.config.js        ← PostCSS 插件配置
│   │   └── src/assets/scss/
│   │       └── index.scss           ← CSS 入口，@use 'tailwindcss'
│   │
│   └── vue3-app/
│       ├── postcss.config.js        ← PostCSS 插件配置
│       └── src/assets/scss/
│           └── index.scss           ← CSS 入口，@use 'tailwindcss'
│
├── stylelint.config.js              ← Tailwind 指令白名单
└── .vscode/settings.json            ← 文件嵌套关联 tailwind.config.*
```

## 依赖与版本

所有 Tailwind 相关依赖通过 `pnpm-workspace.yaml` 的 `catalog:` 统一管理版本：

| 包名                   | 版本    | 说明                              |
| ---------------------- | ------- | --------------------------------- |
| `tailwindcss`          | ^4.1.18 | Tailwind CSS v4 核心              |
| `@tailwindcss/postcss` | ^4.1.18 | PostCSS 插件，构建时处理 Tailwind |
| `@tailwindcss/vite`    | ^4.1.18 | Vite 插件（已注册但当前未使用）   |
| `autoprefixer`         | -       | 自动添加浏览器前缀                |

在各应用的 `package.json` 中引用 catalog：

```json [apps/*/package.json]
{
  "devDependencies": {
    "@tailwindcss/postcss": "catalog:",
    "autoprefixer": "catalog:",
    "tailwindcss": "catalog:"
  }
}
```

## 构建集成 — PostCSS

两个应用均通过 PostCSS 集成 Tailwind，配置完全一致：

```javascript [apps/*/postcss.config.js]
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

| 插件                   | 职责                                   |
| ---------------------- | -------------------------------------- |
| `@tailwindcss/postcss` | 编译 Tailwind 指令、扫描模板生成工具类 |
| `autoprefixer`         | 为 CSS 属性添加浏览器前缀              |

::: tip 为什么使用 PostCSS 而非 Vite 插件？
`@tailwindcss/vite` 虽已在 catalog 中注册，但项目选择 `@tailwindcss/postcss` 方式集成。PostCSS 方式兼容性更广，与 SCSS 处理管线无缝衔接，且两个应用的构建流程一致。
:::

::: tip Tailwind v4 零配置
Tailwind v4 支持自动内容检测（automatic content detection），无需 `tailwind.config.ts` 配置文件。通过 CSS 入口文件的 `@use 'tailwindcss'` 即可自动启用所有默认 token 和工具类。
:::

## CSS 入口文件

### Tailwind v4 新语法

项目使用 Tailwind v4 的 `@use 'tailwindcss'` 语法引入，取代了 v3 的 `@tailwind base/components/utilities` 三行指令：

```scss [apps/main-app/src/assets/scss/index.scss]
@use 'tailwindcss';
@import 'ant-design-vue/dist/reset.css' layer(reset);
```

```scss [apps/vue3-app/src/assets/scss/index.scss]
@use 'tailwindcss';
@use './scrollbar';
```

::: tip @use vs @tailwind
Tailwind v4 推荐使用 `@use 'tailwindcss'` 一行替代 v3 的三行指令。两者效果等价，但 `@use` 更符合现代 SCSS 模块化规范。旧写法 `@tailwind base/components/utilities` 仍然兼容。
:::

## 在 Vue 组件中使用

### 模板中使用工具类

直接在模板中使用 Tailwind 工具类：

```vue
<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="rounded-2xl px-4 py-3 shadow-lg">
      <h1 class="text-xl font-semibold text-slate-800">标题</h1>
    </div>
  </div>
</template>
```

### `<style>` 中使用 @apply

在 Vue SFC 的 `<style>` 块中使用 `@apply` 时，需要先通过 `@reference` 引入 Tailwind 的 token 定义：

```vue
<style scoped lang="scss">
@use 'sass:color';
@reference "tailwindcss";

.login-form {
  @apply flex flex-col gap-4 rounded-xl px-8 py-6;
}

.login-form__title {
  @apply text-2xl font-semibold text-slate-800;
}
</style>
```

| 指令         | 说明                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| `@reference` | Tailwind v4 新增，引入 token 定义但**不注入任何样式**，专为 `<style>` 块设计 |
| `@apply`     | 将 Tailwind 工具类展开为标准 CSS 属性                                        |

::: warning @reference 是必须的
在 Vue SFC 的 `<style scoped>` 中使用 `@apply`，必须先声明 `@reference "tailwindcss"`。否则 `@apply` 无法识别工具类，构建时会报错。全局 CSS 入口文件（如 `index.scss`）不需要 `@reference`，因为已经通过 `@use 'tailwindcss'` 引入了完整样式。
:::

::: warning @use 必须在 @reference 之前
SCSS 规范要求 `@use` 必须出现在文件的所有其他规则之前。如果同时使用 `@use` 和 `@reference`，顺序必须是：

```scss
@use 'sass:color'; // ① @use 必须最前
@reference "tailwindcss"; // ② @reference 在 @use 之后
```

反过来写会导致 SCSS 编译报错：`@use rules must be written before any other rules`。
:::

## Lint 配置

### Stylelint — Tailwind 指令白名单

Stylelint 的 SCSS 规则会将不认识的 `@` 规则标记为错误。在 `stylelint.config.js` 中配置白名单：

```javascript [stylelint.config.js]
'scss/at-rule-no-unknown': [
  true,
  {
    ignoreAtRules: [
      'theme',           // @theme { --color-*: ... }（定义设计令牌）
      'source',          // @source "./src/**/*.vue"（指定内容扫描路径）
      'utility',         // @utility container { ... }（自定义工具类）
      'variant',         // @variant hover { &:hover }（应用变体）
      'custom-variant',  // @custom-variant pointer-coarse { ... }（自定义变体）
      'apply',           // @apply flex items-center（内联工具类）
      'reference',       // @reference "tailwindcss"（引入 token，不注入样式）
    ],
  },
],
```

同时关闭了 `no-invalid-position-at-import-rule` 规则，因为 `@reference` 后跟 `@use` 会被误报为 import 位置错误：

```javascript [stylelint.config.js]
// SCSS @use/@forward 和 Tailwind @reference 会触发误报
'no-invalid-position-at-import-rule': null,
```

### ESLint

当前未配置 Tailwind 相关的 ESLint 插件（如 `eslint-plugin-tailwindcss`）。

## 编辑器支持

### VS Code 文件嵌套

在 `.vscode/settings.json` 中，`tailwind.config.*` 被关联到 `vite.config.*` 下：

```json [.vscode/settings.json]
{
  "explorer.fileNesting.patterns": {
    "vite.config.*": "vitest.config.*, postcss.config.*, tailwind.config.*, index.html"
  }
}
```

### 推荐安装的 VS Code 扩展

- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) — 提供工具类自动补全、悬停预览、lint 检查
