---
title: '@breeze/i18n'
outline: [2, 4]
---

# @breeze/i18n

`@breeze/i18n` 是基于 [vue-i18n](https://vue-i18n.intlify.dev/) 封装的应用级国际化工具包，提供统一的 i18n 实例初始化和语言包加载能力。

## 快速接入

### 使用 @breeze/components（推荐）

项目内所有应用统一通过 `@breeze/components` 提供的 `setupComponentsI18n` 接入 i18n，该函数会自动合并组件包语言包，并将 i18n 实例注入命令式 Modal。

**第一步：创建 `src/locales/index.ts`**

```ts [apps/main-app/src/locales/index.ts]
import { setupComponentsI18n } from '@breeze/components'
import type { I18nInstance } from '@breeze/i18n'
import type { App } from 'vue'

const localeModules = import.meta.glob('./**/*.json', {
  eager: true,
  import: 'default',
})

export let i18n: I18nInstance

export const setupLocaleMessages = (app: App) => {
  i18n = setupComponentsI18n(app, localeModules)
  return i18n
}
```

**第二步：在应用入口调用**

```ts [apps/main-app/src/main.ts]
import { setupLocaleMessages } from './locales'

const app = createApp(App)
app.use(createPinia())
app.use(router)

setupLocaleMessages(app) // [!code focus]

app.mount('#app')
```

**语言包目录结构**

```
src/locales/
├── zh-CN/
│   ├── menu.json
│   └── views/
│       └── HomeView.json
├── en/
│   ├── menu.json
│   └── views/
│       └── HomeView.json
└── index.ts
```

`import.meta.glob` 会自动扫描当前目录下所有 JSON 文件，路径中的目录层级会成为 vue-i18n message key 的命名空间。例如 `./zh-CN/views/HomeView.json` 中的内容会挂载到 `zh-CN` 语言下的 `views.HomeView` 命名空间。

**在组件中使用**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 在逻辑中使用
console.log(t('views.HomeView.title'))
</script>

<template>
  <!-- 在模板中使用全局 $t，无需导入 -->
  <h1>{{ $t('views.HomeView.title') }}</h1>
</template>
```

**在 `.ts` 文件中使用**

组合式函数或工具函数中可通过 `useI18n` 获取翻译函数，需在 `setup` 上下文内调用：

```ts
import { useI18n } from 'vue-i18n'

export function usePageTitle() {
  const { t } = useI18n()
  return computed(() => t('views.HomeView.title'))
}
```

在 `setup` 上下文之外（如路由守卫、store action），直接导入 `locales/index.ts` 导出的 `i18n` 实例：

```ts
import { i18n } from '@/locales'

// 路由守卫、store action 等非组件上下文中直接使用
i18n.global.t('views.HomeView.title')
```

### 直接使用 @breeze/i18n（无 @breeze/components 场景）

```ts
import { initI18n } from '@breeze/i18n'
import type { I18nInstance } from '@breeze/i18n'
import type { App } from 'vue'

const localeModules = import.meta.glob('./**/*.json', {
  eager: true,
  import: 'default',
})

export let i18n: I18nInstance

export const setupLocaleMessages = (app: App) => {
  i18n = initI18n({ app, localeModules })
  return i18n
}
```

## @breeze/components 集成

### setupComponentsI18n

`@breeze/components` 的 `setupComponentsI18n` 是项目内推荐的一站式 i18n 装配函数，在 `initI18n` 基础上额外做了两件事：

1. 自动合并组件包自身的语言包（以组件目录名 `Modal` / `Form.Field` 作为顶层 namespace）
2. 将 i18n 实例注入命令式 Modal 的独立 app，使弹窗内翻译和 antdv locale 与主应用保持一致

```ts [packages/components/src/locales/index.ts]
export const setupComponentsI18n = (
  app: App,
  localeModules: Record<string, unknown>,
) => {
  const i18n = initI18n({
    app,
    localeModules,
    baseMessages: componentBaseMessages, // [!code focus]
  })
  configureModalApp((subApp) => subApp.use(i18n)) // [!code focus]
  return i18n
}
```

命令式弹窗（`openModal`）运行在独立的 `createApp` 实例中，无法继承业务应用的 Vue 依赖注入链。通过 `configureModalApp` 将同一个 i18n 实例注入弹窗子应用，弹窗内的 `useI18n()` 无需任何额外配置即可直接使用。

### 组件包语言包

组件包内部的语言包采用**集中式**：统一放在 `packages/components/src/locales/{locale}/{ComponentName}.json`，与应用侧目录结构一致。

```
packages/components/src/
└── locales/
    ├── zh-CN/
    │   └── Modal.json
    ├── en/
    │   └── Modal.json
    └── index.ts                    # 装配出口
```

JSON 文件内容以组件功能 key 为顶层，文件名（如 `Modal.json`）即为命名空间：

```json [packages/components/src/locales/zh-CN/Modal.json]
{
  "DemoActionModal": {
    "remarkLabel": "处理备注"
  }
}
```

组件内通过 `t('Modal.DemoActionModal.remarkLabel')` 取值。

### antdv 与 dayjs locale 自动同步

```ts [packages/components/src/AntConfigProvider/locale.ts]
export function useAntdLocale() {
  const { locale } = useI18n({ useScope: 'global' })

  const antdLocale = ref<Locale>()

  watchEffect(() => {
    dayjs.locale(DAYJS_LOCALE_MAP[locale.value])
    antdLocale.value = ANTD_LOCALE_MAP[locale.value]
  })

  return { antdLocale }
}
```

## 主子应用语言同步

主应用切换语言时，通过 `@breeze/runtime` 的 `locale:change` 事件广播给所有已挂载的子应用，子应用通过 `@breeze/bridge-vue` 的 `useHostLocaleSync` 接收并同步。

### 运行时事件定义

```ts [packages/runtime/src/events.ts]
export const RUNTIME_EVENTS = {
  // ...
  /** 主应用语言变更时通知子应用同步语言 */
  LOCALE_CHANGE: 'locale:change',
} as const

export interface LocaleChangePayload {
  locale: string
}
```

### 主应用：发出语言切换事件

在语言切换组件中，切换 i18n 实例的 locale 后广播事件：

```ts [apps/main-app/src/utils/channel.ts]
import { qiankunRuntime, RUNTIME_EVENTS } from '@breeze/runtime'
import type { LocaleChangePayload } from '@breeze/runtime'

/** 通知所有子应用切换语言 */
export const emitLocaleChange = (payload: LocaleChangePayload) => {
  qiankunRuntime.channel.emit(RUNTIME_EVENTS.LOCALE_CHANGE, payload)
}
```

```ts [apps/main-app/src/components/MultipleLanguages/MultipleLanguages.vue]
import { useI18n } from 'vue-i18n'
import { I18N_LOCALE_STORAGE_KEY } from '@breeze/i18n'
import { emitLocaleChange } from '@/utils/channel'

const { locale } = useI18n({ useScope: 'global' })

const switchLocale = (nextLocale: string) => {
  locale.value = nextLocale
  localStorage.setItem(I18N_LOCALE_STORAGE_KEY, nextLocale)
  emitLocaleChange({ locale: nextLocale })
}
```

### 子应用：接收并同步

子应用在根组件 `setup` 阶段调用 `useHostLocaleSync`（由 `@breeze/bridge-vue` 提供），组件卸载时自动注销监听：

```ts [packages/bridge-vue/src/hostBridge/locale.ts]
/** 监听主应用语言变更，并同步到当前 Vue 应用的全局 i18n locale。 */
export const useHostLocaleSync = () => {
  const { locale, availableLocales } = useI18n({ useScope: 'global' })

  const handleLocaleChange = ({ locale: nextLocale }: LocaleChangePayload) => {
    if (!availableLocales.includes(nextLocale)) {
      console.warn(
        `[Breeze i18n] 当前子应用未提供 ${nextLocale} 语言包，已忽略切换`,
      )
      return
    }
    locale.value = nextLocale
  }

  qiankunRuntime.channel.on(RUNTIME_EVENTS.LOCALE_CHANGE, handleLocaleChange)
  onUnmounted(() => {
    qiankunRuntime.channel.off(RUNTIME_EVENTS.LOCALE_CHANGE, handleLocaleChange)
  })
}
```

在子应用根组件中接入：

```vue [apps/vue3-history/src/App.vue]
<script setup lang="ts">
import { useHostLocaleSync } from '@breeze/bridge-vue'

useHostLocaleSync()
</script>
```

:::tip 未提供的语言包
若主应用切换到某语言，而子应用未提供该语言包，`useHostLocaleSync` 会忽略此次切换并输出警告，子应用保持当前语言不变。
:::

## 语言包命名空间规则

`createLocaleMessages` 将 glob 路径转换为 vue-i18n messages 时遵循以下规则：

- 路径格式：`./{locale}/{namespace}.json`
- 语言 key：路径中第一级目录（如 `zh-CN`、`en`）
- 消息 key：去掉语言目录和 `.json` 后缀后的路径会按目录层级写入嵌套对象（如 `views.HomeView`、`menu`）

```
./zh-CN/menu.json            → zh-CN.menu.*
./zh-CN/views/HomeView.json  → zh-CN.views.HomeView.*
./en/menu.json               → en.menu.*
```

:::warning 命名冲突
同一语言下若存在两个路径最终解析到相同 key，后者会覆盖前者并输出 `[Breeze i18n] 语言模块 {key} 重复，已被覆盖` 警告。请确保语言包文件路径唯一。
:::

`@breeze/components` 直接以组件目录名（如 `Modal`、`Form.Field`）作为顶层 namespace，与应用侧 key（`views.*`、`menu` 等小写命名）天然不冲突，无需额外前缀。装配逻辑集中在 `packages/components/src/locales/index.ts`，JSON 文件保持干净。

## API

### 常量

| 常量                      | 值               | 说明                            |
| ------------------------- | ---------------- | ------------------------------- |
| `DEFAULT_LOCALE`          | `'zh-CN'`        | 默认语言                        |
| `I18N_LOCALE_STORAGE_KEY` | `'i18n__locale'` | localStorage 存储语言偏好的 key |

---

### 类型

```ts
type I18nInstance = ReturnType<typeof createI18n>

interface CreateLocaleMessagesOptions {
  localeModules: Record<string, unknown>
}
```

## VS Code i18n-ally 配置

[i18n-ally](https://github.com/lokalise/i18n-ally/wiki) 支持悬浮预览翻译、跳转到语言包、缺译扫描等。直接用 VS Code **打开仓库根目录文件夹**即可，配置已统一写在根目录 `.vscode/settings.json`：

```json [.vscode/settings.json]
{
  "i18n-ally.localesPaths": ["apps/*/src/locales", "packages/*/src/locales"],
  "i18n-ally.namespace": true,
  "i18n-ally.pathMatcher": "{locale}/{namespaces}.json",
  "i18n-ally.keystyle": "nested",
  "i18n-ally.displayLanguage": "zh-CN",
  "i18n-ally.sourceLanguage": "zh-CN",
  "i18n-ally.enabledFrameworks": ["vue", "general"],
  "i18n-ally.annotationInPlace": true
}
```

| 配置项              | 值                           | 说明                                                                        |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `localesPaths`      | glob 数组                    | 语言包根目录，支持 glob；覆盖所有 apps / packages，新增子应用无需手动维护   |
| `namespace`         | `true`                       | 启用命名空间模式，文件名（如 `menu.json`）作为 key 前缀                     |
| `pathMatcher`       | `{locale}/{namespaces}.json` | 文件路径解析规则，与 `src/locales/{locale}/{namespace}.json` 的目录结构对应 |
| `keystyle`          | `nested`                     | key 样式为嵌套对象（`a.b.c`），与 vue-i18n `nested` 模式一致                |
| `displayLanguage`   | `zh-CN`                      | 编辑器内悬浮提示显示的语言                                                  |
| `sourceLanguage`    | `zh-CN`                      | 基准语言，缺译扫描以此为参照；默认为 `en`，项目以 zh-CN 为源语言需显式设置  |
| `enabledFrameworks` | `["vue", "general"]`         | 启用的框架解析器，`vue` 识别 `.vue` 文件，`general` 覆盖 `.ts`/`.tsx` 等    |
| `annotationInPlace` | `true`                       | 注解原位替换 key 显示（默认 `false` 为行尾显示）                            |

:::tip monorepo 中的多项目配置参考
在单个 VS Code 窗口中管理 monorepo 多项目的 i18n-ally，可参考 [lokalise/i18n-ally#1160](https://github.com/lokalise/i18n-ally/issues/1160#issuecomment-4150377222)。`localesPaths` 的 glob 方案无需 workspace 文件，直接打开根目录文件夹即可生效。
:::
