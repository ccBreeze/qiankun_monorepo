---
outline: [2, 2]
---

# Git Hooks 与提交规范

本文档记录如何通过 Husky + lint-staged 实现提交前自动检查，以及通过 Commitlint + Commitizen 规范提交信息。

## 1. Husky — Git Hooks 管理

[Husky](https://typicode.github.io/husky/) 让你可以轻松地在 Git 钩子中执行脚本，确保代码在提交前通过检查。

### 1.1 安装

```bash [pnpm]
pnpm add -Dw husky
```

### 1.2 初始化

```bash [pnpm]
pnpm exec husky init
```

执行后会：

- 在 `package.json` 的 `scripts` 中自动添加 `"prepare": "husky"`
- 创建 `.husky/` 目录，并生成一个示例 `pre-commit` 钩子

> [!TIP] `prepare` 脚本
> `prepare` 是 npm 的[生命周期脚本](https://docs.npmjs.com/cli/v10/using-npm/scripts#life-cycle-scripts)，会在 `pnpm install` 后自动执行。这样团队成员克隆项目并安装依赖后，Husky 会自动启用 Git Hooks，无需额外操作。

```json [package.json]
{
  "scripts": {
    "prepare": "husky"
  }
}
```

### 1.3 配置 pre-commit 钩子

编辑 `.husky/pre-commit`，在提交前运行 lint-staged：

```bash [.husky/pre-commit]
pnpm exec lint-staged
```

---

## 2. lint-staged — 只检查暂存文件

[lint-staged](https://github.com/lint-staged/lint-staged) 配合 Husky 的 `pre-commit` 钩子使用，只对 `git add` 到暂存区的文件运行检查，避免全量 lint 带来的性能问题。

### 2.1 安装

```bash [pnpm]
pnpm add -Dw lint-staged
```

### 2.2 配置

创建 `.lintstagedrc.yaml`，按文件类型配置不同的检查命令：

```yaml [.lintstagedrc.yaml]
'*.{js,jsx,ts,tsx}':
  - eslint --fix
  - prettier --write

'*.vue':
  - eslint --fix
  - stylelint --fix
  - prettier --write

'*.{css,scss,sass}':
  - stylelint --fix
  - prettier --write

'*.{json,md,yml,yaml}':
  - prettier --write
```

各文件类型的处理逻辑：

| 文件类型               | ESLint             | Stylelint          | Prettier           |
| ---------------------- | ------------------ | ------------------ | ------------------ |
| `*.{js,jsx,ts,tsx}`    | :white_check_mark: | -                  | :white_check_mark: |
| `*.vue`                | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| `*.{css,scss,sass}`    | -                  | :white_check_mark: | :white_check_mark: |
| `*.{json,md,yml,yaml}` | -                  | -                  | :white_check_mark: |

> [!NOTE] 执行顺序
> lint-staged 按数组顺序依次执行命令。
>
> - 建议先运行 lint 修复（可能改变代码逻辑）。
> - 再运行 Prettier（纯格式化），确保最终输出既符合规则又格式统一。

### 2.3 工作流程

```
git commit
  └─ pre-commit 钩子触发
       └─ pnpm exec lint-staged
            ├─ 获取暂存区文件列表
            ├─ 按匹配规则分组
            ├─ 对每组文件运行对应命令（--fix 自动修复）
            ├─ 修复后的文件自动重新暂存
            └─ 全部通过 → 允许提交 / 有错误 → 阻止提交
```

---

## 3. Commitlint — 提交信息校验

[Commitlint](https://commitlint.js.org/) 检查 Git 提交信息是否符合 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范。

### 3.1 安装

```bash [pnpm]
pnpm add -Dw @commitlint/cli @commitlint/config-conventional
```

| 包名                              | 用途                               |
| --------------------------------- | ---------------------------------- |
| `@commitlint/cli`                 | commitlint 命令行工具              |
| `@commitlint/config-conventional` | 预设的 Conventional Commits 规则集 |

### 3.2 创建配置文件

```js [commitlint.config.js]
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 要求每次提交都必须包含 scope（作用域），不允许为空
    'scope-empty': [2, 'never'],
  },
}
```

### 3.3 配置 commit-msg 钩子

创建 `.husky/commit-msg`，在提交时校验提交信息：

```bash [.husky/commit-msg]
pnpm exec commitlint --edit $1
```

`--edit $1` 表示读取 `.git/COMMIT_EDITMSG` 文件中的提交信息进行校验。

### 3.4 Conventional Commits 格式

```
<type>(<scope>): <subject>

[body]

[footer]
```

常用 type：

| type       | 说明                     | 示例                              |
| ---------- | ------------------------ | --------------------------------- |
| `feat`     | 新功能                   | `feat(auth): 添加登录页面`        |
| `fix`      | 修复 Bug                 | `fix(menu): 修复菜单折叠状态异常` |
| `docs`     | 文档变更                 | `docs(readme): 更新安装说明`      |
| `style`    | 代码格式（不影响逻辑）   | `style(layout): 调整缩进`         |
| `refactor` | 重构（非新功能、非修复） | `refactor(utils): 简化请求拦截器` |
| `perf`     | 性能优化                 | `perf(list): 优化大列表渲染`      |
| `test`     | 测试相关                 | `test(router): 添加路由匹配测试`  |
| `chore`    | 构建/工具变更            | `chore(deps): 升级 vite 到 v6`    |
| `ci`       | CI 配置变更              | `ci(github): 添加自动部署流程`    |

> [!WARNING] 本项目要求 scope 不能为空
> 由于配置了 `'scope-empty': [2, 'never']`，提交时必须指定作用域。例如 `feat: 添加功能` 会被拒绝，应写为 `feat(module): 添加功能`。

---

## 4. Commitizen — 交互式提交

[Commitizen](https://github.com/commitizen/cz-cli) 提供交互式命令行界面，引导你按照 Conventional Commits 格式填写提交信息。

### 4.1 安装

```bash [pnpm]
pnpm add -Dw commitizen cz-conventional-changelog
```

| 包名                        | 用途                        |
| --------------------------- | --------------------------- |
| `commitizen`                | 交互式提交工具              |
| `cz-conventional-changelog` | Conventional Commits 适配器 |

### 4.2 配置

创建 `.czrc`，指定使用的适配器：

```json [.czrc]
{ "path": "cz-conventional-changelog" }
```

### 4.3 使用

```bash [pnpm]
# 代替 git commit 使用
pnpm exec cz
```

执行后会依次提示：

```
? Select the type of change that you're committing: (Use arrow keys)
❯ feat:     A new feature
  fix:      A bug fix
  docs:     Documentation only changes
  style:    Changes that do not affect the meaning of the code
  refactor: A code change that neither fixes a bug nor adds a feature
  perf:     A code change that improves performance
  test:     Adding missing tests or correcting existing tests

? What is the scope of this change (e.g. component or file name):
? Write a short, imperative tense description of the change:
? Provide a longer description of the change: (press enter to skip)
? Are there any breaking changes?
? Does this change affect any open issues?
```

---

## 完整的 Git Hooks 文件结构

```
qiankun_monorepo/
├── .husky/
│   ├── pre-commit              ← 提交前运行 lint-staged
│   └── commit-msg              ← 提交时校验提交信息
├── .lintstagedrc.yaml          ← lint-staged 检查规则
├── .czrc                       ← Commitizen 适配器配置
├── commitlint.config.js        ← 提交信息校验规则
└── package.json                ← prepare 脚本、相关依赖
```

## 提交流程总览

<script setup>
import drawioXml from './drawio/git-hooks-workflow.drawio?raw'
</script>

<ClientOnly>
  <DrawioViewer :data="drawioXml" />
</ClientOnly>
