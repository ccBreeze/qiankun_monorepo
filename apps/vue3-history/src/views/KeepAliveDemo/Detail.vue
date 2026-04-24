<script setup lang="ts">
import { onActivated, onDeactivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import { requestRemoveTabByRoute } from '@breeze/bridge-vue'

defineOptions({
  name: 'KeepAliveDemo-Detail',
})

const router = useRouter()

const draftTitle = ref('详情页缓存草稿')
const draftRemark = ref('从这里返回演示首页，再重新进入，当前草稿仍会存在。')
const localCounter = ref(2)
const activationCount = ref(0)
const sessionId = `DETAIL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const lifecycleLogs = ref<string[]>([])

const pushLog = (message: string) => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  lifecycleLogs.value = [`${time} ${message}`, ...lifecycleLogs.value].slice(
    0,
    6,
  )
}

const clearDraft = () => {
  draftTitle.value = ''
  draftRemark.value = ''
  localCounter.value = 0
  pushLog('清空了详情页本地状态')
}

/** 关闭当前页并跳回来源路由（来源由主应用 addTab 时记录） */
const closeAndGoBack = () => {
  requestRemoveTabByRoute({
    router,
    goToSource: true,
  })
  pushLog('请求主应用关闭并跳回来源')
}

pushLog('详情页实例已创建，等待切换验证缓存')

onActivated(() => {
  activationCount.value += 1
  pushLog(`第 ${activationCount.value} 次激活详情页`)
})

onDeactivated(() => {
  pushLog('详情页进入缓存')
})
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fffaf4_0%,#fff3e5_100%)] px-5 py-5 text-[#5a2d0c] md:px-8 md:py-8"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,170,94,0.18),transparent_30%)]"
    />

    <div class="relative mx-auto flex max-w-7xl flex-col gap-5">
      <section
        class="page-surface flex flex-col gap-5 p-7 xl:flex-row xl:items-start xl:justify-between"
      >
        <div>
          <p
            class="mb-2.5 text-[0.85rem] font-bold uppercase tracking-[0.08em] text-[#f26d21]"
          >
            KeepAlive Detail
          </p>
          <h1 class="text-[clamp(1.8rem,4vw,2.4rem)] font-semibold">
            详情页测试页
          </h1>
          <p class="mt-3 text-[#87563a]">
            返回首页后再次进入，确认草稿和计数是否保留。
          </p>
        </div>

        <div class="flex flex-wrap items-start gap-3">
          <button
            class="primary-button"
            type="button"
            @click="router.push('/KeepAliveDemo')"
          >
            返回演示首页
          </button>
          <button class="ghost-button" type="button" @click="localCounter += 1">
            计数 +1
          </button>
          <button class="ghost-button" type="button" @click="clearDraft">
            清空详情页
          </button>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article class="page-surface p-5 sm:p-[22px]">
          <span class="block text-[0.95rem] text-[#9a6848]">详情实例标识</span>
          <strong class="mt-2.5 block break-all text-2xl font-semibold">
            {{ sessionId }}
          </strong>
        </article>
        <article class="page-surface p-5 sm:p-[22px]">
          <span class="block text-[0.95rem] text-[#9a6848]">激活次数</span>
          <strong class="mt-2.5 block text-2xl font-semibold">
            {{ activationCount }}
          </strong>
        </article>
        <article class="page-surface p-5 sm:p-[22px]">
          <span class="block text-[0.95rem] text-[#9a6848]">本地计数</span>
          <strong class="mt-2.5 block text-2xl font-semibold">
            {{ localCounter }}
          </strong>
        </article>
      </section>

      <!-- 关闭并返回来源 -->
      <section class="page-surface p-6">
        <div
          class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <h2 class="text-[1.1rem] font-semibold">关闭并返回来源</h2>
          <span class="text-sm text-[#8a5d42]">
            来源由主应用 addTab 时记录，支持跨子应用
          </span>
        </div>

        <p class="mb-5 text-[0.85rem] text-[#8a5d42]">
          点击后主应用会关闭当前 tab
          并跳转到打开此页时的来源路由，即使来源是其他子应用也能正确跳转。
        </p>

        <button class="primary-button" type="button" @click="closeAndGoBack">
          关闭页面并返回来源
        </button>
      </section>

      <section class="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article class="page-surface p-6">
          <div
            class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <h2 class="text-[1.1rem] font-semibold">草稿</h2>
            <span class="text-sm text-[#8a5d42]">切页后应继续保留</span>
          </div>

          <div class="space-y-[18px]">
            <label class="block">
              <span class="mb-2 block font-bold">草稿标题</span>
              <input
                v-model="draftTitle"
                class="field-input"
                type="text"
                placeholder="输入详情页草稿标题"
              />
            </label>

            <label class="block">
              <span class="mb-2 block font-bold">草稿备注</span>
              <textarea
                v-model="draftRemark"
                class="field-input min-h-[120px] resize-y"
                placeholder="输入详情页备注"
              />
            </label>
          </div>
        </article>

        <article class="page-surface p-6">
          <div
            class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <h2 class="text-[1.1rem] font-semibold">日志</h2>
            <span class="text-sm text-[#8a5d42]">看激活和缓存记录</span>
          </div>

          <div class="rounded-[18px] bg-[#fff3e8] p-[18px]">
            <p
              v-for="log in lifecycleLogs"
              :key="log"
              class="mt-2.5 text-[0.95rem] text-[#8a5d42]"
            >
              {{ log }}
            </p>
            <p
              v-if="!lifecycleLogs.length"
              class="text-[0.95rem] text-[#8a5d42]"
            >
              暂无日志
            </p>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-surface {
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(255, 172, 93, 0.28);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(119, 52, 8, 0.08);
  backdrop-filter: blur(12px);
}

.primary-button,
.ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 18px;
  font-weight: 700;
  border-radius: 9999px;
  transition:
    transform 0.2s ease-out,
    background-color 0.2s ease-out,
    color 0.2s ease-out,
    box-shadow 0.2s ease-out;

  &:hover {
    transform: translateY(-2px);
  }
}

.primary-button {
  color: #fff;
  background: linear-gradient(135deg, #f26d21 0%, #ff9f43 100%);
  box-shadow: 0 12px 24px rgba(242, 109, 33, 0.24);
}

.ghost-button {
  color: #7c4518;
  background: #fff0df;
}

.field-input {
  width: 100%;
  padding: 0.75rem 14px;
  color: inherit;
  outline: none;
  background: #fffaf5;
  border: 1px solid #f0c8a3;
  border-radius: 1rem;
  transition:
    border-color 0.2s ease-out,
    box-shadow 0.2s ease-out;

  &:focus {
    border-color: #f26d21;
    box-shadow: 0 0 0 4px rgba(242, 109, 33, 0.18);
  }
}
</style>
