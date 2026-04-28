# Quickstart：公共 Modal 弹窗

## 目标

用最小步骤验证当前暂存实现已经覆盖以下能力：

1. 通过 `openModal(组件, props)` 打开应用侧本地弹窗
2. 通过 `openModal(内置标识, props)` 打开组件包内置弹窗
3. 通过组件直接挂载方式消费组件包导出的 `DemoActionModal`
4. 连续触发多个命令式弹窗时按顺序排队展示
5. 页面能记录不同用例的结果摘要

## 1. 开发前准备

在仓库根目录执行：

```bash
rtk git branch --show-current
rtk pnpm --filter @breeze/components run type-check
rtk pnpm --filter vue3-history run type-check
```

预期：

- 当前分支为本次 Modal 相关开发分支
- `@breeze/components` 类型检查通过
- `vue3-history` 类型检查通过

## 2. 关键实现位置

- 公共弹窗入口：[`packages/components/src/Modal/open.ts`](/Users/xingfengli/Desktop/work/github/qiankun_monorepo/packages/components/src/Modal/open.ts)
- 串行调度：[`packages/components/src/Modal/manager.ts`](/Users/xingfengli/Desktop/work/github/qiankun_monorepo/packages/components/src/Modal/manager.ts)
- 命令式挂载：[`packages/components/src/Modal/render.ts`](/Users/xingfengli/Desktop/work/github/qiankun_monorepo/packages/components/src/Modal/render.ts)
- 基础弹窗壳层：[`packages/components/src/Modal/BaseModal.vue`](/Users/xingfengli/Desktop/work/github/qiankun_monorepo/packages/components/src/Modal/BaseModal.vue)
- 内置示例弹窗：[`packages/components/src/Modal/components/DemoActionModal.vue`](/Users/xingfengli/Desktop/work/github/qiankun_monorepo/packages/components/src/Modal/components/DemoActionModal.vue)
- 测试页：[`apps/vue3-history/src/views/Modal/index.vue`](/Users/xingfengli/Desktop/work/github/qiankun_monorepo/apps/vue3-history/src/views/Modal/index.vue)

## 3. 最低验收脚本

### 场景 A：应用侧本地弹窗

1. 进入 `vue3-history` 的 `/Modal` 页面
2. 点击“指标快照弹窗”
3. 再点击“清单确认弹窗”

预期：

- 两个用例都能通过 `openModal()` 正常打开
- 每个用例展示各自的标题、说明和按钮文案
- 关闭后“最近结果”区域会新增对应日志

### 场景 B：组件包命令式弹窗

1. 在 `/Modal` 页面点击“组件包命令式弹窗”
2. 输入或修改备注
3. 点击确认

预期：

- 组件包内置弹窗正常展示
- 关闭后日志中出现 `ticketId / status / operator / remark / processedAt` 等摘要

### 场景 C：组件包组件挂载

1. 在 `/Modal` 页面点击“打开组件包组件挂载”
2. 任选“确认”或“取消”

预期：

- 页面以组件直接挂载方式展示 `DemoActionModal`
- 结果仍然会被写入统一日志
- 与命令式方式相比，只是接入方式不同，结果摘要仍可读

### 场景 D：串行队列

1. 在 `/Modal` 页面点击“连续打开 3 个排队弹窗”
2. 按顺序完成 3 个弹窗

预期：

- 同一时刻只显示 1 个弹窗
- 第 2、第 3 个请求会在前一个关闭后依次展示
- 3 个结果都会记录到日志区

## 4. 回归检查

执行：

```bash
rtk pnpm --filter @breeze/components run type-check
rtk pnpm --filter vue3-history run type-check
```

手工检查：

- `packages/components` 已导出 `BaseModal`、`DemoActionModal`、`ModalEnum` 和 `openModal`
- `/Modal` 页面同时包含应用侧本地用例、组件包命令式用例和组件包组件挂载用例
- 连续打开 3 个弹窗时没有出现重复实例、结果丢失或顺序错乱
