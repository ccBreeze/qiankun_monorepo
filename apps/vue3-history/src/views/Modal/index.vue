<script setup lang="ts">
import { ref } from 'vue'
import {
  DemoActionModal,
  ModalEnum,
  openModal,
  type DemoActionModalRequest,
  type DemoActionModalResult,
  type ModalResult,
} from '@breeze/components'
import ChecklistReviewModal from './Components/ChecklistReviewModal.vue'
import MetricsSnapshotModal from './Components/MetricsSnapshotModal.vue'

defineOptions({
  name: 'ModalDemo',
})

type SharedModalProps = {
  title?: string
  okText?: string
  cancelText?: string
  width?: number | string
  centered?: boolean
  okButtonReady?: boolean
  size?: 'tips' | 'small' | 'medium' | 'large'
  okButtonProps?: {
    danger?: boolean
  }
}

interface MetricsCardItem {
  label: string
  value: string
  note: string
}

interface MetricsSnapshotModalRequest extends SharedModalProps {
  heading: string
  metrics: MetricsCardItem[]
  defaultMetric?: string
}

interface ChecklistReviewModalRequest extends SharedModalProps {
  summary: string
  items: string[]
  initialChecked?: string[]
}

interface MetricsSnapshotModalResult {
  source: 'apps/vue3-history'
  kind: 'metrics'
  selectedMetric: string
  metricCount: number
  processedAt: string
}

interface ChecklistReviewModalResult {
  source: 'apps/vue3-history'
  kind: 'checklist'
  completedCount: number
  selectedItems: string[]
  processedAt: string
}

type DemoResult =
  | MetricsSnapshotModalResult
  | ChecklistReviewModalResult
  | DemoActionModalResult

interface DemoCase {
  label: string
  componentLabel: string
  summary: string
  checks: string[]
  tone?: 'primary' | 'ghost'
  open: () => Promise<SettledModalResult<DemoResult>>
}

interface SettledModalResult<TResult> {
  action: 'confirm' | 'cancel'
  data: ModalResult<TResult>
}

const settleModal = async <TResult,>(
  task: Promise<ModalResult<TResult>>,
): Promise<SettledModalResult<TResult>> => {
  try {
    return {
      action: 'confirm',
      data: await task,
    }
  } catch (result) {
    return {
      action: 'cancel',
      data: result as ModalResult<TResult>,
    }
  }
}

const demoCases: DemoCase[] = [
  {
    label: '组件包命令式弹窗',
    componentLabel: 'ModalEnum.DemoActionModal',
    summary:
      '这里保留 `openModal(ModalEnum.DemoActionModal)` 的命令式用例，用来和下方的组件挂载方式做对照验证。',
    checks: ['openModal', 'ModalEnum', 'package component'],
    open: () =>
      settleModal(
        openModal(ModalEnum.DemoActionModal, {
          title: '组件包命令式弹窗',
          description:
            '这个用例通过 ModalEnum.DemoActionModal 命中组件包内部映射，用命令式方式验证 DemoActionModal。',
          initialRemark: '默认备注：命令式打开',
          okText: '确认调用',
          cancelText: '返回列表',
          size: 'small',
        }),
      ),
  },
  {
    label: '指标快照弹窗',
    componentLabel: 'MetricsSnapshotModal',
    summary:
      '用指标卡片类组件验证不同布局结构、`size/width/centered` 透传，以及卡片选择结果。',
    checks: ['cards layout', 'size=medium', 'width=720'],
    open: () =>
      settleModal(
        openModal<MetricsSnapshotModalRequest, MetricsSnapshotModalResult>(
          MetricsSnapshotModal,
          {
            title: '尺寸与布局透传',
            heading:
              '这里会使用更宽的弹窗并取消垂直居中，方便观察应用侧指标卡片组件在接入 BaseModal 后的布局表现。',
            metrics: [
              { label: '打开成功率', value: '99.2%', note: '最近 24 小时' },
              { label: '平均等待', value: '320ms', note: '队列峰值时段' },
              { label: '关闭耗时', value: '0.8s', note: '确认后回传结果' },
            ],
            defaultMetric: '平均等待',
            okText: '确认指标',
            cancelText: '稍后再看',
            size: 'medium',
            width: 720,
            centered: false,
          },
        ),
      ),
  },
  {
    label: '清单确认弹窗',
    componentLabel: 'ChecklistReviewModal',
    summary:
      '用 checklist 组件验证按钮样式透传，同时确认测试页确实在使用另一种完全不同的本地弹窗实现。',
    checks: ['checkbox list', 'okButtonReady=false', 'danger button'],
    open: () =>
      settleModal(
        openModal<ChecklistReviewModalRequest, ChecklistReviewModalResult>(
          ChecklistReviewModal,
          {
            title: '表单校验态',
            summary:
              '这个用例主要观察确定按钮置灰样式和危险态按钮配置，同时验证勾选型弹窗的确认结果。',
            items: ['已阅读弹窗契约', '已验证关闭路径', '已检查 Promise 结果'],
            initialChecked: ['已阅读弹窗契约'],
            okText: '继续提交',
            cancelText: '取消录入',
            okButtonReady: false,
            okButtonProps: {
              danger: true,
            },
          },
        ),
      ),
  },
]

const activityLogs = ref<string[]>([
  '点击任一用例后，这里会记录 Promise 的 resolve / reject 结果。',
])

const packageComponentVisible = ref(false)
const packageComponentProps: DemoActionModalRequest = {
  title: '组件包内置弹窗',
  description:
    '这个用例直接在页面里挂载 DemoActionModal 组件，用来验证组件形式的接入方式，而不是通过 openModal 命令式打开。',
  initialRemark: '默认备注：组件形式挂载',
  okText: '确认调用',
  cancelText: '返回列表',
  size: 'small',
}

const formatResultText = (result: SettledModalResult<DemoResult>): string => {
  const actionText = result.action === 'confirm' ? '确认关闭' : '取消关闭'

  if (!result.data) {
    return `${actionText}，未返回业务数据`
  }

  if ('kind' in result.data && result.data.kind === 'metrics') {
    return `${actionText}，kind=metrics，selected=${result.data.selectedMetric}，metricCount=${result.data.metricCount}，processedAt=${result.data.processedAt}`
  }

  if ('ticketId' in result.data) {
    const remarkText = result.data.remark || '（空）'
    return `${actionText}，kind=demo-action，ticketId=${result.data.ticketId}，status=${result.data.status}，operator=${result.data.operatorName}，remark=${remarkText}，processedAt=${result.data.processedAt}`
  }

  return `${actionText}，kind=checklist，completed=${result.data.completedCount}，items=${result.data.selectedItems.join(' / ') || '（空）'}，processedAt=${result.data.processedAt}`
}

const appendLog = (
  label: string,
  result: SettledModalResult<DemoResult>,
): void => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })

  activityLogs.value = [
    `${time} ${label} -> ${formatResultText(result)}`,
    ...activityLogs.value,
  ].slice(0, 12)
}

const openDemoCase = async (demoCase: DemoCase): Promise<void> => {
  const result = await demoCase.open()
  appendLog(demoCase.label, result)
}

const openPackageComponentDemo = (): void => {
  packageComponentVisible.value = true
}

const handlePackageComponentConfirm = (
  payload?: DemoActionModalResult,
): void => {
  packageComponentVisible.value = false
  appendLog('组件包组件挂载', {
    action: 'confirm',
    data: payload,
  })
}

const handlePackageComponentCancel = (): void => {
  packageComponentVisible.value = false
  appendLog('组件包组件挂载', {
    action: 'cancel',
    data: undefined,
  })
}

const openQueuedModals = async (): Promise<void> => {
  const queueTasks = [
    {
      label: '排队指标弹窗 #1',
      open: () =>
        settleModal(
          openModal<MetricsSnapshotModalRequest, MetricsSnapshotModalResult>(
            MetricsSnapshotModal,
            {
              title: '排队指标弹窗 #1',
              heading:
                '第一个排队弹窗使用指标卡片组件，确认 openModal 队列的第一项能正常打开。',
              metrics: [
                { label: '排队长度', value: '3', note: '含当前弹窗' },
                { label: '组件类型', value: 'metrics', note: '第 1 个' },
              ],
              defaultMetric: '排队长度',
              okText: '继续处理',
              cancelText: '取消队列',
              size: 'small',
            },
          ),
        ),
    },
    {
      label: '排队清单弹窗 #2',
      open: () =>
        settleModal(
          openModal<ChecklistReviewModalRequest, ChecklistReviewModalResult>(
            ChecklistReviewModal,
            {
              title: '排队清单弹窗 #2',
              summary:
                '第二个弹窗切换成 checklist 组件，确认队列中切换不同组件不会互相污染。',
              items: ['第 1 项已关闭', '组件已切换', '日志待记录'],
              initialChecked: ['第 1 项已关闭'],
              okText: '继续处理',
              cancelText: '取消队列',
              size: 'small',
            },
          ),
        ),
    },
    {
      label: '排队指标弹窗 #3',
      open: () =>
        settleModal(
          openModal<MetricsSnapshotModalRequest, MetricsSnapshotModalResult>(
            MetricsSnapshotModal,
            {
              title: '排队指标弹窗 #3',
              heading:
                '第三个弹窗再切回指标组件，并额外放大宽度验证不同 props 不会串台。',
              metrics: [
                { label: '队列顺序', value: '正常', note: '第 3 个展示' },
                { label: '宽度透传', value: '680', note: '额外放大' },
              ],
              defaultMetric: '宽度透传',
              okText: '完成队列',
              cancelText: '取消队列',
              size: 'medium',
              width: 680,
            },
          ),
        ),
    },
  ]

  await Promise.all(
    queueTasks.map(async (task) => {
      const result = await task.open()
      appendLog(task.label, result)
      return result
    }),
  )
}
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#edf5ff_100%)] px-5 py-6 text-[#16324a] md:px-8 md:py-8"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(28,157,255,0.18),transparent_28%)]"
    />

    <div class="relative mx-auto flex max-w-6xl flex-col gap-5">
      <section class="page-surface p-7">
        <p
          class="mb-2.5 text-[0.85rem] font-bold uppercase tracking-[0.08em] text-[#2f6fed]"
        >
          vue3-history / Modal
        </p>
        <h1 class="text-[clamp(1.8rem,4vw,2.5rem)] font-semibold">
          应用侧 openModal 测试页
        </h1>
        <p class="mt-3 max-w-3xl text-[#53708d]">
          页面内现在同时保留 `DemoActionModal` 的两种接入方式：一条走
          `openModal(ModalEnum.DemoActionModal)`，另一条走组件直接挂载；另外还保留
          2 个应用侧本地弹窗组件的 `openModal`
          测试。这样能并排验证命令式与组件式两套用法。
        </p>
      </section>

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article class="page-surface p-6">
          <div class="flex flex-col gap-3">
            <h2 class="text-[1.15rem] font-semibold">应用侧测试用例</h2>
            <p class="text-sm leading-6 text-[#5a738e]">
              这里同时保留组件包 `DemoActionModal`
              的命令式和组件式测试，再配合应用侧组件用例一起验证。
            </p>
          </div>

          <div class="mt-6 grid grid-cols-1 gap-4">
            <section class="case-card">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h3 class="case-card__title">组件包组件挂载</h3>
                <span class="status-tag">DemoActionModal</span>
              </div>

              <p class="case-card__summary">
                这里直接在页面里挂载 `packages/components` 导出的
                `DemoActionModal` 组件，用组件形式验证包内弹窗，而不是通过
                `openModal` 命令式打开。
              </p>

              <div class="case-chip-list">
                <span class="case-chip">component mount</span>
                <span class="case-chip">package component</span>
                <span class="case-chip">structured response</span>
              </div>

              <button
                type="button"
                class="action--primary"
                @click="openPackageComponentDemo"
              >
                打开组件包组件挂载
              </button>
            </section>

            <section
              v-for="demoCase in demoCases"
              :key="demoCase.label"
              class="case-card"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h3 class="case-card__title">{{ demoCase.label }}</h3>
                <span class="status-tag">{{ demoCase.componentLabel }}</span>
              </div>

              <p class="case-card__summary">
                {{ demoCase.summary }}
              </p>

              <div class="case-chip-list">
                <span
                  v-for="check in demoCase.checks"
                  :key="check"
                  class="case-chip"
                >
                  {{ check }}
                </span>
              </div>

              <button
                type="button"
                :class="
                  demoCase.tone === 'primary'
                    ? 'action--primary'
                    : 'action--ghost'
                "
                @click="openDemoCase(demoCase)"
              >
                打开 {{ demoCase.label }}
              </button>
            </section>
          </div>

          <div class="tips-panel mt-6">
            <div class="flex items-center justify-between gap-3">
              <p class="tips-title">串行队列验证</p>
              <button
                type="button"
                class="action--ghost action--inline"
                @click="openQueuedModals"
              >
                连续打开 3 个排队弹窗
              </button>
            </div>
            <p>
              1. 队列按钮会按顺序打开命令式 `openModal`
              用例，并在不同应用侧组件之间切换。
            </p>
            <p>
              2. 第 3 个队列用例额外放大宽度，方便观察 props
              在不同组件间是否互不污染。
            </p>
            <p>
              3. 日志区会按不同 `kind`
              输出各自的结果摘要，组件挂载用例也会记录在这里。
            </p>
          </div>
        </article>

        <article class="page-surface p-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-[1.15rem] font-semibold">最近结果</h2>
            <span class="status-tag">Promise 回传日志</span>
          </div>

          <div class="log-list mt-5">
            <p
              v-for="(item, index) in activityLogs"
              :key="`${item}-${index}`"
              class="log-item"
            >
              {{ item }}
            </p>
          </div>
        </article>
      </section>
    </div>
  </div>

  <DemoActionModal
    v-if="packageComponentVisible"
    v-bind="packageComponentProps"
    :onOk="handlePackageComponentConfirm"
    :onCancel="handlePackageComponentCancel"
  />
</template>

<style scoped>
.page-surface {
  position: relative;
  overflow: hidden;
  background: rgb(255 255 255 / 88%);
  border: 1px solid rgb(203 218 235 / 78%);
  border-radius: 28px;
  box-shadow:
    0 24px 60px rgb(26 71 122 / 10%),
    inset 0 1px 0 rgb(255 255 255 / 68%);
  backdrop-filter: blur(12px);
}

.case-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
  border: 1px solid #d9e6f4;
  border-radius: 24px;
}

.case-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #173754;
}

.case-card__summary {
  margin: 0;
  line-height: 1.7;
  color: #53708d;
}

.case-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-chip {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #2d5a82;
  background: #edf5ff;
  border-radius: 999px;
}

.action--primary,
.action--ghost {
  padding: 14px 18px;
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  border-radius: 18px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.action--primary {
  color: #fff;
  background: linear-gradient(135deg, #2f6fed 0%, #1c9dff 100%);
  border: none;
  box-shadow: 0 16px 30px rgb(47 111 237 / 20%);
}

.action--ghost {
  color: #20466d;
  background: #f5f9ff;
  border: 1px solid #d5e3f3;
}

.action--inline {
  padding: 10px 14px;
  text-align: center;
}

.action--primary:hover,
.action--ghost:hover {
  transform: translateY(-1px);
}

.tips-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  background: linear-gradient(180deg, #f7fbff 0%, #edf5ff 100%);
  border: 1px solid #d9e8f8;
  border-radius: 22px;
}

.tips-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #20466d;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-item {
  padding: 14px 16px;
  margin: 0;
  line-height: 1.65;
  color: #35536f;
  background: #f8fbff;
  border: 1px solid #dce8f5;
  border-radius: 18px;
}

.status-tag {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #2f6fed;
  background: rgb(47 111 237 / 10%);
  border-radius: 999px;
}
</style>
