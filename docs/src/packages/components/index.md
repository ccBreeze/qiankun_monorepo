---
title: components
---

# @breeze/components

`@breeze/components` 是 Breeze 中所有应用共享的公共 UI 组件库，统一沉淀基于 [Ant Design Vue](https://antdv.com/) 的主题、样式底座和命令式弹窗能力。

## 包结构

```
packages/components/
├── src/
│   ├── AntConfigProvider/   # 全局主题与样式底座
│   │   ├── index.vue        # ConfigProvider 包装组件
│   │   ├── globalStyle.ts   # 全局 scss 注入
│   │   └── theme/           # 主题 token 与组件样式
│   ├── Modal/               # 命令式 / 声明式弹窗
│   │   ├── BaseModal.vue    # 通用底层壳
│   │   ├── components/      # 业务弹窗实现
│   │   ├── manager.ts       # 弹窗串行队列
│   │   ├── render.ts        # 实例渲染与销毁
│   │   ├── open.ts          # openModal 入口
│   │   ├── types.ts         # 注入字段类型
│   │   └── index.ts
│   └── index.ts             # 包入口
└── package.json
```

包名为 `@breeze/components`，对外只暴露根入口 `.`：

```ts
import {
  AntConfigProvider,
  BaseModal,
  openModal,
  ModalEnum,
} from '@breeze/components'
```

## 组件总览

| 模块                                            | 类型            | 用途                                                                              |
| ----------------------------------------------- | --------------- | --------------------------------------------------------------------------------- |
| [AntConfigProvider](./ant-config-provider.html) | 声明式包装组件  | 统一项目内 antdv 主题 token、组件尺寸与全局样式，作为应用根节点的样式底座         |
| [Modal](./modal.html)                           | 命令式 + 声明式 | 提供 `BaseModal` 通用壳与 `openModal` 命令式入口，自动套 `AntConfigProvider` 主题 |

## 何时使用

- 新建子应用 / 主应用时，直接用 `AntConfigProvider` 包住根组件，避免每个应用各自维护一份 token。
- 业务里需要"弹窗 → 等结果 → 继续流程"这类场景时，使用 `openModal` 命令式入口，避免在父组件维护 `visible` 与回调 props。

## 依赖

| 依赖                    | 说明                                          |
| ----------------------- | --------------------------------------------- |
| `vue`                   | 组件运行时（catalog 版本）                    |
| `ant-design-vue`        | UI 基础库；本包通过 token + scss 做了二次定制 |
| `@ant-design/icons-vue` | 图标库，按需在内置弹窗中使用                  |
