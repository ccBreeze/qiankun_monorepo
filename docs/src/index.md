---
layout: home
title: Docs
titleTemplate: qiankun 微前端 Monorepo 实战手册

hero:
  name: qiankun Monorepo
  text: 微前端实战手册
  tagline: 基于 qiankun + Vue 3 + pnpm workspace 的中台微前端工程实践
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/pnpm-workspace
    - theme: alt
      text: qiankun 架构
      link: /qiankun/micro-app-registry
    - theme: alt
      text: 微前端原理
      link: /micro-frontend/qiankun-principle

features:
  - icon: 🛠️
    title: 工程化配置
    details: pnpm workspace、tsconfig、ESLint、Stylelint、Git Hooks，一套可复用的 Monorepo 基建。
    link: /guide/pnpm-workspace
    linkText: 查看配置指南

  - icon: 🧩
    title: qiankun 架构落地
    details: 子应用注册表、路由协作、事件总线、Tab/KeepAlive 缓存机制等中台壳层完整实现。
    link: /qiankun/micro-app-registry
    linkText: 进入架构文档

  - icon: 🔍
    title: 微前端原理
    details: 深入 qiankun 源码、vite-plugin-qiankun 设计，以及与 Module Federation 的取舍。
    link: /micro-frontend/qiankun-principle
    linkText: 阅读原理剖析

  - icon: ⚡
    title: 性能优化
    details: API/组件自动导入、Vite 拆包策略、字体加载优化，让中台应用首屏更快。
    link: /optimization/auto-import
    linkText: 查看优化方案

  - icon: 📦
    title: Packages 生态
    details: '@breeze/runtime、router、bridge-vue、components、i18n、utils 等可复用包。'
    link: /packages/utils/
    linkText: 浏览 Packages

  - icon: 🧪
    title: 问题排查
    details: 接入 OCRM、KeepAlive 切换、静态资源路径等常见踩坑与解决方案沉淀。
    link: /qiankun/troubleshooting
    linkText: 查看常见问题
---
