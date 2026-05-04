<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n({ useScope: 'global' })

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

const demoCases = computed<DemoCase[]>(() => [
  {
    label: t('views.Modal.cases.packageImperative.label'),
    componentLabel: t('views.Modal.cases.packageImperative.componentLabel'),
    summary: t('views.Modal.cases.packageImperative.summary'),
    checks: [
      t('views.Modal.cases.packageImperative.checks.openModal'),
      t('views.Modal.cases.packageImperative.checks.modalEnum'),
      t('views.Modal.cases.packageImperative.checks.packageComponent'),
    ],
    open: () =>
      settleModal(
        openModal(ModalEnum.DemoActionModal, {
          title: t('views.Modal.cases.packageImperative.modal.title'),
          description: t(
            'views.Modal.cases.packageImperative.modal.description',
          ),
          initialRemark: t(
            'views.Modal.cases.packageImperative.modal.initialRemark',
          ),
          okText: t('views.Modal.cases.packageImperative.modal.okText'),
          cancelText: t('views.Modal.cases.packageImperative.modal.cancelText'),
          size: 'small',
        }),
      ),
  },
  {
    label: t('views.Modal.cases.metrics.label'),
    componentLabel: t('views.Modal.cases.metrics.componentLabel'),
    summary: t('views.Modal.cases.metrics.summary'),
    checks: [
      t('views.Modal.cases.metrics.checks.layout'),
      t('views.Modal.cases.metrics.checks.size'),
      t('views.Modal.cases.metrics.checks.width'),
    ],
    open: () =>
      settleModal(
        openModal<MetricsSnapshotModalRequest, MetricsSnapshotModalResult>(
          MetricsSnapshotModal,
          {
            title: t('views.Modal.cases.metrics.modal.title'),
            heading: t('views.Modal.cases.metrics.modal.heading'),
            metrics: [
              {
                label: t('views.Modal.cases.metrics.metrics.successRate.label'),
                value: '99.2%',
                note: t('views.Modal.cases.metrics.metrics.successRate.note'),
              },
              {
                label: t('views.Modal.cases.metrics.metrics.averageWait.label'),
                value: '320ms',
                note: t('views.Modal.cases.metrics.metrics.averageWait.note'),
              },
              {
                label: t('views.Modal.cases.metrics.metrics.closeTime.label'),
                value: '0.8s',
                note: t('views.Modal.cases.metrics.metrics.closeTime.note'),
              },
            ],
            defaultMetric: t(
              'views.Modal.cases.metrics.metrics.averageWait.label',
            ),
            okText: t('views.Modal.cases.metrics.modal.okText'),
            cancelText: t('views.Modal.cases.metrics.modal.cancelText'),
            size: 'medium',
            width: 720,
            centered: false,
          },
        ),
      ),
  },
  {
    label: t('views.Modal.cases.checklist.label'),
    componentLabel: t('views.Modal.cases.checklist.componentLabel'),
    summary: t('views.Modal.cases.checklist.summary'),
    checks: [
      t('views.Modal.cases.checklist.checks.list'),
      t('views.Modal.cases.checklist.checks.ready'),
      t('views.Modal.cases.checklist.checks.danger'),
    ],
    open: () =>
      settleModal(
        openModal<ChecklistReviewModalRequest, ChecklistReviewModalResult>(
          ChecklistReviewModal,
          {
            title: t('views.Modal.cases.checklist.modal.title'),
            summary: t('views.Modal.cases.checklist.modal.summary'),
            items: [
              t('views.Modal.cases.checklist.modal.items.contract'),
              t('views.Modal.cases.checklist.modal.items.closePath'),
              t('views.Modal.cases.checklist.modal.items.promise'),
            ],
            initialChecked: [
              t('views.Modal.cases.checklist.modal.items.contract'),
            ],
            okText: t('views.Modal.cases.checklist.modal.okText'),
            cancelText: t('views.Modal.cases.checklist.modal.cancelText'),
            okButtonReady: false,
            okButtonProps: {
              danger: true,
            },
          },
        ),
      ),
  },
])

const activityLogs = ref<string[]>([])
const displayedActivityLogs = computed(() =>
  activityLogs.value.length > 0
    ? activityLogs.value
    : [t('views.Modal.logs.initial')],
)

const packageComponentVisible = ref(false)
const packageComponentProps = computed<DemoActionModalRequest>(() => ({
  title: t('views.Modal.mountedPackage.modal.title'),
  description: t('views.Modal.mountedPackage.modal.description'),
  initialRemark: t('views.Modal.mountedPackage.modal.initialRemark'),
  okText: t('views.Modal.mountedPackage.modal.okText'),
  cancelText: t('views.Modal.mountedPackage.modal.cancelText'),
  size: 'small',
}))

const formatResultText = (result: SettledModalResult<DemoResult>): string => {
  const actionText =
    result.action === 'confirm'
      ? t('views.Modal.logs.confirmAction')
      : t('views.Modal.logs.cancelAction')

  if (!result.data) {
    return t('views.Modal.logs.emptyData', { action: actionText })
  }

  if ('kind' in result.data && result.data.kind === 'metrics') {
    return t('views.Modal.logs.metrics', {
      action: actionText,
      selectedMetric: result.data.selectedMetric,
      metricCount: result.data.metricCount,
      processedAt: result.data.processedAt,
    })
  }

  if ('ticketId' in result.data) {
    const remarkText = result.data.remark || t('views.Modal.logs.empty')
    return t('views.Modal.logs.demoAction', {
      action: actionText,
      ticketId: result.data.ticketId,
      status: result.data.status,
      operatorName: result.data.operatorName,
      remark: remarkText,
      processedAt: result.data.processedAt,
    })
  }

  return t('views.Modal.logs.checklist', {
    action: actionText,
    completedCount: result.data.completedCount,
    items: result.data.selectedItems.join(' / ') || t('views.Modal.logs.empty'),
    processedAt: result.data.processedAt,
  })
}

const appendLog = (
  label: string,
  result: SettledModalResult<DemoResult>,
): void => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })

  activityLogs.value = [
    t('views.Modal.logs.entry', {
      time,
      label,
      result: formatResultText(result),
    }),
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
  appendLog(t('views.Modal.mountedPackage.label'), {
    action: 'confirm',
    data: payload,
  })
}

const handlePackageComponentCancel = (): void => {
  packageComponentVisible.value = false
  appendLog(t('views.Modal.mountedPackage.label'), {
    action: 'cancel',
    data: undefined,
  })
}

const openQueuedModals = async (): Promise<void> => {
  const queueTasks = [
    {
      label: t('views.Modal.queue.metricsFirst.label'),
      open: () =>
        settleModal(
          openModal<MetricsSnapshotModalRequest, MetricsSnapshotModalResult>(
            MetricsSnapshotModal,
            {
              title: t('views.Modal.queue.metricsFirst.title'),
              heading: t('views.Modal.queue.metricsFirst.heading'),
              metrics: [
                {
                  label: t(
                    'views.Modal.queue.metricsFirst.metrics.length.label',
                  ),
                  value: '3',
                  note: t('views.Modal.queue.metricsFirst.metrics.length.note'),
                },
                {
                  label: t('views.Modal.queue.metricsFirst.metrics.type.label'),
                  value: 'metrics',
                  note: t('views.Modal.queue.metricsFirst.metrics.type.note'),
                },
              ],
              defaultMetric: t('views.Modal.queue.metricsFirst.defaultMetric'),
              okText: t('views.Modal.queue.metricsFirst.okText'),
              cancelText: t('views.Modal.queue.metricsFirst.cancelText'),
              size: 'small',
            },
          ),
        ),
    },
    {
      label: t('views.Modal.queue.checklistSecond.label'),
      open: () =>
        settleModal(
          openModal<ChecklistReviewModalRequest, ChecklistReviewModalResult>(
            ChecklistReviewModal,
            {
              title: t('views.Modal.queue.checklistSecond.title'),
              summary: t('views.Modal.queue.checklistSecond.summary'),
              items: [
                t('views.Modal.queue.checklistSecond.items.closed'),
                t('views.Modal.queue.checklistSecond.items.switched'),
                t('views.Modal.queue.checklistSecond.items.pendingLog'),
              ],
              initialChecked: [
                t('views.Modal.queue.checklistSecond.items.closed'),
              ],
              okText: t('views.Modal.queue.checklistSecond.okText'),
              cancelText: t('views.Modal.queue.checklistSecond.cancelText'),
              size: 'small',
            },
          ),
        ),
    },
    {
      label: t('views.Modal.queue.metricsThird.label'),
      open: () =>
        settleModal(
          openModal<MetricsSnapshotModalRequest, MetricsSnapshotModalResult>(
            MetricsSnapshotModal,
            {
              title: t('views.Modal.queue.metricsThird.title'),
              heading: t('views.Modal.queue.metricsThird.heading'),
              metrics: [
                {
                  label: t(
                    'views.Modal.queue.metricsThird.metrics.order.label',
                  ),
                  value: t(
                    'views.Modal.queue.metricsThird.metrics.order.value',
                  ),
                  note: t('views.Modal.queue.metricsThird.metrics.order.note'),
                },
                {
                  label: t(
                    'views.Modal.queue.metricsThird.metrics.width.label',
                  ),
                  value: '680',
                  note: t('views.Modal.queue.metricsThird.metrics.width.note'),
                },
              ],
              defaultMetric: t('views.Modal.queue.metricsThird.defaultMetric'),
              okText: t('views.Modal.queue.metricsThird.okText'),
              cancelText: t('views.Modal.queue.metricsThird.cancelText'),
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
          {{ t('views.Modal.page.eyebrow') }}
        </p>
        <h1 class="text-[clamp(1.8rem,4vw,2.5rem)] font-semibold">
          {{ t('views.Modal.page.title') }}
        </h1>
        <p class="mt-3 max-w-3xl text-[#53708d]">
          {{ t('views.Modal.page.description') }}
        </p>
      </section>

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article class="page-surface p-6">
          <div class="flex flex-col gap-3">
            <h2 class="text-[1.15rem] font-semibold">
              {{ t('views.Modal.page.caseTitle') }}
            </h2>
            <p class="text-sm leading-6 text-[#5a738e]">
              {{ t('views.Modal.page.caseDescription') }}
            </p>
          </div>

          <div class="mt-6 grid grid-cols-1 gap-4">
            <section class="case-card">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h3 class="case-card__title">
                  {{ t('views.Modal.mountedPackage.label') }}
                </h3>
                <span class="status-tag">
                  {{ t('views.Modal.mountedPackage.componentLabel') }}
                </span>
              </div>

              <p class="case-card__summary">
                {{ t('views.Modal.mountedPackage.summary') }}
              </p>

              <div class="case-chip-list">
                <span class="case-chip">
                  {{ t('views.Modal.mountedPackage.checks.mount') }}
                </span>
                <span class="case-chip">
                  {{ t('views.Modal.mountedPackage.checks.component') }}
                </span>
                <span class="case-chip">
                  {{ t('views.Modal.mountedPackage.checks.response') }}
                </span>
              </div>

              <button
                type="button"
                class="action--primary"
                @click="openPackageComponentDemo"
              >
                {{ t('views.Modal.actions.openMountedPackage') }}
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
                {{
                  t('views.Modal.actions.openCase', { label: demoCase.label })
                }}
              </button>
            </section>
          </div>

          <div class="tips-panel mt-6">
            <div class="flex items-center justify-between gap-3">
              <p class="tips-title">{{ t('views.Modal.queue.title') }}</p>
              <button
                type="button"
                class="action--ghost action--inline"
                @click="openQueuedModals"
              >
                {{ t('views.Modal.actions.openQueued') }}
              </button>
            </div>
            <p>
              {{ t('views.Modal.queue.tips.order') }}
            </p>
            <p>
              {{ t('views.Modal.queue.tips.props') }}
            </p>
            <p>
              {{ t('views.Modal.queue.tips.logs') }}
            </p>
          </div>
        </article>

        <article class="page-surface p-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-[1.15rem] font-semibold">
              {{ t('views.Modal.page.resultTitle') }}
            </h2>
            <span class="status-tag">{{
              t('views.Modal.page.resultTag')
            }}</span>
          </div>

          <div class="log-list mt-5">
            <p
              v-for="(item, index) in displayedActivityLogs"
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
