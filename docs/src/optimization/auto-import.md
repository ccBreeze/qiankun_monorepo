# API/组件自动导入

本文说明如何用 `unplugin-auto-import` 和 `unplugin-vue-components` 实现 Vue API 与 UI 组件的自动导入，覆盖两个插件的职责划分、ant-design-vue 配置、图标处理和 ESLint 适配。

## 两个插件的职责

项目使用两个来自同一生态的 unplugin 插件协作，各自处理不同类型的导入：

| 插件                      | 处理对象                    | 典型场景                          |
| ------------------------- | --------------------------- | --------------------------------- |
| `unplugin-auto-import`    | **JS/TS API**（函数、变量） | `ref`、`computed`、`useRouter`    |
| `unplugin-vue-components` | **Vue 组件**（模板标签）    | `<a-button>`、`<CloseOutlined />` |

两者互不重叠，缺一不可。

## unplugin-auto-import 配置

```ts [vite.config.ts]
import AutoImport from 'unplugin-auto-import/vite'

AutoImport({
  imports: ['vue', 'vue-router', 'pinia'],  // 自动导入的库
  dts: 'src/types/auto-imports.d.ts',       // 生成的类型声明文件
  eslintrc: {
    enabled: true,
    filepath: './.eslintrc-auto-import.json',
  },
  vueTemplate: true,  // 在模板中也可以直接使用自动导入的 API
}),
```

`eslintrc.enabled: true` 会生成 `.eslintrc-auto-import.json`，在 `eslint.config.js` 中引入后，ESLint 就能识别 `ref`、`computed` 等全局变量，不再报 `no-undef` 错误。

```js [eslint.config.js]
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

export default defineConfigWithVueTs(...vue3, {
  languageOptions: {
    globals: autoImportGlobals.globals,
  },
})
```

::: tip
`auto-imports.d.ts` 需要先执行一次 `vite dev` 或构建才会生成，生成前 IDE 可能有类型提示缺失。
:::

## unplugin-vue-components 配置

### ant-design-vue 按需引入

项目最初以全量方式注册，全量引入会把所有组件（含未用到的 `rc-*` 子组件、CSS-in-JS 运行时等）打入产物，通常超过 1 MB，同时阻止 tree-shaking：

```ts [src/main.ts]
import Antd from 'ant-design-vue' // [!code --]
app.use(Antd) // [!code --]
```

配置 `AntDesignVueResolver` 后删除全量注册即可，模板中用到的组件会被自动按需引入。

::: tip

- `@ant-design/icons-vue` 仍需保留在 `dependencies` 中，resolver 按需引入的是包内模块，并非替代依赖本身。
- 如果组件在 `script` 中通过 JS 调用（如 `Modal.confirm()`），resolver 无法识别，需要手动 import。
  :::

### Vite 配置

```ts [vite.config.ts]
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

Components({
  dirs: [],  // 禁用本地组件目录扫描，只保留 resolver 功能
  dts: 'src/types/components.d.ts',
  resolvers: [
    AntDesignVueResolver({
      // 项目使用 SCSS，antdv 的 Less 样式与之冲突；
      // v4 通过 CSS-in-JS 自动注入，无需引入外部 CSS
      importStyle: false,
      resolveIcons: true,  // 同时处理 @ant-design/icons-vue 图标的按需引入
    }),
  ],
}),
```

::: warning dirs: [] 是关键
不设置时插件默认扫描 `src/components` 并将本地组件全部自动注册为全局组件，会污染全局命名空间，让组件来源变得不透明。本项目只用 resolver 功能，本地组件保持显式 import。
:::

### ESLint 适配

`vue/no-undef-components` 规则无法感知 `components.d.ts` 中声明的全局组件，需要在 `ignorePatterns` 中补充图标的匹配规则：

```ts [packages/eslint-config/src/vue3.ts]
'vue/no-undef-components': [
  'error',
  {
    ignorePatterns: [
      'router-view',
      'router-link',
      '^a-',                        // ant-design-vue 连字符形式
      '^A[A-Z]',                    // ant-design-vue 大驼峰形式
      '(Outlined|Filled|TwoTone)$', // @ant-design/icons-vue 图标 // [!code ++]
    ],
  },
],
```

::: tip
`components.d.ts` 需要先执行一次 `vite dev` 或构建才会生成，生成前 IDE 可能有类型提示缺失。
:::

## 相关链接

- [unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import)
- [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components)
- [ant-design-vue 快速上手](https://antdv.com/docs/vue/introduce-cn)
