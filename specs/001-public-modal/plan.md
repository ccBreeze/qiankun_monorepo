# 实施计划：公共 Modal 弹窗

**分支**：`001-public-modal` | **日期**：2026-04-24 | **规格**：[`spec.md`](./spec.md)  
**输入**：来自 `/specs/001-public-modal/spec.md` 的功能规格，以及当前 git 暂存区中的已实现代码

## 摘要

本功能已经在 `packages/components` 内形成一套可复用的公共 Modal 能力，并在 `apps/vue3-history` 中提供对照测试页验证，当前实现聚焦以下能力：

1. `openModal()` 支持两条命令式调用路径：
   - 直接传入应用侧或业务侧组件
   - 传入组件包内置标识打开内置弹窗
2. 组件包内置提供 `DemoActionModal` 作为首个示例弹窗，并导出组件形式供直接挂载验证。
3. `vue3-history` 的 `/Modal` 页面同时保留应用侧本地弹窗、组件包命令式弹窗和组件包组件挂载弹窗，用于验证统一底座、结果回传和串行队列。

当前实现采用“`open.ts` 入口 + `manager.ts` 串行调度 + `render.ts` 命令式挂载 + `BaseModal.vue` 统一基础壳层”的结构。对外统一约束是“结果 Promise + 结构化结果 + 同一时刻仅显示一个命令式弹窗”。

## 技术背景

**语言/版本**：TypeScript 5.9、Vue 3.5 SFC  
**主要依赖**：Vue 3、ant-design-vue 4.x、Vue Router  
**存储方式**：N/A，本功能不引入持久化存储  
**测试方式**：`pnpm --filter @breeze/components run type-check`、`pnpm --filter vue3-history run type-check`，以及 `/Modal` 页面人工验收  
**目标平台**：桌面端浏览器中的 `packages/components` 公共能力与 `apps/vue3-history` 演示页面  
**项目类型**：monorepo 内 Vue Web App 功能增量  
**性能目标**：弹窗打开与关闭保持即时反馈；连续 3 个排队用例应顺序展示且不出现残留状态  
**约束条件**：所有界面与日志文案使用简体中文；公共 Modal 能力沉淀到 `packages/components`；测试页保留命令式与组件式两种验证方式  
**规模/范围**：新增 1 个 `components` package、1 套公共 Modal 底座、1 个组件包内置示例弹窗、2 个应用侧本地测试弹窗和 1 个 `vue3-history` 测试页

## 宪章检查

- [x] 计划、研究、数据模型、快速开始等本次交付文档均使用简体中文。
- [x] 涉及界面文本、日志与结果摘要的改动，已明确其简体中文方案。
- [x] 导出边界聚焦在 `packages/components`，应用侧仅承担验证入口。
- [x] 复杂度主要来自“命令式 + 组件式对照验证”和“内置标识 + 任意组件双入口”，均已在文档中解释。

## 项目结构

### 文档产物（本功能）

```text
specs/001-public-modal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── modal-ui-contract.md
└── tasks.md
```

### 源码结构（仓库根目录）

```text
apps/
├── vue3-history/
│   └── src/
│       └── views/
│           └── Modal/
│               ├── Components/
│               │   ├── ChecklistReviewModal.vue
│               │   └── MetricsSnapshotModal.vue
│               └── index.vue

packages/
├── components/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       └── Modal/
│           ├── index.ts
│           ├── manager.ts
│           ├── open.ts
│           ├── render.ts
│           ├── types.ts
│           ├── BaseModal.vue
│           └── components/
│               └── DemoActionModal.vue
```

**结构决策**：公共弹窗能力放在 [`packages/components`](/Users/xingfengli/Desktop/work/github/qiankun_monorepo/packages/components)，便于外部统一消费；[`apps/vue3-history/src/views/Modal/index.vue`](/Users/xingfengli/Desktop/work/github/qiankun_monorepo/apps/vue3-history/src/views/Modal/index.vue) 只承担验证入口和演示职责。

## Phase 0：研究结论摘要

详细研究见 [`research.md`](./research.md)。本阶段已收敛的关键结论：

1. 命令式弹窗采用 `createApp + mount + remove` 的轻量挂载模式，由 `render.ts` 负责单个实例的创建和清理。
2. `BaseModal.vue` 负责统一基础弹窗壳层与共用属性，业务弹窗只关注自身内容与结果返回。
3. `openModal()` 的首版公开契约同时支持“任意组件”和“内置标识”两条路径，以兼顾测试页本地组件和组件包内置示例。
4. 命令式弹窗保持单实例串行展示，通过 `manager.ts` 内的 Promise 链实现 FIFO 队列。
5. 组件包内置示例以 `DemoActionModal` 为主，不再额外维护独立的消息确认弹窗能力。

## Phase 1：设计方案

### 1. 模块与职责拆分

当前方案按以下职责拆分：

- `packages/components/src/Modal/open.ts`
  - 定义内置标识枚举
  - 维护内置弹窗组件映射
  - 提供 `openModal()` 的双重重载
- `packages/components/src/Modal/manager.ts`
  - 串联命令式请求
  - 保证同一时刻只执行一个命令式弹窗
- `packages/components/src/Modal/render.ts`
  - 创建挂载容器
  - 把 `onOk / onCancel / afterClose` 注入目标组件
  - 在关闭后清理实例与 DOM
- `packages/components/src/Modal/BaseModal.vue`
  - 统一标题、按钮、尺寸、宽度、位置和按钮状态等基础能力
  - 统一确认/取消动作的 loading、防重复触发与“成功后关闭、失败时保留”规则
  - 承接业务弹窗的共用交互外壳
- `packages/components/src/Modal/components/DemoActionModal.vue`
  - 作为组件包首个内置示例弹窗
  - 导出请求与结果类型，供命令式和组件式两种路径复用
- `apps/vue3-history/src/views/Modal/index.vue`
  - 展示 4 个验证用例
  - 记录最近的结果日志
  - 提供 3 个排队请求的验证按钮

### 2. 调用与生命周期模型

命令式调用路径如下：

1. 调用方通过 `openModal()` 传入“组件”或“内置标识”。
2. `open.ts` 在需要时把内置标识解析到真实组件。
3. `manager.ts` 把本次请求接入公共 Promise 链，保证串行执行。
4. `render.ts` 创建临时挂载容器并注入关闭回调。
5. 目标弹窗在确认或取消后结束本次 Promise，并在关闭完成后销毁实例。
6. 若基础弹窗上的确认或取消动作是异步的，则必须等待动作成功完成后才关闭；失败时保留当前弹窗。

该模型满足以下约束：

- 命令式请求同一时刻只展示一个
- 调用方通过 Promise 获得结果
- 取消路径不会阻塞后续队列
- 应用侧组件和组件包内置弹窗共用同一调度逻辑

### 3. 基础弹窗设计

`BaseModal.vue` 承担公共壳层职责：

- 统一弹窗尺寸预设
- 支持标题、正文、按钮文案等基础属性透传
- 支持宽度、位置、按钮状态和按钮附加属性等共用配置
- 在确认或取消时处理异步状态、防止重复触发，并在成功完成后关闭当前弹窗
- 若确认或取消动作失败，则保持当前弹窗打开并退出 loading

当前明确不做：

- 不在首版引入多层嵌套弹窗
- 不单独设计移动端交互
- 不在当前 feature 中新增更复杂的内置弹窗家族

### 4. 内置示例弹窗设计

`DemoActionModal.vue` 的职责：

- 展示说明文案
- 提供备注输入区
- 在确认后返回结构化结果
- 同时服务命令式调用与组件直接挂载两条路径

其主要验证价值：

- 证明组件包内置标识可以命令式打开
- 证明同一组件也可以直接以组件形式消费
- 证明组件包能够导出稳定的请求与结果类型

### 5. 测试页接入策略

`/Modal` 页面包含以下验证入口：

1. `MetricsSnapshotModal`：应用侧本地组件，用于验证卡片布局、尺寸和宽度透传
2. `ChecklistReviewModal`：应用侧本地组件，用于验证列表型内容和按钮状态透传
3. `openModal(ModalEnum.DemoActionModal)`：组件包内置命令式弹窗
4. 组件直接挂载 `DemoActionModal`：组件式对照用例
5. “连续打开 3 个排队弹窗”：验证串行队列与结果记录

### 6. 测试与验收策略

自动化基线：

- `@breeze/components` 类型检查通过
- `vue3-history` 类型检查通过

手工验收矩阵：

1. 打开 2 个应用侧本地弹窗并确认结果日志
2. 打开组件包命令式弹窗并确认结构化结果
3. 打开组件包组件挂载弹窗并验证确认/取消日志
4. 连续打开 3 个排队弹窗并确认顺序展示
5. 对比不同用例的尺寸、宽度和按钮状态，验证无串台

## Phase 1 产物

- [`research.md`](./research.md)
- [`data-model.md`](./data-model.md)
- [`quickstart.md`](./quickstart.md)
- [`contracts/modal-ui-contract.md`](./contracts/modal-ui-contract.md)

## 宪章检查（Phase 1 设计后复核）

- [x] 文档与界面文案保持简体中文。
- [x] 公共能力与应用侧验证边界清晰。
- [x] 设计说明已与当前暂存实现保持一致。
- [x] 复杂度来源与取舍已在计划和研究文档中明确记录。

## 复杂度追踪

| 违例项 | 保留原因 | 被拒绝的更简单方案及原因 |
|--------|----------|--------------------------|
| `openModal()` 同时支持组件与内置标识 | 需要同时覆盖应用侧本地测试组件和组件包内置示例 | 只保留单一路径会让当前测试页的一半验证能力缺失 |
| 保留组件直接挂载 `DemoActionModal` | 需要与命令式方式做对照验证，证明组件包导出可双向消费 | 只保留命令式方式虽然更简洁，但无法验证组件导出路径 |
| 单实例串行队列 | 公共弹窗需要稳定的顺序与清理行为 | 允许并发堆叠会显著增加调度、清理和结果记录复杂度 |
