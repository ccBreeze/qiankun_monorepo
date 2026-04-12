<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { requestRemoveTabByRoute } from '@breeze/bridge-vue'

defineOptions({
  name: 'KeepAliveDemo',
})

const router = useRouter()
const route = useRoute()

const keyword = ref('')
const remark = ref('切到案例 B 后再回来，这里的输入内容会被共用。')
const counter = ref(1)
const activationCount = ref(0)
const sessionId = `KA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const lifecycleLogs = ref<string[]>([])
const currentCaseId = computed(() =>
  typeof route.query.id === 'string' ? route.query.id : '1',
)

const pushLog = (message: string) => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  lifecycleLogs.value = [`${time} ${message}`, ...lifecycleLogs.value].slice(
    0,
    6,
  )
}

const resetState = () => {
  keyword.value = ''
  remark.value = ''
  counter.value = 0
  pushLog('手动重置了当前页面状态')
}

const goNativeCase = (id: string) => {
  void router.push({
    path: '/KeepAliveDemo',
    query: {
      id,
    },
  })
}

// ─── 路径规范化演示 ────────────────────────────────────────────────────────────

const paramOrderA = '?id=1&type=coupon'
const paramOrderB = '?type=coupon&id=1'

const resolvedA = computed(
  () => router.resolve(`/KeepAliveDemo${paramOrderA}`).fullPath,
)
const resolvedB = computed(
  () => router.resolve(`/KeepAliveDemo${paramOrderB}`).fullPath,
)
const isSameAfterResolve = computed(() => resolvedA.value === resolvedB.value)

const goWithParams = (order: 'a' | 'b') => {
  void router.push(`/KeepAliveDemo${order === 'a' ? paramOrderA : paramOrderB}`)
}

const requestClose = (to?: string) => {
  requestRemoveTabByRoute({
    router,
    fullPath: to ?? route.fullPath,
  })
  pushLog(`请求主应用 removeTab: ${router.resolve(to ?? route.fullPath).href}`)
}

const requestCloseCurrentTab = () => {
  requestClose()
}

// ─── 动态 tabName 演示 ──────────────────────────────────────────────────────────

const goDetailWithTabName = () => {
  void router.push({
    path: '/KeepAliveDemo/Detail',
    state: { tabName: '自定义标签名' },
  })
}

const requestCloseTabByOrder = (order: 'a' | 'b') => {
  const params = order === 'a' ? paramOrderA : paramOrderB
  requestClose(`/KeepAliveDemo${params}`)
}

pushLog('页面实例已创建，可开始切换验证缓存')

onActivated(() => {
  activationCount.value += 1
  pushLog(`第 ${activationCount.value} 次激活页面`)
})

onDeactivated(() => {
  pushLog('离开当前页，实例进入缓存')
})

watch(
  () => route.fullPath,
  (fullPath, oldFullPath) => {
    if (!oldFullPath) return

    pushLog(`路由切换：${oldFullPath} -> ${fullPath}`)
  },
)
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f6fbff_0%,#eef4ff_100%)] px-5 py-5 text-[#13304a] md:px-8 md:py-8"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(28,201,255,0.18),transparent_28%)]"
    />

    <div class="relative mx-auto flex max-w-7xl flex-col gap-5">
      <section class="page-surface p-7">
        <p
          class="mb-2.5 text-[0.85rem] font-bold uppercase tracking-[0.08em] text-[#2f6fed]"
        >
          vue3-history / KeepAlive
        </p>
        <h1 class="text-[clamp(1.8rem,4vw,2.4rem)] font-semibold">
          KeepAlive 测试页
        </h1>
        <p class="mt-3 text-[#4a6580]">
          这个页面当前直接运行在 Vue 原生 KeepAlive
          写法下，用来复现同组件不同参数共用一份缓存的限制。
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <span class="status-tag status-tag-native">
            当前直接使用原生 KeepAlive
          </span>
          <span class="text-sm text-[#5a738e]">
            当前案例：`id={{ currentCaseId }}`
          </span>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <button
            class="primary-button"
            type="button"
            @click="$router.push('/KeepAliveDemo/Detail')"
          >
            前往详情页
          </button>
          <button
            class="primary-button"
            type="button"
            @click="goDetailWithTabName"
          >
            带自定义标签名跳详情
          </button>
          <button class="ghost-button" type="button" @click="counter += 1">
            计数 +1
          </button>
          <button class="ghost-button" type="button" @click="resetState">
            重置当前页
          </button>
          <button
            class="ghost-button"
            type="button"
            @click="requestCloseCurrentTab"
          >
            请求关闭当前 Tab
          </button>
        </div>
      </section>

      <section class="page-surface p-6">
        <div
          class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 class="text-[1.1rem] font-semibold">
              Vue 原生 KeepAlive 限制模拟
            </h2>
            <p class="mt-2 text-sm text-[#5a738e]">
              当前 `App.vue` 已直接改成原生 KeepAlive 写法，
              `/KeepAliveDemo?id=1` 和 `?id=2` 会共用同一个组件实例。
            </p>
          </div>
          <span class="text-sm text-[#5a738e]">
            目标：观察两个案例是否串用同一份输入状态
          </span>
        </div>

        <div class="mb-4 flex flex-wrap gap-3">
          <button class="ghost-button" type="button" @click="goNativeCase('1')">
            进入案例 A
          </button>
          <button class="ghost-button" type="button" @click="goNativeCase('2')">
            进入案例 B
          </button>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="rounded-[18px] bg-[#f4f8ff] p-[18px]">
            <p class="text-sm font-semibold text-[#20466d]">建议操作</p>
            <p class="mt-3 text-[0.95rem] text-[#5a738e]">
              1. 先进入案例 A，输入“案例 A 草稿”
            </p>
            <p class="mt-2 text-[0.95rem] text-[#5a738e]">
              2. 再切到案例 B，观察输入框是否直接带出 A 的内容
            </p>
            <p class="mt-2 text-[0.95rem] text-[#5a738e]">
              3. 在 B 中继续修改后切回 A，如果内容被 B
              覆盖，就说明命中了原生限制
            </p>
          </div>
          <div class="rounded-[18px] bg-[#f4f8ff] p-[18px]">
            <p class="text-sm font-semibold text-[#20466d]">当前判断</p>
            <p class="mt-3 text-[0.95rem] text-[#5a738e]">
              现在切换 id=1 / id=2 时看到的是同一个页面实例，重点观察
              `sessionId` 是否保持不变，以及输入内容是否被共用。
            </p>
            <p class="mt-2 text-[0.95rem] text-[#5a738e]">
              当前路由参数 id = <strong>{{ currentCaseId }}</strong>
            </p>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article class="page-surface p-5 sm:p-[22px]">
          <span class="block text-[0.95rem] text-[#67809a]">实例标识</span>
          <strong class="mt-2.5 block break-all text-2xl font-semibold">
            {{ sessionId }}
          </strong>
        </article>
        <article class="page-surface p-5 sm:p-[22px]">
          <span class="block text-[0.95rem] text-[#67809a]">激活次数</span>
          <strong class="mt-2.5 block text-2xl font-semibold">
            {{ activationCount }}
          </strong>
        </article>
        <article class="page-surface p-5 sm:p-[22px]">
          <span class="block text-[0.95rem] text-[#67809a]">当前计数</span>
          <strong class="mt-2.5 block text-2xl font-semibold">
            {{ counter }}
          </strong>
        </article>
      </section>

      <section class="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article class="page-surface p-6">
          <div
            class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <h2 class="text-[1.1rem] font-semibold">表单</h2>
            <span class="text-sm text-[#5a738e]">{{ route.fullPath }}</span>
          </div>

          <div class="space-y-[18px]">
            <label class="block">
              <span class="mb-2 block font-bold">活动关键字</span>
              <input
                v-model="keyword"
                class="field-input"
                type="text"
                placeholder="输入任意内容"
              />
            </label>

            <label class="block">
              <span class="mb-2 block font-bold">备注</span>
              <textarea
                v-model="remark"
                class="field-input min-h-[120px] resize-y"
                placeholder="写点内容再切页"
              />
            </label>
          </div>
        </article>

        <article class="page-surface p-6">
          <div
            class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <h2 class="text-[1.1rem] font-semibold">日志</h2>
            <span class="text-sm text-[#5a738e]">看激活和返回记录</span>
          </div>

          <div class="rounded-[18px] bg-[#f4f8ff] p-[18px]">
            <p
              v-for="log in lifecycleLogs"
              :key="log"
              class="mt-2.5 text-[0.95rem] text-[#5a738e]"
            >
              {{ log }}
            </p>
            <p
              v-if="!lifecycleLogs.length"
              class="text-[0.95rem] text-[#5a738e]"
            >
              暂无日志
            </p>
          </div>
        </article>
      </section>

      <!-- 路径规范化演示 -->
      <section class="page-surface p-6">
        <div
          class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <h2 class="text-[1.1rem] font-semibold">路径规范化演示</h2>
        </div>

        <div class="mb-4 flex flex-wrap gap-3">
          <button class="ghost-button" type="button" @click="goWithParams('a')">
            进入顺序 A
          </button>
          <button class="ghost-button" type="button" @click="goWithParams('b')">
            进入顺序 B
          </button>
          <button
            class="primary-button"
            type="button"
            @click="requestCloseTabByOrder('a')"
          >
            关闭顺序 A
          </button>
          <button
            class="primary-button"
            type="button"
            @click="requestCloseTabByOrder('b')"
          >
            关闭顺序 B
          </button>
        </div>

        <div
          class="rounded-[18px] bg-[#f4f8ff] p-[18px] font-mono text-[0.85rem] leading-8"
        >
          <p>
            <span class="mr-2 text-[#67809a]">当前 fullPath</span>
            <span class="font-semibold">{{ route.fullPath }}</span>
          </p>
          <p>
            <span class="mr-2 text-[#67809a]">resolve(A)</span>
            <span class="font-semibold">{{ resolvedA }}</span>
          </p>
          <p>
            <span class="mr-2 text-[#67809a]">resolve(B)</span>
            <span class="font-semibold">{{ resolvedB }}</span>
          </p>
          <p class="mt-3 border-t border-[#d8e8ff] pt-3">
            <span class="mr-2 text-[#67809a]">归一化结果</span>
            <span
              :class="isSameAfterResolve ? 'text-green-600' : 'text-red-500'"
              class="font-bold"
            >
              {{ isSameAfterResolve ? '✓ 相同' : '✗ 不同' }}
            </span>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-surface {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(137, 185, 255, 0.28);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(25, 58, 120, 0.08);
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
  background: linear-gradient(135deg, #2f6fed 0%, #1d9bf0 100%);
  box-shadow: 0 12px 24px rgba(47, 111, 237, 0.24);
}

.ghost-button {
  color: #20466d;
  background: #edf4ff;
}

.field-input {
  width: 100%;
  padding: 0.75rem 14px;
  color: inherit;
  outline: none;
  background: #f8fbff;
  border: 1px solid #c9d8f0;
  border-radius: 1rem;
  transition:
    border-color 0.2s ease-out,
    box-shadow 0.2s ease-out;

  &:focus {
    border-color: #2f6fed;
    box-shadow: 0 0 0 4px rgba(47, 111, 237, 0.18);
  }
}

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 9999px;
}

.status-tag-native {
  color: #7a3f00;
  background: #ffe8cc;
}
</style>
