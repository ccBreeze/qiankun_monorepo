# VitePress 文档编写规范

本文档定义 `docs/` 目录下 VitePress 文档的编写约定，适用于新建和修改文档。

## 文件组织

### 目录结构

```text
docs/src/
├── guide/                       # 指南类文档
│   ├── drawio/                  # guide 下所有 drawio 图表
│   ├── setup.md
│   ├── eslint-config.md
│   └── ...
├── packages/                    # 包文档（按包路径组织）
│   └── utils/
│       └── request/
│           ├── drawio/          # 当前文档目录的 drawio 图表
│           └── technical.md
└── index.md                     # 站点首页
```

### 资源文件存放

- `.drawio` 图表统一存放在当前文档目录下的 `drawio/` 子目录中。
- 同一目录层级的多篇文档共享同一个 `drawio/` 目录。
- 禁止将 `.drawio` 文件与 `.md` 文件混放在同一层级。

### 文件命名

- `.md` 文件使用 kebab-case，例如 `eslint-config.md`、`git-hooks.md`。
- `.drawio` 文件以所属文档名为前缀，例如 `eslint-config-order.drawio`、`git-hooks-workflow.drawio`。

### 侧边栏注册

新增文档后，必须在 `docs/src/.vitepress/configs/sidebar.ts` 中添加对应条目：

```ts
{ text: '文档标题', link: '/guide/文件名' }
```

## 文档结构

### Frontmatter

根据需要使用 YAML frontmatter：

```yaml
---
title: 页面标题
outline: [2, 4]
---
```

### 开头格式

每篇文档以 `# 标题` 开头，紧跟一句话说明文档的定位和范围：

```md
# ESLint 项目配置

本文档以**文件维度**逐一说明项目中每个 ESLint 配置文件的完整内容及各字段含义。
```

### 推荐章节顺序

1. 整体结构
2. 核心概念 / 前置知识
3. 逐文件 / 逐模块详解
4. 运行脚本
5. 相关链接

### `<script setup>` 位置

当文档需要引入 drawio 等资源时，`<script setup>` 块统一放在文档末尾，在所有 Markdown 内容之后：

```md
# 文档标题

...正文内容...

## 相关链接

- [链接](url)

<script setup>
import drawioXml from './drawio/xxx.drawio?raw'
</script>
```

## Markdown 写作规范

### 语言

- 正文使用简体中文。
- 技术术语、配置项、代码标识符保持英文原文。

### 代码块

使用文件路径标注代码块来源，格式为 ` ```语言 [文件路径] `：

````md
```json [package.json]
{
  "scripts": {
    "lint": "eslint ."
  }
}
```
````

- 实际配置文件内容使用完整代码块加逐字段说明。
- 示例代码可适当简化，突出核心逻辑。

### 表格

用表格呈现对比信息和参数说明：

```md
| 参数               | 说明               |
| ------------------ | ------------------ |
| `--cache`          | 启用缓存，加速执行 |
| `--max-warnings=0` | warning 视为失败   |
```

### 行内文本强调

使用 `<span>` 行内样式对关键结论或危险后果进行颜色突出：

```md
<span style="color: var(--vp-c-danger-1); font-weight: bold;">关键结论或危险后果</span>
```

使用原则：

- 仅用于需要读者特别注意的核心结论，不用于普通强调。
- 优先使用 VitePress CSS 变量，自动适配深浅色模式：
  - `var(--vp-c-danger-1)`：严重后果、不可逆操作
  - `var(--vp-c-warning-1)`：注意事项、容易踩坑
  - `var(--vp-c-tip-1)`：推荐做法、正确结论
  - `var(--vp-c-brand-1)`：关键概念、核心名词

### VitePress 容器

使用 VitePress 自定义容器补充说明：

| 容器               | 用途                         |
| ------------------ | ---------------------------- |
| `::: tip 标题`     | 最佳实践、推荐做法、补充提示 |
| `::: details 标题` | 可折叠的深入解释             |
| `::: warning 标题` | 注意事项、容易踩坑的地方     |
| `::: danger 标题`  | 严重警告、破坏性操作提醒     |
| `::: info 标题`    | 中性信息补充                 |

使用原则：

- 主线内容写在正文中，补充性或可选性内容用容器包裹。
- `details` 适合“为什么”类的深入解释，默认折叠不干扰主线。
- `tip` 适合一句话总结或推荐做法。
- 容器标题要有信息量，避免使用“注意”“提示”之类的空标题。

### DrawIO 图表引入

```vue
<script setup>
import drawioXml from './drawio/xxx.drawio?raw'
</script>

<ClientOnly>
  <DrawioViewer :data="drawioXml" />
</ClientOnly>
```

- 使用 Vite 的 `?raw` 后缀以字符串形式导入。
- 必须包裹 `<ClientOnly>`，避免 SSR 报错。

### 目录树

使用纯文本代码块展示文件结构，用 `←` 标注关键说明：

```text
project/
├── src/
│   ├── index.ts ← 入口文件
│   └── utils.ts ← 工具函数
└── package.json
```

## 内容编写原则

### 先讲“为什么”再讲“是什么”

对于架构决策，先解释动机再展示配置。推荐模式：

```md
## 为什么每个子项目都需要独立的 xxx

1. 原因一
2. 原因二

## 具体配置

...
```

### 配置讲解模式

对配置文件的说明遵循统一模式：

1. 贴出完整代码块，并标注文件路径。
2. 用表格或列表逐字段解释。
3. 用 `::: details` 补充深层原因或边界情况。

### 关联文档交叉引用

文档间有关联时，使用 VitePress 的内部链接指向具体章节：

```md
详细配置说明请参阅 [ESLint 配置 — prettier.ts](/guide/eslint-config#prettier-ts)。
```

### 末尾相关链接

文档末尾可添加“相关链接”章节，收录官方文档和参考文章：

```md
## 相关链接

- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [typescript-eslint Project Service](https://typescript-eslint.io/blog/project-service/)
```
