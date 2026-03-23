---
outline: [2, 4]
---

# Stylelint

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

| 包名                                                | 版本     | 说明                               |
| --------------------------------------------------- | -------- | ---------------------------------- |
| `stylelint`                                         | ^16.26.1 | Stylelint 核心                     |
| `stylelint-config-standard`                         | ^39.0.1  | 标准 CSS 规则集                    |
| `stylelint-config-standard-scss`                    | ^16.0.0  | 标准 SCSS 规则集（扩展 standard）  |
| `stylelint-config-recommended-vue`                  | ^1.6.1   | Vue SFC 支持                       |
| `stylelint-config-recess-order`                     | ^7.7.0   | CSS 属性排序预设（Recess 风格）    |
| `stylelint-declaration-block-no-ignored-properties` | ^2.8.0   | 检测被浏览器静默忽略的无效属性组合 |
| `postcss-html`                                      | ^1.8.0   | 解析 Vue/HTML 中的 `<style>` 块    |
| `postcss-scss`                                      | ^4.0.9   | 解析 SCSS 语法                     |

在根 `package.json` 中声明依赖时引用 catalog：

```json [package.json]
{
  "devDependencies": {
    "stylelint": "catalog:",
    "stylelint-config-recess-order": "catalog:",
    "stylelint-config-recommended-vue": "catalog:",
    "stylelint-config-standard": "catalog:",
    "stylelint-config-standard-scss": "catalog:",
    "stylelint-declaration-block-no-ignored-properties": "catalog:",
    "stylelint-order": "catalog:"
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
    'stylelint-config-recess-order', // ④ CSS 属性排序（Recess 风格）
  ],
}
```

四层继承关系：

| 顺序 | 配置集                                  | 职责                                                                                   |
| ---- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| ①    | `stylelint-config-standard`             | CSS 基础规则：颜色格式、选择器规范、缩写属性等                                         |
| ②    | `stylelint-config-standard-scss`        | 在 ① 基础上增加 SCSS 特有规则：`$` 变量、`@mixin`、嵌套等                              |
| ③    | `stylelint-config-recommended-vue/scss` | 在前两者基础上添加 Vue SFC 支持，使用 `postcss-html` 解析 `.vue` 文件中的 `<style>` 块 |
| ④    | `stylelint-config-recess-order`         | 基于 Bootstrap Recess 风格的 CSS 属性排序预设，内置 `stylelint-order` 插件             |

::: tip 为什么 `stylelint-config-recommended-vue` 使用 `/scss` 子路径？
`stylelint-config-recommended-vue` 提供了两个入口：默认入口和 `/scss` 入口。由于项目使用 SCSS 作为预处理器，必须使用 `/scss` 入口，它会配置 SCSS 相关的自定义语法解析器。
:::

### plugins — 扩展功能

```javascript [stylelint.config.js]
plugins: ['stylelint-declaration-block-no-ignored-properties'],
```

| 插件                                                | 功能                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `stylelint-declaration-block-no-ignored-properties` | 提供 `plugin/declaration-block-no-ignored-properties` 规则，检测无效属性组合 |

::: tip stylelint-order 不需要在 plugins 中声明
`stylelint-order` 是 `stylelint-config-recess-order` 的 peerDependency，需要在项目中安装，但无需在 `plugins` 中手动声明——`stylelint-config-recess-order` 会自动注册插件。
:::

### rules — 全局规则

#### 关闭 `value-keyword-case`

```javascript
'value-keyword-case': null,
```

关闭关键字大小写检查。默认规则要求 CSS 值关键字使用小写（如 `block`、`none`），但在 Vue 项目中经常在样式中使用 JavaScript 变量（如 `v-bind()`），这些驼峰命名的变量会被误报。

```vue
<script setup lang="ts">
const primaryColor = '#1890ff'
</script>

<style scoped lang="scss">
.button {
  // ✗ 开启规则时报错：Expected "primaryColor" to be "primarycolor"
  color: v-bind(primaryColor);
}
</style>
```

#### 属性排序 — `stylelint-config-recess-order`

CSS **属性排序**由 `stylelint-config-recess-order` 预设提供（通过 `extends` 继承），基于 Bootstrap [Recess](https://github.com/stormwarning/stylelint-config-recess-order) 风格，按以下分组排列：

| 顺序 | 分组        | 中文描述   | 典型属性                                           |
| ---- | ----------- | ---------- | -------------------------------------------------- |
| 1    | Positioning | 定位       | `position`、`top`、`right`、`z-index`              |
| 2    | Box Model   | 盒模型     | `display`、`flex`、`width`、`margin`、`padding`    |
| 3    | Typography  | 排版与文字 | `font-size`、`font-weight`、`line-height`、`color` |
| 4    | Visual      | 视觉样式   | `background`、`border`、`opacity`、`box-shadow`    |
| 5    | Animation   | 动画与过渡 | `transition`、`animation`                          |
| 6    | Misc        | 其他       | `cursor`、`pointer-events`、`user-select`          |

```scss
// ✓ 按 Recess 风格排序
.card {
  // 1. Positioning
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;

  // 2. Box Model
  display: flex;
  align-items: center;
  width: 200px;
  padding: 16px;
  margin: 0 auto;

  // 3. Typography
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: #333;

  // 4. Visual
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0, 0, 0, 0.1);
  opacity: 1;

  // 5. Animation
  transition: opacity 0.3s ease;

  // 6. Misc
  cursor: pointer;
  user-select: none;
}
```

该规则可通过 `stylelint --fix` 自动修复，无需手动调整属性顺序。

#### `selector-class-pattern` — BEM 命名规范

```javascript
'selector-class-pattern': [
  '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$',
  { message: '类名应遵循 BEM 规范：block-name__element--modifier' },
],
```

使用 Stylelint 内置的 `selector-class-pattern` 规则配合 BEM 正则，对 CSS 类名做轻量级格式校验。

**正则拆解：**

| 片段                              | 含义                         | 匹配示例           |
| --------------------------------- | ---------------------------- | ------------------ |
| `^[a-z][a-z0-9]*`                 | 块名：小写字母开头，可含数字 | `menu`、`h5player` |
| `(?:-[a-z0-9]+)*`                 | 块名可用 `-` 连接多个词      | `login-container`  |
| `(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?` | 可选的 `__element` 部分      | `menu__item`       |
| `(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?` | 可选的 `--modifier` 部分     | `menu--active`     |

**合法示例：**

```scss
.card {
} // Block
.card__header {
} // Block__Element
.card--active {
} // Block--Modifier
.card__header--highlighted {
} // Block__Element--Modifier
.login-container__body {
} // 多词 Block + Element
```

::: tip 为什么不使用 `stylelint-selector-bem-pattern` 插件？

1. 置更简洁、无需额外依赖，且不会对 `body`/`html` 等标签选择器误报
2. 对比 [ant-design-vue](https://github.com/vueComponent/ant-design-vue)、[vue-vben-admin](https://github.com/vben/vue-vben-admin)、[ant-design](https://github.com/ant-design/ant-design) 等主流项目，均未使用专用 BEM 插件。内置的 `selector-class-pattern` + 正则已足够覆盖类名格式校验，BEM 层级关系（如 `__element` 是否在对应 Block 内）由 code review 保障。
   :::

#### `plugin/declaration-block-no-ignored-properties` — 无效属性组合检测

```javascript
'plugin/declaration-block-no-ignored-properties': true,
```

检测被浏览器**静默忽略**的 CSS 属性组合。这类问题不会产生运行时报错，但属性实际不生效，属于隐性 bug。

```scss
// ✗ display: inline 下设置尺寸无效
.tag {
  display: inline;
  width: 80px; // ← 被忽略
  height: 32px; // ← 被忽略
  margin-top: 10px; // ← 被忽略
}

// ✗ display: flex 下 vertical-align 无效
.container {
  display: flex;
  vertical-align: middle; // ← 被忽略，应使用 align-items: center
}

// ✗ display: table-cell 下 margin 无效
.cell {
  display: table-cell;
  margin: 10px; // ← 被忽略，应使用 padding 或 border-spacing
}

// ✗ display: block 下 vertical-align 无效
.box {
  display: block;
  vertical-align: middle; // ← 被忽略，仅对 inline/table-cell 生效
}
```

::: tip 灵感来源
该插件参考了 [ant-design-vue](https://github.com/vueComponent/ant-design-vue) 的 Stylelint 配置，用于捕获实际的 CSS bug 而非纯格式问题。
:::

#### 关闭的规则

```javascript
'color-function-notation': null,
'color-function-alias-notation': null,
'alpha-value-notation': null,
'no-descending-specificity': null,
'no-invalid-position-at-import-rule': null,
```

| 规则                                 | 关闭原因                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `color-function-notation`            | 允许 `rgb(0, 0, 0)` 旧写法，新旧代码并存时避免大量变更噪音                     |
| `color-function-alias-notation`      | 允许 `rgba()` 别名写法                                                         |
| `alpha-value-notation`               | 允许 `opacity: 0.5` 数字写法（不强制百分比）                                   |
| `no-descending-specificity`          | Vue scoped 样式中选择器按逻辑分组，强制权重升序会打乱代码结构（见下方示例）    |
| `no-invalid-position-at-import-rule` | SCSS 的 `@use`/`@forward` 和 Tailwind 的 `@reference` 会触发误报（见下方示例） |

::: details color-function-notation / color-function-alias-notation / alpha-value-notation 示例

```scss
// 以下写法在开启规则时会被要求改为新语法，关闭后均允许

// color-function-notation: 旧写法 rgb(0, 0, 0) vs 新写法 rgb(0 0 0)
.foo {
  color: rgb(0, 0, 0); // ✗ 开启时要求改为 rgb(0 0 0)
  background: hsl(0, 0%, 100%); // ✗ 开启时要求改为 hsl(0 0% 100%)
}

// color-function-alias-notation: rgba() vs rgb()
.bar {
  color: rgba(0, 0, 0, 0.5); // ✗ 开启时要求改为 rgb(0 0 0 / 50%)
}

// alpha-value-notation: 数字 vs 百分比
.baz {
  opacity: 0.5; // ✗ 开启时要求改为 opacity: 50%
}
```

关闭这三条规则后，新旧写法均可使用，避免对存量代码产生大量格式变更。
:::

::: details no-descending-specificity 误报示例

该规则要求高权重选择器必须写在低权重选择器**后面**，但 Vue scoped 组件中经常按逻辑分组而非权重排列：

```scss
// ✗ 报错：.card 权重低于前面的 .card .title，但写在后面
.card .title {
  color: blue;
}

.card {
  padding: 16px; // ← 报 no-descending-specificity
}
```

实际上这种写法完全合理——先定义子元素样式、后定义容器样式，是常见的代码组织方式。
:::

::: details no-invalid-position-at-import-rule 误报示例

该规则要求 `@import` 必须写在文件最前面，但 SCSS 和 Tailwind 中经常需要先声明再引入：

```scss
// ✗ 报错：@use 出现在 @reference 之后
@reference "tailwindcss";

@use 'sass:color'; // ← 报 no-invalid-position-at-import-rule
```

<br />

```scss
// ✗ 报错：变量声明在 @import 之前
$theme: 'dark';

@import './theme/#{$theme}'; // ← 报错
```

:::

#### `scss/at-rule-no-unknown` — 支持 Tailwind CSS 指令

```javascript
'scss/at-rule-no-unknown': [
  true,
  {
    ignoreAtRules: [
      'theme',
      'source',
      'utility',
      'variant',
      'custom-variant',
      'apply',
      'reference',
    ],
  },
],
```

这里不是单纯的“SCSS 与 Tailwind 编译冲突”，而是两层问题叠加：

1. **Stylelint 语法识别问题**
   `scss/at-rule-no-unknown` 来自 `stylelint-scss`，会把不认识的 `@` 指令标记为错误。由于项目启用了 `stylelint-config-standard-scss` 和 `stylelint-config-recommended-vue/scss`，这条规则不仅检查 `.scss`，也会检查 `.css` 与 `.vue` 中的 `<style lang="scss">`。
2. **Tailwind v4 工作流变化**
   Tailwind v4 官方不再推荐将 Tailwind 与 Sass/Less/Stylus 叠加使用，而是把 Tailwind 本身视为 preprocessor。也就是说，`@apply`、`@reference` 这类指令本来就不是 CSS/SCSS 标准语法，交给 Tailwind/PostCSS 处理是正常行为；但在 lint 阶段，Stylelint 并不知道这一点，所以必须显式加入白名单。

换句话说：**构建本身可以正常工作，误报来自 lint 层，而不是 Tailwind 编译器与 SCSS 运行时直接冲突。**

```scss
// ✗ 未配置白名单时，以下指令均报 scss/at-rule-no-unknown
@reference 'tailwindcss';

@theme {
  --color-brand-500: oklch(0.72 0.14 250);
}

.button {
  @apply flex items-center px-4 py-2;
}
```

::: tip 为什么官网没有“自动解决”这件事？
Tailwind 官方的解决思路不是让 Stylelint 自动理解所有 Tailwind 指令，而是推荐按 v4 的工作流来写：

- 尽量使用原生 CSS，不再叠加 Sass/Less/Stylus
- 在模板中优先直接使用 utility class
- 必须在 Vue/Svelte 等隔离样式块中使用 Tailwind token 或 `@apply` 时，使用 `@reference`

Stylelint 作为独立工具，默认只认识标准 CSS at-rule，因此仍需要通过 `ignoreAtRules` 明确放行 Tailwind 的自定义指令。
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

# 第三方/生成的主题变量
apps/main-app/src/assets/theme.css
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
