---
name: i18n-replace
description: 将 Vue/TS 文件中的硬编码中文文案提取为 i18n 语言包，并替换为对应的翻译函数调用。当用户说"国际化这个文件/目录"、"提取文案"、"替换硬编码中文"、"i18n 化"、"抽取语言包"时触发。支持单文件或整个目录。
---

# i18n-replace

将 Vue/TS 文件中的硬编码中文文案提取到语言包，并替换为正确的 `$t()` / `t()` / `i18n.global.t()` 调用。

## 项目 i18n 规则（必读）

**语言包路径**：`{app}/src/locales/{locale}/{namespace}.json`
- locale：`zh-CN`（源语言）、`en`
- namespace 由**文件相对 `src/` 的路径**决定，去掉扩展名和末尾的 `/index`：
  - `src/views/Modal/index.vue` → namespace = `views/Modal`
  - `src/views/HomeView.vue` → namespace = `views/HomeView`
  - `src/components/Foo/Bar.vue` → namespace = `components/Foo/Bar`

**key 风格**：`nested`（点分嵌套），例如 `views.Modal.page.title`。JSON 文件内用嵌套对象存储，在代码里用点分路径访问。

**翻译函数调用方式**：

| 场景 | 写法 |
|------|------|
| Vue `<template>` 文本 | `{{ $t('namespace.key') }}` |
| Vue `<template>` 属性 | `:placeholder="$t('namespace.key')"` |
| `<script setup>` 逻辑代码 | `const { t } = useI18n()` 然后 `t('namespace.key')` |
| 纯 `.ts` 文件（setup 外） | `import { i18n } from '@/locales'` 然后 `i18n.global.t('namespace.key')` |

**带插值的文案**：`'打开 {label}'` → 保留 `{label}` 占位符语法，调用时传参：
- 模板：`$t('namespace.key', { label })`
- 脚本：`t('namespace.key', { label })`

## 执行流程

### 第一步：收集目标文件

用户指定单文件或目录：
- 单文件：直接处理该文件
- 目录：递归找出所有 `.vue` 和 `.ts`（排除 `*.d.ts`、`locales/`、`node_modules/`）

### 第二步：扫描硬编码中文

逐文件读取，识别以下位置的中文字符串（包含任意汉字的字符串视为中文）：

**Vue 文件**：
- `<template>` 中的文本内容：`>登录</`、`{{ '提交' }}`
- `<template>` 中的字符串属性：`placeholder="请输入"`、`:label="'确认'"`
- `<script setup>` 中的字符串字面量赋值、返回值、模板字符串

**TS 文件**：
- 字符串字面量、模板字符串、对象属性值

**跳过**：
- 已被 `$t(`、`t(`、`i18n.global.t(` 包裹的字符串
- 注释内容
- `import` 语句
- console.log / console.warn 等调试输出

### 第三步：确定 namespace 和生成 key

1. 从文件路径推导 namespace（见上方规则）
2. 对每条中文文案，生成语义化的驼峰或下划线 key，例如：
   - "处理备注" → `remarkLabel`
   - "确认" → `confirm`
   - "页面标题" → `pageTitle`
   - "打开 {label}" → `openAction`（保留插值）
3. 如 namespace 下已存在 key，追加数字后缀避免冲突

### 第四步：生成 / 更新语言包 JSON

**zh-CN**：写入原始中文文案
**en**：根据中文语义生成对应英文翻译

对 JSON 文件：
- 如文件不存在，创建并写入
- 如文件已存在，**深度合并**，不覆盖已有 key
- 保持 JSON 格式整洁（2 空格缩进）

### 第五步：替换源文件

逐处替换，根据位置选择正确的调用形式：

```vue
<!-- 替换前 -->
<h1>页面标题</h1>
<input placeholder="请输入关键词" />

<!-- 替换后 -->
<h1>{{ $t('views.Foo.pageTitle') }}</h1>
<input :placeholder="$t('views.Foo.searchPlaceholder')" />
```

```vue
<!-- script setup 中 -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
// 如果文件中已有 useI18n 导入则不重复添加

const label = t('views.Foo.label')
</script>
```

```ts
// 纯 TS 文件
import { i18n } from '@/locales'

const msg = i18n.global.t('views.Foo.label')
```

### 第六步：汇报

处理完成后输出：
- 处理了哪些文件
- 提取了多少条文案
- 新增 / 更新了哪些语言包文件
- 如有无法自动判断的歧义情况（如相同中文出现在不同语义位置），列出并提示用户确认

## 注意事项

- 同一文件内相同中文 → 复用同一个 key，不重复提取
- 模板字符串含变量（`` `你好 ${name}` ``）→ 转为 vue-i18n 命名插值：`t('key', { name })`，占位符写为 `{name}`
- 动态拼接字符串（`'错误：' + code`）→ 不自动处理，标记为需人工确认
- 处理目录时，如文件数量超过 20 个，先列出文件列表请用户确认再执行
