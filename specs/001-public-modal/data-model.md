# 数据模型：公共 Modal 弹窗

## 1. ModalResult

表示一次命令式弹窗完成后返回给调用方的结果值。

| 字段 | 类型 | 说明 | 规则 |
|------|------|------|------|
| `data` | 结构化对象或空值 | 本次弹窗返回的数据 | 确认路径可返回业务数据；取消或关闭路径可为空 |
| `path` | `confirm` 或 `cancel` | 调用方观察本次结果路径的方式 | 页面侧需要能够区分完成与中断 |

### 约束

- 调用方始终通过结果 Promise 感知本次弹窗结束。
- 结果可以不携带业务数据，但不能没有明确的完成路径。

## 2. ModalInjectedProps

表示框架向命令式弹窗组件注入的基础回调能力。

| 字段 | 类型 | 说明 |
|------|------|------|
| `onOk` | function | 在确认路径下结束当前弹窗，并可附带业务结果；允许返回 Promise |
| `onCancel` | function | 在取消或关闭路径下结束当前弹窗，并可附带业务结果；允许返回 Promise |
| `afterClose` | function | 在关闭动画或关闭流程完成后执行清理 |

### 约束

- 注入能力只面向命令式弹窗组件。
- 页面直接挂载组件时，由页面自身提供对应回调。
- 若 `onOk` 或 `onCancel` 返回 Promise，则只有 Promise 成功完成后才允许关闭弹窗。
- 若 `onOk` 或 `onCancel` 抛错，或返回 rejected Promise，则弹窗保持打开，并退出当前 loading 态。
- 异步执行期间需要阻止同一动作被重复触发。

## 3. BaseModalConfig

表示所有弹窗共享的基础配置。

| 字段 | 类型 | 说明 | 规则 |
|------|------|------|------|
| `title` | string | 弹窗标题 | 对外展示文案使用简体中文 |
| `okText` | string | 确认按钮文案 | 可按业务场景覆盖 |
| `cancelText` | string | 取消按钮文案 | 可按业务场景覆盖 |
| `width` | number 或 string | 弹窗宽度 | 不同用例可覆盖默认宽度 |
| `centered` | boolean | 弹窗位置 | 不同用例可切换是否垂直居中 |
| `size` | `tips / small / medium / large` | 预设尺寸 | 影响共用弹窗壳层的展示规格 |
| `okButtonReady` | boolean | 确认按钮状态 | 用于表现“可点击但未就绪”的业务态 |
| `okButtonProps` | object | 确认按钮补充属性 | 可表达危险态等附加按钮风格 |

### 运行规则

- 基础弹窗在执行确认或取消动作时，需要进入 loading 态。
- 基础弹窗仅在动作成功完成后关闭。
- 动作失败时，基础弹窗保持打开，由上层业务决定如何提示用户。

## 4. DemoActionModalRequest

表示组件包内置示例弹窗的输入配置。

| 字段 | 类型 | 说明 |
|------|------|------|
| `description` | string | 说明文案 |
| `initialRemark` | string | 默认备注 |
| `title / okText / cancelText / width / centered / size` | 继承基础配置 | 与基础弹窗壳层共享 |

## 5. DemoActionModalResult

表示组件包内置示例弹窗在确认后返回的结构化业务结果。

| 字段 | 类型 | 说明 |
|------|------|------|
| `ticketId` | string | 本次处理生成的单号 |
| `status` | string | 当前结果状态 |
| `operatorName` | string | 操作人展示名 |
| `remark` | string | 用户填写的备注 |
| `processedAt` | string | 处理完成时间 |

## 6. 应用侧本地弹窗结果

### MetricsSnapshotModalResult

| 字段 | 类型 | 说明 |
|------|------|------|
| `source` | string | 结果来源标识 |
| `kind` | `metrics` | 用例类型 |
| `selectedMetric` | string | 当前选择的指标项 |
| `metricCount` | number | 指标总数 |
| `processedAt` | string | 处理完成时间 |

### ChecklistReviewModalResult

| 字段 | 类型 | 说明 |
|------|------|------|
| `source` | string | 结果来源标识 |
| `kind` | `checklist` | 用例类型 |
| `completedCount` | number | 已勾选项数量 |
| `selectedItems` | string[] | 当前勾选项列表 |
| `processedAt` | string | 处理完成时间 |

## 7. ModalDemoCase

表示 `/Modal` 页面中的一个演示用例定义。

| 字段 | 类型 | 说明 |
|------|------|------|
| `label` | string | 用例标题 |
| `componentLabel` | string | 展示用组件标签 |
| `summary` | string | 用例说明 |
| `checks` | string[] | 当前用例关注点 |
| `open` | function | 打开当前用例的动作 |

### 不变量

- 每个用例都必须能独立打开和关闭。
- 命令式用例必须最终写入结果日志。
- 队列用例必须复用同一命令式调度能力。
