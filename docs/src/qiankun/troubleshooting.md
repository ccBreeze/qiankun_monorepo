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

## Vue 警告：宿主容器已有应用实例挂载

### 问题

在 qiankun 环境下，`app.mount('#app')` 直接传字符串选择器时，Vue 会在**全局 document** 范围内查找目标节点：

此时可能命中页面上已经被挂载过的同名 ID 节点，导致以下警告：

![alt text](./imgs/Application_died_in_status_NOT_MOUNTED.png)

### 解决方案

优先从 `props.container` 内部查找挂载节点，仅在独立运行时回退到字符串选择器：

```ts
const rootId = `#${import.meta.env.VITE_APP_NAME}`
const rootContainer = microAppContext.container?.querySelector(rootId) || rootId
app.mount(rootContainer)
```

> 参考：[qiankun 官方 FAQ](https://qiankun.umijs.org/zh/faq#application-died-in-status-not_mounted-target-container-with-container-not-existed-after-xxx-mounted)
