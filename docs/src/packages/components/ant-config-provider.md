# AntConfigProvider 全局配置

封装 [Ant Design Vue](https://antdv.com/components/config-provider-cn) 的 `ConfigProvider`，统一项目内 antdv 的主题 token、组件尺寸和全局样式。所有应用应在根节点处包一层，作为 antdv 组件的样式底座。

## 何时使用

- 新建主应用 / qiankun 子应用时，需要立即在根组件外层包裹 `AntConfigProvider`，避免各应用各自维护 token、尺寸或样式覆盖。
- 命令式弹窗（`openModal`）会在挂载弹窗实例时自动套一层 `AntConfigProvider`，业务无需再嵌套。

## 如何使用

应用入口处统一包裹 `AntConfigProvider`：

```vue [apps/main-app/src/App.vue]
<script setup lang="ts">
import { AntConfigProvider } from '@breeze/components'
</script>

<template>
  <AntConfigProvider>
    <RouterView />
  </AntConfigProvider>
</template>
```

命令式弹窗会在 `renderModalInstance` 内部额外包一层 `AntConfigProvider`：

```ts [packages/components/src/Modal/render.ts]
app = createApp({
  render() {
    return h(AntConfigProvider, null, {
      default: () => h(component, modalProps),
    })
  },
})
app.mount(container)
```

`AntConfigProvider` 自身通过 antdv 的 `ConfigProvider` 注入配置，核心逻辑如下：

```vue [packages/components/src/AntConfigProvider/index.vue]
<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue'
import themeToken from './theme/token/default.json'
</script>

<template>
  <ConfigProvider componentSize="large" :theme="themeToken">
    <slot></slot>
  </ConfigProvider>
</template>
```

- `ConfigProvider` 基于 Vue 的依赖注入 API 工作：上层通过 `provide` 提供配置；
- 插槽内渲染出来的 antdv 组件会在自身逻辑中通过 `inject` 或 antdv 内部封装的 hook 读取离自己最近的 `ConfigProvider` 配置。
- Vue 的依赖注入沿当前组件树向下生效，不是全局单例配置，也不会自动跨越另一个 `createApp` 创建出来的应用实例。

之所以命令式弹窗需要在 `render.ts` 额外写这段，是因为 `openModal` 通过 `createApp` 创建了一个独立的 Vue 应用实例，并挂载到临时 `container` 上。这个实例不在业务应用原本的组件树里，无法通过 Vue 的依赖注入链路读取根节点 `AntConfigProvider` 提供的 `theme`、`componentSize`，也不会因为业务根节点已经渲染过就自动拥有同一层组件上下文，所以需要在命令式挂载入口补上同一层配置。

如果把弹窗组件当作普通组件直接写在页面模板中，则不需要再额外包裹：

```vue [src/views/ExampleModalEntry.vue]
<template>
  <DemoActionModal v-if="visible" v-bind="modalProps" />
</template>
```

这种组件式用法仍然处在当前应用的组件树内，只要应用入口已经包了 `AntConfigProvider`，它就会和其他 antdv 组件一样自然继承配置。业务侧重复包裹反而容易造成多套 token 或样式覆盖关系变复杂。

## API

`AntConfigProvider` 不暴露额外的 props，所有字段由组件内部固化：

| 内部字段        | 取值                       | 说明                                             |
| --------------- | -------------------------- | ------------------------------------------------ |
| `componentSize` | `'large'`                  | 项目内全部 antdv 组件统一使用 `large` 尺寸       |
| `theme`         | `theme/token/default.json` | 全量 token 文件，覆盖主色 / 文本 / 边框 / 阴影等 |

## 主题 Token

主题 token 位于 `packages/components/src/AntConfigProvider/theme/token/default.json`

如需调整全局主题，统一修改该 JSON 文件，禁止在业务侧硬编码颜色。

### 为多主题预留的目录约定

`theme/token/` 目录与 `default.json` 的命名是**为多主题切换预留的扩展位**，并非"只能存在一份"。当业务需要支持深色模式 / 多品牌换肤 / 不同租户主题时，可按以下约定平滑接入：

```
AntConfigProvider/
└── theme/
    └── token/
        ├── default.json      # 默认主题（当前在用）
        ├── dark.json         # 深色主题（按需新增）
        └── brand-x.json      # 业务自定主题（按需新增）
```

## 全局样式注入

antdv 4 的 token 系统对部分组件粒度不足（例如 `Modal`、`Form`、`Button` 等的某些细节），项目通过运行时注入一段 scss 字符串补齐。

逻辑封装在 `packages/components/src/AntConfigProvider/globalStyle.ts` 中，行为如下：

- 以固定 `id="breeze-antd-global-style"` 的 `<style>` 注入到 `<head>`，并以该 id 作为幂等标记——同一文档下只注入一次，qiankun 多子应用聚合时不会重复加载；
- 内部使用 `import('./theme/scss/index.scss?inline')` 异步加载样式文本，避免把整段 scss 字符串打进主包。

所有覆盖均通过类前缀挂在 `.ant-*` 上，无需业务侧关心。

## 注意事项

- **不要在业务组件里再嵌套 `ConfigProvider`**，会让多套 token 互相覆盖。
- **不要直接在业务侧写死 antdv token 颜色**，主题如有变更需统一在 `theme/token/default.json` 里调整。
- 在 qiankun 子应用接入时，子应用的根组件也需要包一层 `AntConfigProvider`，因为子应用独立运行时需要自己的样式底座。
