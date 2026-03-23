# Stylelint 项目配置

本文档说明项目中 Stylelint 的配置内容及各字段含义。

## 整体结构

```
qiankun_monorepo/
├── stylelint.config.js       ← 全局唯一配置（所有子项目共享）
├── .stylelintignore           ← 忽略文件列表
├── .lintstagedrc.yaml         ← 提交前自动检查配置
│
├── apps/
│   ├── main-app/              ← 共享根配置，无需独立配置
│   └── vue3-app/              ← 同上
│
└── pnpm-workspace.yaml        ← catalog 统一管理依赖版本
```

## 为什么只需要根目录一份配置

与 ESLint 不同，Stylelint **不需要**每个子项目独立配置，原因：

1. **无类型感知需求**：Stylelint 不依赖 `tsconfig.json`，不存在"类型边界"问题
2. **规则全局统一**：所有子项目的 CSS/SCSS 规范一致，无需按项目区分
3. **Stylelint 支持向上查找**：子目录中的文件会自动查找父目录的配置文件，与 ESLint Flat Config 的行为不同

## 依赖与版本

所有 Stylelint 相关依赖通过 `pnpm-workspace.yaml` 的 `catalog:` 统一管理版本：

| 包名                               | 版本     | 说明                              |
| ---------------------------------- | -------- | --------------------------------- |
| `stylelint`                        | ^16.26.1 | Stylelint 核心                    |
| `stylelint-config-standard`        | ^39.0.1  | 标准 CSS 规则集                   |
| `stylelint-config-standard-scss`   | ^16.0.0  | 标准 SCSS 规则集（扩展 standard） |
| `stylelint-config-recommended-vue` | ^1.6.1   | Vue SFC 支持                      |
| `stylelint-order`                  | ^7.0.0   | CSS 属性排序插件                  |
| `stylelint-selector-bem-pattern`   | ^4.0.1   | BEM 命名规范验证插件              |
| `postcss-html`                     | ^1.8.0   | 解析 Vue/HTML 中的 `<style>` 块   |
| `postcss-scss`                     | ^4.0.9   | 解析 SCSS 语法                    |

在根 `package.json` 中声明依赖时引用 catalog：

```json [package.json]
{
  "devDependencies": {
    "stylelint": "catalog:",
    "stylelint-config-recommended-vue": "catalog:",
    "stylelint-config-standard": "catalog:",
    "stylelint-config-standard-scss": "catalog:",
    "stylelint-order": "catalog:",
    "stylelint-selector-bem-pattern": "^4.0.1"
  }
}
```

## stylelint.config.js — 完整配置解析

### extends — 继承的规则集

```javascript [stylelint.config.js]
export default {
  extends: [
    'stylelint-config-standard', // ① 标准 CSS 规则
    'stylelint-config-standard-scss', // ② 标准 SCSS 规则（扩展 ①）
    'stylelint-config-recommended-vue/scss', // ③ Vue SFC + SCSS 支持
  ],
}
```

三层继承关系：

| 顺序 | 配置集                                  | 职责                                                                                   |
| ---- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| ①    | `stylelint-config-standard`             | CSS 基础规则：颜色格式、选择器规范、缩写属性等                                         |
| ②    | `stylelint-config-standard-scss`        | 在 ① 基础上增加 SCSS 特有规则：`$` 变量、`@mixin`、嵌套等                              |
| ③    | `stylelint-config-recommended-vue/scss` | 在前两者基础上添加 Vue SFC 支持，使用 `postcss-html` 解析 `.vue` 文件中的 `<style>` 块 |

::: tip 为什么使用 `/scss` 子路径？
`stylelint-config-recommended-vue` 提供了两个入口：默认入口和 `/scss` 入口。由于项目使用 SCSS 作为预处理器，必须使用 `/scss` 入口，它会配置 SCSS 相关的自定义语法解析器。
:::

### plugins — 扩展功能

```javascript [stylelint.config.js]
plugins: ['stylelint-order', 'stylelint-selector-bem-pattern'],
```

| 插件                             | 功能                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| `stylelint-order`                | 提供 `order/order` 规则，强制 CSS 声明按指定顺序排列                     |
| `stylelint-selector-bem-pattern` | 提供 `plugin/selector-bem-pattern` 规则，验证选择器是否符合 BEM 命名约定 |

### overrides — 按文件类型覆盖配置

```javascript [stylelint.config.js]
overrides: [
  {
    customSyntax: 'postcss-html',
    files: ['**/*.vue'],
    rules: {
      // 允许 Vue 的 :deep()、:slotted()、:global() 等伪类
      'selector-pseudo-class-no-unknown': [
        true,
        {
          ignorePseudoClasses: ['deep', 'slotted', 'global'],
        },
      ],
    },
  },
  {
    customSyntax: 'postcss-scss',
    files: ['**/*.scss', '**/*.sass'],
  },
],
```

| 文件类型            | 自定义语法解析器 | 说明                                                                 |
| ------------------- | ---------------- | -------------------------------------------------------------------- |
| `*.vue`             | `postcss-html`   | 从 HTML 模板中提取 `<style>` 块进行解析，并允许 Vue 特有的伪类选择器 |
| `*.scss` / `*.sass` | `postcss-scss`   | 使用 SCSS 语法解析器，支持 `$` 变量、嵌套、`@mixin` 等语法           |

::: details 为什么 Vue 文件需要额外处理伪类？
Vue 的 Scoped CSS 提供了 `:deep()`、`:slotted()`、`:global()` 等伪类用于穿透样式隔离。这些不是标准 CSS 伪类，Stylelint 默认会报 `selector-pseudo-class-no-unknown` 错误，因此需要显式忽略。
:::

### rules — 全局规则

#### 关闭 `value-keyword-case`

```javascript
'value-keyword-case': null,
```

关闭关键字大小写检查。默认规则要求 CSS 值关键字使用小写（如 `block`、`none`），但在 Vue 项目中经常在样式中使用 JavaScript 变量（如 `v-bind(myVar)`），这些驼峰命名的变量会被误报。

#### `order/order` — 声明排序

```javascript
'order/order': [
  [
    'dollar-variables',       // ① SCSS 变量 ($color, $size)
    'custom-properties',      // ② CSS 自定义属性 (--my-var)
    'at-rules',              // ③ 其他 @ 规则
    'declarations',          // ④ 普通 CSS 声明 (display, color...)
    { name: 'supports', type: 'at-rule' },  // ⑤ @supports
    { name: 'media', type: 'at-rule' },     // ⑥ @media
    { name: 'include', type: 'at-rule' },   // ⑦ @include（SCSS mixin 调用）
    'rules',                 // ⑧ 嵌套规则
  ],
  { severity: 'error' },
],
```

**强制声明按以下顺序排列**（违反则报错）：

```scss
.example {
  // ① SCSS 变量
  $local-color: #333;

  // ② CSS 自定义属性
  --gap: 8px;

  // ③ @ 规则
  @extend .base;

  // ④ 普通声明
  display: flex;
  color: $local-color;

  // ⑤ @supports
  @supports (display: grid) {
    display: grid;
  }

  // ⑥ @media
  @media (width >= 768px) {
    flex-direction: row;
  }

  // ⑦ @include
  @include responsive();

  // ⑧ 嵌套规则
  &__child {
    margin: 0;
  }
}
```

#### `plugin/selector-bem-pattern` — BEM 命名规范

```javascript
'plugin/selector-bem-pattern': {
  implicitComponents: ['apps/**/src/**/*'],
  ignoreCustomProperties: '.*',
  componentSelectors: {
    initial: '^\\.[a-z][a-z-]*(?:__(?:[a-z-]+))?(?:--[a-z-]+)?$',
    combined: '^\\.[a-z][a-z-]*(?:__(?:[a-z-]+))?(?:--[a-z-]+)?$',
  },
},
```

| 配置项                   | 说明                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| `implicitComponents`     | 对 `apps/**/src/**/*` 下的所有文件启用 BEM 检查                    |
| `ignoreCustomProperties` | 忽略所有 CSS 自定义属性（`--*`），不要求它们符合 BEM 命名          |
| `componentSelectors`     | 正则匹配 BEM 格式：`.block`、`.block__element`、`.block--modifier` |

合法的 BEM 选择器示例：

```scss
.card {
} // Block
.card__header {
} // Block__Element
.card--active {
} // Block--Modifier
.card__header--highlighted {
} // Block__Element--Modifier
```

::: warning 作用范围
BEM 规范检查作用于 `apps/**/src/**/*` 路径下的所有文件，包括组件和页面。全局样式不受此约束。
:::

#### 关闭的规则

```javascript
'selector-class-pattern': null,      // 关闭选择器类名模式检查（由 BEM 插件接管）
'color-function-notation': null,     // 允许 rgb(0, 0, 0) 旧写法
'color-function-alias-notation': null, // 允许 rgba() 别名写法
'alpha-value-notation': null,        // 允许 opacity: 0.5 数字写法（不强制百分比）
```

这些规则被关闭的原因：

- `selector-class-pattern`：与 BEM 插件功能重叠，由 `plugin/selector-bem-pattern` 统一管理
- 颜色相关规则：项目中新旧代码并存，强制现代写法会产生大量变更噪音

#### `scss/at-rule-no-unknown` — 支持 Tailwind CSS 指令

```javascript
'scss/at-rule-no-unknown': [
  true,
  {
    ignoreAtRules: [
      'tailwind',    // @tailwind base/components/utilities
      'apply',       // @apply flex items-center
      'layer',       // @layer components { ... }
      'config',      // @config "./tailwind.config.js"
      'variants',    // @variants responsive { ... }
      'responsive',  // @responsive { ... }
      'screen',      // @screen md { ... }
      'reference',   // @reference "tailwindcss"（Tailwind v4）
    ],
  },
],
```

SCSS 的 `at-rule-no-unknown` 规则会将不认识的 `@` 规则标记为错误。Tailwind CSS 使用了一系列自定义 `@` 指令，必须将它们加入白名单。

::: tip Tailwind v4 的 `@reference`
`@reference` 是 Tailwind CSS v4 新增的指令，用于在不注入样式的情况下引用 Tailwind 的 token 和工具类，常用于 Vue SFC 的 `<style>` 块中。
:::

## .stylelintignore — 忽略文件

```text [.stylelintignore]
# 构建产物
**/dist/
**/build/
**/.output/

# 依赖
**/node_modules/

# 其他
**/.husky/
```

## 运行脚本

在根 `package.json` 中定义了两个脚本：

```json [package.json]
{
  "scripts": {
    "stylelint": "stylelint '**/*.{css,scss,sass,vue}' --max-warnings=0 --cache",
    "stylelint:fix": "stylelint '**/*.{css,scss,sass,vue}' --fix --cache"
  }
}
```

| 脚本            | 说明                 |
| --------------- | -------------------- |
| `stylelint`     | 检查所有样式文件     |
| `stylelint:fix` | 自动修复可修复的问题 |

- `--max-warnings=0`：任何 warning 都会导致检查失败，强制团队解决所有警告
- `--cache`：启用缓存（缓存文件 `.stylelintcache` 生成在项目根目录），仅检查变更的文件，加速执行
