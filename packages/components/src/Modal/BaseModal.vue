<template>
  <a-modal
    v-bind="$attrs"
    v-model:open="open"
    :centered="centered"
    :width="width"
    :bodyStyle="bodyStyle"
    :confirmLoading="confirmLoading"
    class="pack-modal"
    :class="[
      `pack-modal--${size}`,
      {
        'pack-modal--ok-invalid': !okButtonReady,
      },
    ]"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope || {}" />
    </template>
  </a-modal>
</template>

<script lang="ts">
import type { ModalProps } from 'ant-design-vue'

/** 通用弹窗尺寸,width 为 a-modal 宽度,minHeight 作用于 .ant-modal-body */
export const MODAL_SIZES = {
  tips: { width: 400, minHeight: 84 },
  small: { width: 536, minHeight: 260 },
  medium: { width: 776, minHeight: 420 },
  large: { width: 1056, minHeight: 476 },
} as const

/** BaseModal 自身定义/重写的 props */
export interface BaseModalOwnProps extends Pick<
  ModalProps,
  'centered' | 'width' | 'bodyStyle'
> {
  /** form 必填项没有填完，时按钮置灰但仍可点击（业务层拦截校验 form 后提示） */
  okButtonReady?: boolean
  /** 弹窗尺寸预设,决定 width 与 minHeight */
  size?: keyof typeof MODAL_SIZES
  onCancel?: () => unknown
  onOk?: () => unknown
}

/**
 * 透传给底层 a-modal 的剩余 props。
 * 已剔除:BaseModalOwnProps 重写的字段、由 BaseModal 内部接管的字段(confirmLoading / bodyStyle / open)。
 */
export type BaseModalPassthroughProps = Omit<
  ModalProps,
  keyof BaseModalOwnProps | 'confirmLoading' | 'open'
>

/** BaseModal 完整 Props 契约 = 自身 props + 透传给 a-modal 的 props */
export type BaseModalProps = BaseModalOwnProps & BaseModalPassthroughProps
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Modal as AModal } from 'ant-design-vue'

const props = withDefaults(defineProps<BaseModalOwnProps>(), {
  okButtonReady: true,
  size: 'small',
  // 覆盖默认配置
  centered: true,
  width: undefined,
  bodyStyle: undefined,
  onCancel: undefined,
  onOk: undefined,
})

const open = ref(true)

const width = computed(() => props.width ?? MODAL_SIZES[props.size].width)
const bodyStyle = computed(() => ({
  minHeight: `${MODAL_SIZES[props.size].minHeight}px`,
  ...props.bodyStyle,
}))

const confirmLoading = ref(false)
const runAction = (action?: () => unknown) => async () => {
  if (confirmLoading.value) return
  confirmLoading.value = true
  try {
    await action?.()
    open.value = false
  } finally {
    confirmLoading.value = false
  }
}
const handleOk = runAction(props.onOk)
const handleCancel = runAction(props.onCancel)
</script>

<style lang="scss">
/* a-modal 会 teleport 到 body,这里的规则作用于外部 DOM,靠 .pack-modal 类前缀隔离 */
.pack-modal {
  /* 超长滚动 */
  .ant-modal-content {
    padding: 24px 24px 16px;
    margin: 80px 0;
  }

  .ant-modal-close {
    inset-inline-end: 24px;
    top: 28px;

    &:hover {
      background-color: transparent;
    }
  }

  /** 取消按钮 */
  .ant-modal-footer .ant-btn-default:not(:hover) {
    color: rgb(22 35 61 / 65%);
  }

  /** 确定按钮 - 无效（可点击）状态 */
  &--ok-invalid .ant-modal-footer .ant-btn-primary {
    background: rgb(22 35 61 / 15%);
  }
}
</style>
