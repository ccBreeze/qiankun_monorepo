<script setup lang="ts">
import { ref } from 'vue'
import { loginApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

/** 演示账户类型 */
interface DemoAccount {
  username: string
  password: string
  label: string
}

/** 快速登录用的演示账号（与 mock-server 保持一致） */
const demoAccounts: DemoAccount[] = [
  {
    username: 'breeze',
    password: 'admin123',
    label: '运营商管理员',
  },
]

const loading = ref(false)

// 快速登录
async function quickLogin(account: (typeof demoAccounts)[0]) {
  if (loading.value) return
  loading.value = true

  const data = await loginApi({
    username: account.username,
    password: account.password,
  }).finally(() => {
    loading.value = false
  })

  useAuthStore().authLogin(data)
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo 区域 -->
      <div class="mb-8 text-center">
        <div class="mb-4 flex items-center justify-center gap-2">
          <span class="brand-icon" aria-hidden="true">🚀</span>
          <span class="logo-text">Qiankun</span>
        </div>
        <h1 class="mb-2 text-xl font-semibold text-slate-800">
          微前端管理系统
        </h1>
        <p class="text-sm text-slate-500">点击下方账号快速登录</p>
      </div>

      <!-- 快速登录 -->
      <div class="flex flex-col gap-3">
        <button
          v-for="account in demoAccounts"
          :key="account.username"
          type="button"
          class="login-button"
          :disabled="loading"
          @click="quickLogin(account)"
        >
          <span v-if="loading" class="inline-flex items-center gap-2">
            <span class="loading-spinner" />
            <span class="text-sm font-semibold">登录中…</span>
          </span>
          <template v-else>
            <span class="user-avatar">
              {{ account.username.charAt(0).toUpperCase() }}
            </span>
            <span class="flex flex-col items-start">
              <span class="text-[15px] font-semibold">{{
                account.username
              }}</span>
              <span class="text-xs opacity-80">{{ account.label }}</span>
            </span>
          </template>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@reference "tailwindcss";

.login-page {
  @apply relative flex min-h-screen items-center justify-center overflow-hidden p-6;

  background:
    radial-gradient(
      900px 520px at 18% 18%,
      rgb(255 255 255 / 28%) 0%,
      transparent 60%
    ),
    radial-gradient(
      900px 520px at 82% 86%,
      rgb(59 130 246 / 28%) 0%,
      transparent 55%
    ),
    linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-page::before {
  content: '';
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(
      circle at 25% 30%,
      rgb(34 211 238 / 22%) 0%,
      transparent 55%
    ),
    radial-gradient(
      circle at 70% 60%,
      rgb(168 85 247 / 26%) 0%,
      transparent 55%
    );
  filter: blur(46px);
  opacity: 0.9;
  pointer-events: none;
  transform: translate3d(0, 0, 0);
}

.login-container {
  @apply relative w-full max-w-[420px] rounded-3xl border border-white/40 bg-white/90 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl;
}

@media (width >= 640px) {
  .login-container {
    padding: calc(var(--spacing, 0.25rem) * 10);
  }
}

.login-container::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    880px 260px at 50% 0%,
    rgb(99 102 241 / 16%) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
}

.login-container > * {
  position: relative;
  z-index: 1;
}

.brand-icon {
  @apply flex size-11 items-center justify-center rounded-2xl bg-white/50 text-2xl shadow-sm ring-1 ring-black/5 backdrop-blur;
}

.logo-text {
  @apply text-3xl font-bold;

  background: linear-gradient(135deg, #4f46e5 0%, #a855f7 70%);
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-button {
  @apply flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/20 px-4 py-3 text-left text-base font-medium text-white transition-all duration-300;
  @apply disabled:cursor-not-allowed disabled:opacity-70;

  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  &:hover:not(:disabled) {
    @apply -translate-y-0.5 shadow-lg;

    box-shadow: 0 8px 24px rgb(102 126 234 / 40%);
  }

  &:active:not(:disabled) {
    @apply translate-y-0;
  }

  &:focus-visible {
    @apply outline-none ring-4 ring-white/40;
  }
}

.loading-spinner {
  @apply size-5 animate-spin rounded-full border-2 border-white border-t-transparent;
}

.user-avatar {
  @apply flex size-10 items-center justify-center rounded-full bg-white/20 text-base font-semibold ring-1 ring-white/30;
}
</style>
