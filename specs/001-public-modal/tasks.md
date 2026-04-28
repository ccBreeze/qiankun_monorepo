# 任务清单：公共 Modal 弹窗

**输入**：来自 `/specs/001-public-modal/` 的规格与对齐后的设计文档  
**前置条件**：`spec.md`、`plan.md`、`research.md`、`data-model.md`、`contracts/`  
**测试**：以类型检查和 `/Modal` 页面人工验收为主

## 格式：`[ID] [P?] [Story] 描述`

- **[P]**：可并行执行（不同文件、无直接依赖）
- **[Story]**：任务所属用户故事（`US1`、`US2`、`US3`）

## Phase 1：公共能力骨架

**目的**：建立 `packages/components` 的公共导出边界与 Modal 目录结构

- [X] T001 创建 `packages/components/package.json`、`packages/components/tsconfig.json`、`packages/components/src/index.ts`
- [X] T002 [P] 创建 `packages/components/src/Modal/index.ts`、`packages/components/src/Modal/types.ts`、`packages/components/src/Modal/open.ts`
- [X] T003 [P] 创建 `packages/components/src/Modal/BaseModal.vue`、`packages/components/src/Modal/manager.ts`、`packages/components/src/Modal/render.ts`

---

## Phase 2：用户故事 1 - 业务方命令式打开弹窗（优先级：P1）

**目标**：支持通过 `openModal()` 打开应用侧本地组件，并回收结果 Promise

- [X] T004 [US1] 在 `packages/components/src/Modal/open.ts` 实现 `openModal()` 双重重载与公共入口
- [X] T005 [US1] 在 `packages/components/src/Modal/manager.ts` 实现命令式请求的串行调度
- [X] T006 [US1] 在 `packages/components/src/Modal/render.ts` 实现单个实例的创建、注入与清理
- [X] T007 [US1] 在 `apps/vue3-history/src/views/Modal/Components/MetricsSnapshotModal.vue` 实现本地指标卡片弹窗
- [X] T008 [US1] 在 `apps/vue3-history/src/views/Modal/Components/ChecklistReviewModal.vue` 实现本地清单弹窗

**检查点**：应用侧本地组件可以通过 `openModal(组件, props)` 打开并返回结果

---

## Phase 3：用户故事 2 - 复用组件包内置弹窗（优先级：P2）

**目标**：提供 `DemoActionModal` 作为组件包内置示例，并保留命令式与组件式两种消费方式

- [X] T009 [US2] 在 `packages/components/src/Modal/components/DemoActionModal.vue` 实现内置示例弹窗与请求/结果类型导出
- [X] T010 [US2] 在 `packages/components/src/Modal/open.ts` 中增加 `ModalEnum.DemoActionModal` 和内置组件映射
- [X] T011 [US2] 在 `packages/components/src/Modal/index.ts` 与 `packages/components/src/index.ts` 导出 `DemoActionModal`、`ModalEnum`、`openModal`
- [X] T012 [US2] 在 `apps/vue3-history/src/views/Modal/index.vue` 增加组件包命令式弹窗与组件包组件挂载用例

**检查点**：`DemoActionModal` 同时可被 `openModal(内置标识)` 和组件直接挂载两种方式消费

---

## Phase 4：用户故事 3 - 串行队列与结果记录可预期（优先级：P3）

**目标**：确保多个命令式请求顺序展示，并在页面上记录结果摘要

- [X] T013 [US3] 在 `packages/components/src/Modal/manager.ts` 保持同一时刻只展示一个命令式弹窗
- [X] T014 [US3] 在 `apps/vue3-history/src/views/Modal/index.vue` 增加最近结果日志区
- [X] T015 [US3] 在 `apps/vue3-history/src/views/Modal/index.vue` 增加“连续打开 3 个排队弹窗”验证入口
- [X] T016 [US3] 在 `apps/vue3-history/src/views/Modal/index.vue` 收口不同结果类型的日志格式化逻辑

**检查点**：连续触发多个用例时，页面顺序展示并能完整记录结果

---

## Phase 5：文档与回归收尾

**目的**：同步规格文档并完成基础校验

- [X] T017 更新 `specs/001-public-modal/spec.md`，使规格与当前暂存实现一致
- [X] T018 [P] 更新 `specs/001-public-modal/plan.md`、`research.md`、`data-model.md`
- [X] T019 [P] 更新 `specs/001-public-modal/quickstart.md` 与 `contracts/modal-ui-contract.md`
- [X] T020 更新 `specs/001-public-modal/checklists/requirements.md`
- [X] T021 运行 `pnpm --filter @breeze/components run type-check` 与 `pnpm --filter vue3-history run type-check`

## 依赖与执行顺序

- Phase 1 完成后才能进入命令式打开与基础壳层实现
- US1 是当前公共 Modal 的 MVP
- US2 依赖 US1 已具备稳定的命令式入口
- US3 依赖前两者的基本流程打通后再补齐日志和排队验证
- 文档更新与类型检查在所有实现完成后收尾

## 备注

- 当前任务清单已按现有暂存实现对齐，不再包含独立消息确认弹窗、注册表文件或 `main-app` 迁移任务。
- 后续若新增更多内置弹窗，可在 `open.ts` 的内置标识映射与对应组件导出基础上继续扩展。
