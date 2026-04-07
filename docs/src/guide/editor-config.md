---
title: request
outline: [2, 4]
---

<script setup>
import drawioXml from './drawio/editor-config-save-flow.drawio?raw'
import lintWorkflowXml from './drawio/lint-workflow.drawio?raw'
import eslintWorkingDirsXml from './drawio/eslint-working-directories.drawio?raw'
</script>

# VS Code 与 EditorConfig 配置

本文档记录项目中的编辑器配置，包括 VS Code 设置、推荐扩展和 EditorConfig 跨编辑器规范。三者职责分离、协同工作，确保团队开发环境一致。

## 配置职责分离

| 配置文件                | 职责                                      | 适用范围     |
| ----------------------- | ----------------------------------------- | ------------ |
| `.editorconfig`         | 基础编码规范（缩进、换行符、字符编码）    | 所有编辑器   |
| `.vscode/settings.json` | VS Code 特有功能（保存时格式化、Linting） | VS Code      |
| `.prettierrc.yaml`      | 代码格式化规则                            | CLI + 编辑器 |
| `eslint.config.js`      | 代码质量检查规则                          | CLI + 编辑器 |

> [!TIP] 为什么需要职责分离？
> `.editorconfig` 解决跨编辑器的基础一致性；`.vscode/settings.json` 只配置 VS Code 特有的功能（如保存时自动修复）；格式化和检查规则分别由 Prettier 和 ESLint 的配置文件管理。这样避免重复配置和规则冲突。

### 保存时的自动处理流程

<ClientOnly>
  <DrawioViewer :data="drawioXml" />
</ClientOnly>

> [!TIP] 与 Git Hooks 形成双重保障
>
> - **编辑器保存**：即时反馈，自动修复可修复的问题
> - **Git Hooks（lint-staged）**：提交前强制检查暂存文件，作为最后防线
> - **双重保障**：即使开发者未使用 VS Code 或禁用了自动修复，提交前的 Hook 也会拦截不符合规范的代码

## EditorConfig — 跨编辑器编码规范

[EditorConfig](https://editorconfig.org/) 确保团队成员使用不同编辑器（VS Code、WebStorm、Vim 等）时保持一致的基础编码风格。

### 1.1 配置文件

```ini [.editorconfig]
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### 1.2 配置说明

**通用规则 `[*]`**

| 选项                       | 值      | 说明                                              |
| -------------------------- | ------- | ------------------------------------------------- |
| `root`                     | `true`  | 顶层配置文件，停止向上查找                        |
| `charset`                  | `utf-8` | 字符编码                                          |
| `end_of_line`              | `lf`    | 使用 LF 换行符（Unix 风格），避免跨平台换行符混乱 |
| `indent_style`             | `space` | 使用空格缩进                                      |
| `indent_size`              | `2`     | 缩进宽度 2 空格                                   |
| `insert_final_newline`     | `true`  | 文件末尾保留一个空行                              |
| `trim_trailing_whitespace` | `true`  | 删除行尾多余空格                                  |

**Markdown 特殊规则 `[*.md]`**

| 选项                       | 值      | 说明                                              |
| -------------------------- | ------- | ------------------------------------------------- |
| `trim_trailing_whitespace` | `false` | 保留行尾空格（Markdown 中两个空格 = 换行 `<br>`） |

## VS Code 配置

`.vscode/` 目录下的配置文件会被 VS Code 自动读取，用于统一团队成员的编辑器行为。

```txt [.vscode]
.vscode/
├── settings.json     ← 编辑器行为与插件配置
└── extensions.json   ← 推荐安装的插件列表
```

这两个文件都应提交到版本控制，确保所有人使用相同的编辑器环境。

### extensions.json — 推荐插件

```json [.vscode/extensions.json]
{
  "recommendations": [
    "Vue.volar",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "editorconfig.editorconfig",
    "ms-vscode.vscode-typescript-next",
    "redhat.vscode-yaml"
  ]
}
```

打开项目后，VS Code 会在右下角提示安装推荐插件。以下逐条说明：

| 插件 ID                            | 作用                                                                  |
| ---------------------------------- | --------------------------------------------------------------------- |
| `Vue.volar`                        | Vue 3 语法高亮                                                        |
| `dbaeumer.vscode-eslint`           | 在编辑器内实时显示 ESLint 错误，并支持保存时自动修复                  |
| `esbenp.prettier-vscode`           | Prettier 格式化支持，配合 `settings.json` 实现保存时格式化            |
| `bradlc.vscode-tailwindcss`        | Tailwind CSS 智能提示、类名补全和悬浮预览                             |
| `editorconfig.editorconfig`        | 读取 `.editorconfig` 文件，统一缩进、换行符等基础格式                 |
| `ms-vscode.vscode-typescript-next` | TypeScript Nightly 语言服务，支持最新语法特性（如 `import ... with`） |
| `redhat.vscode-yaml`               | YAML 文件语法验证与补全，用于 `.lintstagedrc.yaml` 等配置文件         |

:::tip Vue.volar 与 Vetur
Vue 3 项目必须使用 Volar（`Vue.volar`），不要同时启用 Vetur，两者会冲突导致类型提示错乱。
:::

### settings.json — 编辑器与插件配置

#### 保存时自动格式化与修复

```json [.vscode/settings.json]
{
  // 保存时触发格式化
  "editor.formatOnSave": true,

  // 格式化器统一为 Prettier
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  "editor.codeActionsOnSave": {
    // 保存时自动执行 eslint --fix
    "source.fixAll.eslint": "explicit",
    // 保存时自动执行 stylelint --fix
    "source.fixAll.stylelint": "explicit"
  }
}
```

:::tip `"explicit"`
表示只在**明确保存**（`Ctrl/Cmd + S`）时触发，不会在自动保存时执行——避免频繁修改文件干扰 Git diff。
:::

这三项配置共同实现了**保存即修复**的工作流：

- ESLint 可自动修复的规则：
  - `consistent-type-imports`：自动为仅用作类型的导入加上 `type` 关键字（如 `import { type User }`）
  - `prettier/prettier`：统一缩进、引号、尾逗号等格式
  - `vue/no-undef-components`：补充缺失的组件导入（需规则支持 fix）
- Stylelint 可自动修复的样式问题

#### ESLint 插件配置

```json [.vscode/settings.json]
{
  // 告知 ESLint 插件使用 Flat Config 格式
  // 如果不设置，旧版插件可能仍尝试查找已废弃的 `.eslintrc.*` 文件
  "eslint.useFlatConfig": true,

  "eslint.workingDirectories": [
    { "pattern": "apps/*" },
    { "pattern": "packages/*" }
  ]
}
```

##### `eslint.workingDirectories`（Monorepo 的关键配置）

这是 Monorepo 中最容易被忽略但最重要的配置项。

**问题背景**：ESLint 插件默认以**工作区根目录**作为工作目录来查找 `eslint.config.js`。但在本项目中，根目录的 `eslint.config.js` 只覆盖根目录自身的文件，而 `apps/main-app`、`apps/vue3-app` 等各有自己的 `eslint.config.js`。如果插件不知道要切换工作目录，就会用根目录配置去检查子项目代码——导致 Vue 规则缺失、`tsconfigRootDir` 指向错误等问题。

**`workingDirectories` 的作用**：告诉 ESLint 插件，当打开 `apps/*` 或 `packages/*` 下的文件时，**切换到该子项目目录**作为工作目录，从而正确读取子项目自己的 `eslint.config.js`。

<ClientOnly>
  <DrawioViewer :data="eslintWorkingDirsXml" />
</ClientOnly>

#### Prettier 与 TypeScript 配置

```json [.vscode/settings.json]
{
  "prettier.requireConfig": true,
  "js/ts.tsdk.path": "node_modules/typescript/lib"
}
```

##### `prettier.requireConfig: true`

只有当项目中存在 Prettier 配置文件（`.prettierrc.yaml` 等）时，才对文件进行格式化。防止在没有 Prettier 配置的目录（如临时脚本）中意外格式化文件。

##### `js/ts.tsdk.path`

指定 VS Code 使用**项目本地安装的 TypeScript**，而不是 VS Code 内置的 TypeScript 版本。

> [!NOTE] 设置项变更
> 旧版 VS Code 使用 `typescript.tsdk`，现已废弃并由 `js/ts.tsdk.path` 替代。如果你在设置中看到废弃警告，确认已使用新的设置项名即可。

这很重要，因为：

- 内置 TypeScript 版本可能滞后于项目依赖的版本
- Volar 的类型检查、ESLint 的类型感知规则都依赖同一份 TypeScript——统一使用本地版本可以保证编辑器提示与 `tsc` / ESLint 行为一致

#### Stylelint 配置

```jsonc [.vscode/settings.json]
{
  // 启用 Stylelint 插件
  "stylelint.enable": true,

  // 对这些文件类型运行 Stylelint
  "stylelint.validate": ["css", "scss", "sass", "vue"],
  // 在这些文件类型中启用 Stylelint 代码片段
  "stylelint.snippet": ["css", "scss", "sass", "vue"],

  // 关闭 VS Code 内置 CSS 校验
  "css.validate": false,
  // 关闭 VS Code 内置 SCSS 校验
  "scss.validate": false,
}
```

关闭内置 CSS/SCSS 校验是必要的——内置校验器不理解 Stylelint 的自定义规则（如 `stylelint-scss`），会产生误报。统一交由 Stylelint 处理即可。

#### 拼写检查配置

```json [.vscode/settings.json]
{
  "cSpell.words": ["Qiankun"]
}
```

将项目中常用但不在标准词典中的专有名词加入白名单，避免拼写检查插件误报。

#### 文件嵌套配置

VS Code 的文件嵌套功能可以将相关配置文件收纳到父文件下，使文件树更简洁。

```json [.vscode/settings.json]
{
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "package.json": "package-lock.json, pnpm-lock.yaml, pnpm-workspace.yaml, .npmrc, .yarnrc*, yarn.lock, .gitattributes, .gitignore, .czrc, .lintstagedrc*, commitlint.config.*",
    "eslint.config.*": ".eslintcache, .eslintrc*, .prettier*, .editorconfig, stylelint.config.*, .stylelint*",
    "tsconfig.json": "tsconfig.*.json, *.tsbuildinfo, env.d.ts",
    "vite.config.*": "vitest.config.*, postcss.config.*, index.html"
  }
}
```

### 与 lint 工作流的关系

| 环节     | 配置文件                | 作用                         |
| -------- | ----------------------- | ---------------------------- |
| 编辑器内 | `.vscode/settings.json` | 即时反馈，保存时自动修复     |
| 提交时   | `.lintstagedrc.yaml`    | 强制检查暂存文件（最后防线） |

两者形成互补：

<ClientOnly>
  <DrawioViewer :data="lintWorkflowXml" />
</ClientOnly>

## 相关链接

- [Volar (Vue.volar)][volar]
- [ESLint (dbaeumer.vscode-eslint)][eslint]
- [Prettier (esbenp.prettier-vscode)][prettier]
- [Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)][tailwindcss]
- [EditorConfig (editorconfig.editorconfig)][editorconfig]
- [TypeScript Nightly (ms-vscode.vscode-typescript-next)][ts-nightly]
- [YAML (redhat.vscode-yaml)][yaml]
- [Stylelint (stylelint.vscode-stylelint)][stylelint]

[volar]: https://marketplace.visualstudio.com/items?itemName=Vue.volar
[eslint]: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
[prettier]: https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode
[tailwindcss]: https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss
[editorconfig]: https://marketplace.visualstudio.com/items?itemName=editorconfig.editorconfig
[ts-nightly]: https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next
[yaml]: https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml
[stylelint]: https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint
