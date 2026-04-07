---
title: 常见问题与解决方案
---

# 常见问题与解决方案

记录接入 qiankun 微前端过程中遇到的问题及对应解决方案。

## 子应用 CSS 样式插入到主应用 head

### 问题

Vite 构建的子应用默认开启 CSS 代码分割（`cssCodeSplit: true`），生产环境会为每个异步 chunk 生成独立的 `.css` 文件，并通过 `<link>` 标签动态插入。

在 qiankun 沙箱环境下，这些 `<link>` 标签会被插入到**主应用的 `<head>`** 中而非子应用的沙箱容器内，导致：

- 子应用样式污染主应用
- 子应用卸载后样式残留

### 解决方案

在子应用的 `vite.config.ts` 中关闭 CSS 代码分割，将所有 CSS 打包为单个文件内联到 JS 中：

```ts [apps/vue3-history/vite.config.ts]
build: {
  cssCodeSplit: false,
},
```

这样 CSS 会随 JS 一起被 qiankun 沙箱管理，避免 `<link>` 标签逃逸到主应用。
