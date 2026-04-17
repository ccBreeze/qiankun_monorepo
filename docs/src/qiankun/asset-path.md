# Vite 动态修改 base

本文说明 qiankun 场景下子应用静态资源（图片、字体、JS chunk、CSS）路径失效的根因，以及本项目的完整解决方案。

## 背景：为什么子应用加载的资源会 404？

::: danger 根因一句话
**URL 的解析基准由"当前执行上下文所在的页面"决定，而不是由"资源所在的服务器"决定。** qiankun 把子应用的代码搬到了主应用的页面上执行，但浏览器不知道这件事——它只认当前页面的 origin。
:::

子应用**独立运行**时，资源路径相对于自己的 origin（`http://sub-app.com`）解析，一切正常。

进入 qiankun 后，整个加载链路发生了本质改变：

1. 主应用通过 **`fetch`** 把子应用的 HTML 拉取为**字符串**
2. qiankun 解析该字符串，将 `<script>` / `<style>` / `<link>` 提取出来
3. 这些资源被**注入主应用的 `document`** 中执行

> 步骤 3 是关键：一旦 script/style 在主应用 `document` 中执行，浏览器对所有**相对路径**的解析基准就从子应用的 origin（`localhost:8101`）悄然切换成了主应用的 origin（`localhost:8100`）。<br>
> <span style="font-weight: bold; color: var(--vp-c-danger-1);">子应用静态资源的"origin"就此丢失。</span>

具体会遇到两类结构性问题，分别由 HTML 模板和 CSS 文本引发。

### HTML 模板中的根路径 URL

子应用 `index.html` 不是直接作为页面打开：主应用先通过 `fetch` 把它拉为字符串，再交给 `import-html-entry` 解析后注入到主应用 `document`。**这一过程里，HTML 模板中以 `/` 开头的路径会原样保留**——它们看起来是绝对路径，实则是"站点根路径"，浏览器会用当前页面 origin（主应用域名）来拼接解析，资源随之跑偏：

<img src="./imgs/asset-path-figure-06.png" alt="错误解析到主应用域名的根路径资源" style="display: block; width: 80%; margin: 0 auto;" />

而正确的地址应该指向子应用自身的入口域名：

<img src="./imgs/asset-path-figure-07.png" alt="正确解析到子应用入口域名的资源地址" style="display: block; width: 80%; margin: 0 auto;" />

以启用 `manualChunks` 拆包的 `index.html` 为例，模板里会同时出现三种需要处理的根路径资源：

<!-- prettier-ignore -->
```html [apps/vue3-history/dist/index.html]
<script crossorigin="">
  import('/assets/index-COaA-ZiT.js').finally(() => { // [!code focus]
    const qiankunLifeCycle =
      window.moudleQiankunAppLifeCycles &&
      window.moudleQiankunAppLifeCycles['vue3-history']
    if (qiankunLifeCycle) {
      window.proxy.vitemount((props) => qiankunLifeCycle.mount(props))
      window.proxy.viteunmount((props) => qiankunLifeCycle.unmount(props))
      window.proxy.vitebootstrap(() => qiankunLifeCycle.bootstrap())
      window.proxy.viteupdate((props) => qiankunLifeCycle.update(props))
    }
  })
</script>
<link rel="modulepreload" crossorigin="" href="/assets/vendor-LuBzGG1_.js"> <!-- [!code focus] -->
<link rel="modulepreload" crossorigin="" href="/assets/vue-vendor-Bq4jpeiR.js"> <!-- [!code focus] -->
<link rel="stylesheet" crossorigin="" href="/assets/index-KlKjbc8W.css"> <!-- [!code focus] -->
```

| 模板中的形式                                    | 来自构建的哪一步                        |
| ----------------------------------------------- | --------------------------------------- |
| inline `<script>` 里的 `import('/assets/...')`  | `vite-plugin-qiankun` 注入的入口脚本    |
| `<link rel="modulepreload" href="/assets/...">` | `manualChunks` 拆包后 Vite 写入的预加载 |
| `<link rel="stylesheet" href="/assets/...">`    | Vite 构建产出的入口 CSS 静态声明        |

**`renderBuiltUrl` 无法处理这类路径**：该 API 只改写 JS bundle 内部生成的 chunk 引用，HTML 模板字符串不经过它的钩子。需要主应用通过 qiankun 的 `getTemplate` 钩子拿到模板后，把所有 `/assets/...` 统一替换成 `${entry}/assets/...` 的子应用绝对地址。

> 关于 `manualChunks` 配置策略与两层机制的完整实现，参见 [Vite 构建拆包策略](../optimization/vite-code-splitting)。

### CSS 内联后的相对路径

Vite 默认开启 [`build.cssCodeSplit`](https://cn.vitejs.dev/config/build-options#build-csscodesplit)，异步 chunk 关联的 CSS 会被单独提取，由 Vite 运行时（`__vitePreload`）在懒加载触发时动态创建 `<link rel="stylesheet">` 元素插入 `document.head`。**这类 CSS 始终以外链 `<link>` 形式加载，不经过 qiankun 的 fetch 钩子**。

::: tip 前瞻提示：`renderBuiltUrl` 与 `window.__assetsPath` 详见后文章节
`<link>` 的 `href` 之所以能指向子应用 origin，靠的是两层配置共同计算：子应用通过 [`renderBuiltUrl`](#子应用配置-vite-renderbuilturl) 把 chunk 路径输出为 `window.__assetsPath(...)` 运行时表达式；主应用在加载子应用前注入 [`window.__assetsPath`](#主应用window__assetspath) 的实现。二者配合后，`__vitePreload` 动态插入 `<link>` 时解析出的 `href` 才是子应用绝对 URL，路径天然正确：
:::

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start;">
  <img src="./imgs/asset-path-figure-21.png" alt="async chunk CSS 以外链 link 形式挂在 document.head，href 指向子应用 origin" />
  <img src="./imgs/asset-path-figure-22.png" alt="Network 面板显示该外链 CSS 请求命中子应用 8101 端口，状态 200" />
</div>

问题出在另一条路径——子应用初始 HTML 中**静态声明的** `<link rel="stylesheet">`（通常是全局样式、CSS 变量、字体等入口 CSS）由 `import-html-entry` 在解析 HTML 时主动 fetch，并将 CSS 文本**内联为 `<style>` 标签**注入主应用 `document`，这是 qiankun 实现 CSS 沙箱的工作方式：

<img src="./imgs/asset-path-figure-23.png" alt="qiankun-head 中原入口 link rel=stylesheet 被 import-html-entry 替换为内联 style 标签" style="display: block; width: 80%; margin: 0 auto;" />

::: warning 内联 `<style>` 与外链 `<link>` 的 url() 解析差异

- **外链 `<link>`**：浏览器知道样式表的 origin，`url(...)` 相对于 CSS 文件地址解析 → 正确。
- **内联 `<style>`**：没有自身 URL，浏览器以**主应用页面 URL** 为基准，`url(...)` 变成主应用目录下的路径 → 404。

:::

<div style="display: grid; grid-template-columns: 0.5fr 1fr; gap: 16px; align-items: start;">
  <img src="./imgs/asset-path-figure-01.png" />
  <img src="./imgs/asset-path-figure-09.png" />
</div>

## 方案选型：为什么不用静态 base

将子应用 `vite.config.ts` 的 `base` 配置为绝对地址可以解决路径问题：

```ts [apps/vue3-history/vite.config.ts]
export default defineConfig({
  base: 'http://localhost:8101', // 简单，但有局限
})
```

这种方式的问题：

- 开发、测试、生产环境的域名不同，需要构建时区分
- 子应用部署域名变更时必须重新构建
- <span style="color: var(--vp-c-danger-1); font-weight: bold;">同一份构建产物无法在不同主应用环境下复用</span>

<img src="./imgs/asset-path-figure-03.png" alt="静态 base 将子应用域名写死在构建产物中" style="display: block; width: 80%; margin: 0 auto;" />
<img src="./imgs/asset-path-figure-05.png" alt="切换环境后静态 base 指向失效" style="display: block; width: 80%; margin: 0 auto;" />
<img src="./imgs/asset-path-figure-04.png" alt="同一份构建产物无法在不同主应用环境复用" style="display: block; width: 80%; margin: 0 auto;" />

## 运行时动态路径协议

本项目通过 Vite `experimental.renderBuiltUrl` API 与 `window.__assetsPath` 全局协议解决这一问题：**构建产物中不包含具体域名**，资源路径在运行时由主应用动态计算。

协议约定：

- **子应用**：构建时将资源路径替换为 `window.__assetsPath(appName, filename)` 调用表达式
- **主应用**：在加载子应用前注入 `window.__assetsPath` 的具体实现，根据注册的子应用 entry 计算完整 URL

### 目录结构与分工

```
apps/
├── main-app/src/assets/scss/
│   ├── fonts.scss        ← 声明 @font-face，验证字体资源路径
│   └── index.scss        ← 引入全局字体样式入口
├── main-app/src/utils/microApp/
│   ├── registry.ts        ← 注册表，组装 frameworkConfiguration
│   ├── entryBase.ts       ← 统一格式化子应用 entry base
│   ├── assetsPath.ts      ← 注入 window.__assetsPath
│   ├── cssProcessor.ts    ← 拦截 CSS fetch，改写 url() 路径
│   └── htmlProcessor.ts   ← 改写 HTML 模板中的根路径资源 URL
└── vue3-history/
    ├── src/views/AssetPathTest/index.vue ← 资源路径验证页（含字体示例）
    └── vite.config.ts     ← renderBuiltUrl：构建时输出运行时路径表达式
```

各层分工如下：

| 层             | 文件               | 职责                                          |
| -------------- | ------------------ | --------------------------------------------- |
| 子应用构建     | `vite.config.ts`   | `renderBuiltUrl`：JS/CSS 路径输出运行时表达式 |
| 主应用运行时   | `assetsPath.ts`    | 注入 `window.__assetsPath` 的实现             |
| HTML 模板处理  | `htmlProcessor.ts` | 改写 HTML 中 Vite 构建生成的根路径资源 URL    |
| CSS fetch 拦截 | `cssProcessor.ts`  | 改写 CSS 文本中的图片 / 字体相对路径          |

### 子应用：配置 Vite renderBuiltUrl

`renderBuiltUrl` 是 Vite 的实验性 API，**只在构建（`vite build`）阶段生效**，在开发模式（`vite dev`）下完全不触发。它介入每个资源 URL 的生成，可以返回一个**运行时表达式字符串**（`runtime`）代替静态路径。

::: tip base / server.origin / renderBuiltUrl 的区别

| 配置项           | 作用时机      | 影响范围                                          |
| ---------------- | ------------- | ------------------------------------------------- |
| `base`           | dev + build   | 所有资源路径，构建时写死为静态前缀                |
| `server.origin`  | 仅 dev server | 开发时资源 URL 前缀，不影响构建产物               |
| `renderBuiltUrl` | 仅 build      | 构建产物中资源 URL 的生成方式，可输出运行时表达式 |

- 本项目是使用 `renderBuiltUrl` 处理生产构建的资源路径；
- `server.origin: 'http://localhost:8101'` 只负责开发时让资源路径带上正确的子应用域名。

两者互为补充，覆盖不同阶段。
:::

```ts [apps/vue3-history/vite.config.ts]
experimental: {
  renderBuiltUrl(filename, { hostType }) {
    // CSS 中引用的图片保持相对路径
    // async chunk CSS 以 <link> 加载，url() 相对 CSS 文件自身 URL 解析，无需改写
    if (
      hostType === 'css' &&
      /\.(png|jpe?g|gif|svg|webp|woff2?|ttf|otf|eot)$/i.test(filename)
    ) {
      return { relative: true }
    }
    // JS/CSS 运行时动态路径
    if (hostType === 'js' || hostType === 'css') {
      return {
        runtime: `window.__assetsPath(
          ${JSON.stringify(env.VITE_APP_NAME)},
          ${JSON.stringify(filename)}
        )`,
      }
    }
    return { relative: true }
  },
},
```

CSS 中的图片和字体都保持相对路径，有两层原因：

1. **技术限制**：`renderBuiltUrl` 输出的 runtime 表达式只能嵌入 JS 中执行，CSS 文本里无法运行 JS。
2. **无需改写**：`cssCodeSplit` 启用后，每个异步 chunk 的 CSS 以独立 `<link>` 加载，`href` 由 `renderBuiltUrl` 保证是绝对 URL。根据[背景章节](#css-内联后的相对路径)的 url() 解析规则，`<link>` 样式表内的 `url()` 相对于 CSS 文件自身 URL 解析，路径天然正确。

### 主应用：window.\_\_assetsPath

`assetsPath.ts` 负责在主应用侧实现 `window.__assetsPath`，并在加载子应用前注入到全局。

```ts [apps/main-app/src/utils/microApp/assetsPath.ts]
import { normalizeMicroAppEntryBase } from './entryBase'
import { microApps } from './registry'

const microAppAssetBaseMap = microApps.reduce<Record<string, string>>(
  (map, app) => {
    map[app.name] = normalizeMicroAppEntryBase(app.entry)
    return map
  },
  {},
)

export const resolveMicroAppAssetUrl = (appName: string, filename: string) => {
  const base = microAppAssetBaseMap[appName]
  if (!base) return filename

  // 避免出现 // 路径导致 Vite 的 modulepreload 机制失效
  return `${base}/${filename.replace(/^\//, '')}`
}

/**
 * 全局注入（子应用）资源路径解析函数。
 *
 * - 子应用 `renderBuiltUrl` 会在构建阶段产出 `window.__assetsPath(...)`
 * - 主应用在加载子应用前提供具体解析逻辑
 */
export const installMicroAppAssetRuntime = () => {
  window.__assetsPath = resolveMicroAppAssetUrl
}
```

**为什么需要 `filename.replace(/^\//, '')`**

`window.__assetsPath` 可能收到两种形态的 `filename`：

| 调用来源                            | `filename` 形态             | 示例                        |
| ----------------------------------- | --------------------------- | --------------------------- |
| 构建产物中 `__vite__mapDeps` 调用   | `assets/...`（无前导 `/`）  | `assets/index-DiEL3xZ7.js`  |
| `getTemplate` 改写 HTML 入口 import | `/assets/...`（有前导 `/`） | `/assets/index-DzBdh9QA.js` |

第二种情况来自 `index.html` 入口模板中 `vite-plugin-qiankun` 注入的脚本：

<img src="./imgs/asset-path-figure-14.png" alt="vite-plugin-qiankun 注入的入口模板 import 调用" style="display: block; width: 80%; margin: 0 auto;" />

`processDynamicImport` 将其改写为：

<img src="./imgs/asset-path-figure-12.png" alt="processDynamicImport 将根路径 import 替换为 window.__assetsPath" style="display: block; width: 80%; margin: 0 auto;" />

若 `window.__assetsPath` 直接拼接，就会产生双斜杠地址：

<img src="./imgs/asset-path-figure-13.png" alt="拼接未去除前导斜杠导致双斜杠地址" style="display: block; width: 80%; margin: 0 auto;" />

**这会污染入口模块 `index-DzBdh9QA.js` 的 `import.meta.url`，进而引发后续 chunk 的重复请求。**

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start;">
  <img src="./imgs/asset-path-figure-15.png" alt="双斜杠污染后后续 chunk 被浏览器重复请求" />
  <img src="./imgs/asset-path-figure-16.png" alt="Network 面板中同一 chunk 出现单斜杠与双斜杠两条请求" />
</div>

::: warning 双斜杠如何传播并导致两次请求

`index-DzBdh9QA.js` 加载自 `http://localhost:8101//assets/index-DzBdh9QA.js`，它的 `import.meta.url` 也是这个双斜杠地址。该文件内部对 `index-DiEL3xZ7.js` 存在**两条独立的加载路径**，URL 计算基准不同：

**路径一：`__vite__mapDeps` 预加载（单斜杠）**

```js
// __vite__mapDeps 中存的是 window.__assetsPath 的调用结果
window.__assetsPath("vue3-history", "assets/index-DiEL3xZ7.js")
//                                   ↑ 无前导 /，拼接后单斜杠
→ "http://localhost:8101/assets/index-DiEL3xZ7.js"
```

`Hfe` 函数（`function(e,t){ return new URL(e,t).href }`）接收到的已经是绝对 URL，`new URL(绝对URL, base)` 原样返回，`<link rel="modulepreload">` 最终是**单斜杠**地址。

**路径二：动态 `import()` 执行（双斜杠）**

```js
// 构建产物中的相对路径 import
import("./index-DiEL3xZ7.js")
// 浏览器以 import.meta.url 为基准解析
new URL("./index-DiEL3xZ7.js", "http://localhost:8101//assets/index-DzBdh9QA.js")
→ "http://localhost:8101//assets/index-DiEL3xZ7.js"  // 继承了双斜杠
```

两个 URL 字符串不同，浏览器视为不同请求，**无法复用预加载缓存**：

| 请求   | 来源                            | URL                                               |
| ------ | ------------------------------- | ------------------------------------------------- |
| 请求 1 | `__vite__mapDeps` modulepreload | `http://localhost:8101/assets/index-DiEL3xZ7.js`  |
| 请求 2 | 动态 `import("./...")` 执行     | `http://localhost:8101//assets/index-DiEL3xZ7.js` |

`filename.replace(/^\//, '')` 在拼接前去掉前导 `/`，入口模块加载地址变为单斜杠，`import.meta.url` 恢复正常，双斜杠不再传播：

<img src="./imgs/asset-path-figure-10.png" alt="去除前导斜杠后入口模块加载地址恢复单斜杠" style="display: block; width: 80%; margin: 0 auto;" />

:::

### 主应用：HTML 模板补丁

`htmlProcessor.ts` 负责处理 `renderBuiltUrl` 覆盖不到的 HTML 模板内容。当前策略只改写**根路径** URL，通过 `isRewritableUrl` 做三条判断：

```ts [apps/main-app/src/utils/microApp/htmlProcessor.ts]
/** 判断 URL 是否需要改写为子应用绝对路径（仅处理根路径，排除 protocol-relative） */
const isRewritableUrl = (url: string) =>
  Boolean(url) && url.startsWith('/') && !url.startsWith('//')

/** 将根路径 URL 拼接为子应用绝对地址（调用方需确保 URL 通过 isRewritableUrl 检查） */
const toAbsoluteUrl = (entry: string, url: string) =>
  `${normalizeMicroAppEntryBase(entry)}${url}`
```

`isRewritableUrl` 三个条件的含义：

| 条件                | 排除的 URL                                                                          |
| ------------------- | ----------------------------------------------------------------------------------- |
| `Boolean(url)`      | 空字符串                                                                            |
| `startsWith('/')`   | `http://`、`https://`、`data:`、`blob:`、`./chunk.js`、`assets/index.js` 等非根路径 |
| `!startsWith('//')` | `//cdn.xxx.com/a.js` 这类 protocol-relative URL                                     |

因此，只有 `/assets/index.js`、`/assets/vue-vendor.js` 这类**根路径**才会被改写，其他所有形式的 URL 原样保留。

改写覆盖两类场景，各自由独立函数处理：

```ts [apps/main-app/src/utils/microApp/htmlProcessor.ts]
/** HTML 标签属性中的静态资源路径，如 <link href="/assets/vendor.js"> */
const rewriteStaticAssetUrls = (tpl: string, entry: string) =>
  tpl.replace(/\b(href|src)=(["'])([^"']+)\2/g, (match, attr, quote, url) => {
    if (!isRewritableUrl(url)) return match
    return `${attr}=${quote}${toAbsoluteUrl(entry, url)}${quote}`
  })

/** inline script 中的动态 import()，如 import('/assets/index.js') */
const rewriteDynamicImportUrls = (tpl: string, entry: string) =>
  tpl.replace(
    /import\((["'])([^"']+)(["'])\)/g,
    (match, quote1, url, quote2) => {
      if (!isRewritableUrl(url)) return match
      return `import(${quote1}${toAbsoluteUrl(entry, url)}${quote2})`
    },
  )

export const processDynamicImport = (tpl: string, entry: string): string => {
  const rewriters = [rewriteStaticAssetUrls, rewriteDynamicImportUrls]
  return rewriters.reduce((result, rewrite) => rewrite(result, entry), tpl)
}
```

`registry.ts` 再通过 qiankun 的 `getTemplate` 钩子接入这一层：

```ts [apps/main-app/src/utils/microApp/registry.ts]
configuration: {
  getTemplate: (tpl: string) => processDynamicImport(tpl, entry),
  fetch: cssFetchInterceptor,
}
```

改写效果示例：

<img src="./imgs/asset-path-figure-08.png" alt="改写前：HTML 模板中的根路径 import()" style="display: block; width: 80%; margin: 0 auto;" />
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start;">
  <img src="./imgs/asset-path-figure-11.png" alt="改写后：import() 转为 window.__assetsPath 调用" />
<img src="./imgs/asset-path-figure-23.png" alt="HTML渲染结果" style="display: block; width: 80%; margin: 0 auto;" />
</div>

### 主应用：cssFetchInterceptor CSS 路径拦截

通过配置 qiankun 的 `fetch` 钩子，拦截子应用初始 HTML 中静态 `<link rel="stylesheet">` 对应的 CSS 文件请求。qiankun 会将这些 CSS fetch 后内联为 `<style>` 标签，内联后 `url()` / `@import` 中的相对路径会相对主应用页面 URL 解析，导致资源 404。拦截器在 CSS 文本返回前将相对路径改写为绝对路径。

```ts [apps/main-app/src/utils/microApp/cssProcessor.ts]
export const cssFetchInterceptor: typeof window.fetch = (url, ...args) => {
  if (typeof url !== 'string' || !url.endsWith('.css')) {
    return window.fetch(url, ...args) // 非 CSS 请求直接透传
  }

  // 从 CSS 文件 URL 推导资源基路径，无需额外配置
  const base = url.substring(0, url.lastIndexOf('/') + 1)

  return Promise.resolve({
    async text() {
      const res = await window.fetch(url, ...(args as [RequestInit?]))
      let css = await res.text()
      css = replacePathInCSS(css, (path) => {
        if (path.startsWith('data:')) return path // base64 不处理
        return base + path
      })
      return css
    },
  } as unknown as Response)
}
```

`replacePathInCSS` 覆盖 CSS 中所有引用资源的语法形式：

| 模式                              | 示例                   |
| --------------------------------- | ---------------------- |
| `@import '...'` / `@import "..."` | `@import './font.css'` |
| `url('...')` / `url("...")`       | `url('./image.png')`   |
| `url(...)` 无引号                 | `url(./icon.svg)`      |

::: tip 仅拦截 qiankun fetch 的 CSS，不影响异步 chunk
`configuration.fetch` 替换的是 `import-html-entry` 内部调用的 `fetch`，**只作用于 qiankun 主动拉取的资源**（初始 HTML 中静态声明的 `<link>`）。运行时由 `__vitePreload` 通过 DOM API 插入的异步 chunk CSS 不经过此钩子，不受影响。
:::

**为什么"理论上"入口 CSS 不会出现 `url()`（但子应用有例外）**

Vue 组件的样式通过 `<style scoped>` 或 `<style module>` 编写，Vite 在构建时将其提取为 async chunk CSS，与组件代码一同按需加载，**不会进入入口 CSS**。

真正会进入入口 CSS（即被 qiankun fetch 内联的部分）只有全局样式文件，例如：

```ts
// main.ts
import './assets/main.css'
import 'some-ui-library/dist/style.css'
```

在"纯 Vite + 新项目规范"下，这类全局样式通常只包含 CSS 变量、排版重置、主题色等规则，`url()` 出现概率较低。

但在**子应用接入场景**里，下面两类情况很常见，不能按"入口 CSS 无 `url()`"处理：

- 子应用自定义 `iconfont`：例如在全局样式中引入 `iconfont.css`，其中 `@font-face` 通常包含 `url('./iconfont.woff2')`。这会进入入口 CSS，若被 qiankun 内联后不改写路径，字体请求可能相对主应用地址解析。
- 兼容旧系统 webpack 样式：历史项目常见 `style-loader` 或运行时注入 `<style>` 文本（内联 CSS）。这类 CSS 里的 `url()` 同样可能引用相对路径资源，且不一定经过 qiankun 的 `fetch` 钩子。

因此，"理论上不会出现 `url()`"只适用于理想化的新项目默认链路；在微前端落地中应默认按"可能存在 `url()`"做防御。

::: info 为什么仍然保留 cssFetchInterceptor
即便当前项目入口 CSS 不含 `url()`，`cssFetchInterceptor` 作为**低成本兜底**仍然有保留价值：

- 未来引入第三方 UI 库时，其入口 CSS 可能包含字体文件的 `url()` 引用（如 `@font-face`）
- 子应用自定义 `iconfont`、全局背景图等资源路径在 qiankun 内联后可能失去原始解析基准
- 旧 webpack 项目的样式迁移阶段，常出现"部分 CSS 外链、部分 CSS 内联"的混合状态，风险更高

拦截器已有完整实现，注册成本极低（一行配置），可以覆盖"qiankun 通过 `fetch` 拉取并内联"的 CSS 场景，防止新增依赖后出现难以排查的样式 404。
对于旧 webpack 的运行时内联 `<style>`（不走 `fetch`）场景，则需要在子应用侧额外治理（如统一静态资源前缀、尽量抽离为外链 CSS、或在注入前做文本改写）。
:::

## ❓为什么不需要禁用 build.cssCodeSplit

::: info **过去的误判**：
生产环境中可以观察到子应用的 async chunk CSS 以 `<link>` 形式被插入主应用的 `head`，直觉上容易误判为"样式跑到主应用里了，会污染其他子应用"。

<img src="./imgs/asset-path-figure-17.png" alt="async chunk CSS 插入主应用 head" style="display: block; width: 80%; margin: 0 auto;" />

为了规避这个现象，早期配置了 `build.cssCodeSplit: false`，将所有样式合并进入口 CSS，再由 `cssFetchInterceptor` 统一处理路径。**但这个前提判断是错的。**
:::

理解这一点，需要知道 **qiankun 只劫持初始 HTML 中静态声明的资源**：

- `import-html-entry` 解析子应用 HTML 时，将静态 `<link rel="stylesheet">` 通过 `fetch` 钩子拉取并**内联为 `<style>`**，`url()` 路径由此失去原始 origin（需要 `cssFetchInterceptor` 改写）
- `__vitePreload` 在运行时以 `document.createElement + appendChild` 动态插入的 async chunk CSS，**完全绕过 qiankun 的 fetch 钩子**，以原生 `<link>` 加载

| CSS 来源                                                  | 是否经过<br/> qiankun 劫持 | 加载结果                                   | `url()` 解析基准      |
| --------------------------------------------------------- | -------------------------- | ------------------------------------------ | --------------------- |
| HTML 中静态声明的<br/> `<link rel="stylesheet">`          | ✅ 是                      | `import-html-entry` <br/>内联为 `<style>`  | **主应用页面 URL** ❌ |
| Vite 异步 chunk JS/CSS<br/>（`__vitePreload` 运行时注入） | ❌ 否                      | `<link>` / `<script>` <br/>直接插入 `head` | **文件自身 URL** ✅   |

**无法劫持，也不需要处理**，原因在于两点：

1. **正确解析 url() 路径**：async chunk CSS 以 `<link href="绝对URL">` 加载（`href` 由 `renderBuiltUrl` 保证），浏览器对 `<link>` 样式表内 `url()` 相对于 CSS 文件自身 URL 解析，与主应用页面 URL 无关。
2. **样式不会污染**：Vue `<style scoped>` 在编译期为每条规则附加唯一的 `[data-v-xxxxxxxx]` 属性选择器，作用域锁定在组件内部，即使 `<link>` 插入主应用 `head`，规则也不会泄漏到其他组件或子应用。

::: warning 禁用 cssCodeSplit 的实际代价
`cssCodeSplit: false` 把 async chunk CSS 强行塞进入口 `<link>`，使其落入 qiankun 劫持范围，反而制造了本不存在的问题：

- **首屏体积增大**：（入口 CSS 体积暴增）所有页面的样式一次性全量下载，即使大多数路由从未访问
- **抹除 Vite code splitting 的收益**：async chunk 的按需加载优势完全消失
- **与 cssFetchInterceptor 强耦合**：CSS 合并进入口后必须依赖拦截器改写路径，两者绑定在一起，任一失效均会导致样式资源 404
  :::

## ❓子应用卸载后 link 标签残留

子应用 unmount 后，主应用 `head` 中会保留 `__vitePreload` 运行时插入的 `<link>` 标签：

<img src="./imgs/asset-path-figure-18.png" alt="子应用卸载后主应用 head 中残留的 link 标签" style="display: block; width: 80%; margin: 0 auto;" />

**为什么 qiankun 无法移除它们**

qiankun 沙箱的职责范围是 **JS 全局变量隔离**（window proxy）和 **`<style>` 标签的生命周期管理**（由 qiankun 自身注入的样式）。对于子应用代码在运行时通过 `document.head.appendChild` 插入的 `<link>` 元素，qiankun 不做追踪，unmount 时也不会清理。

**为什么残留没有影响**

| 标签                         | 残留影响                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `<link rel="modulepreload">` | 仅是浏览器预加载提示，不执行代码、不挂载组件，留在 `head` 完全惰性                                                                          |
| `<link rel="stylesheet">`    | CSS 规则全部带有 `[data-v-xxxxxxxx]` scoped 选择器，只匹配携带该属性的元素；子应用卸载后对应 DOM 节点已移除，CSS 规则无匹配目标，实际不生效 |

两类标签的 `href` 均为内容寻址的哈希文件名，若子应用再次挂载，浏览器直接命中缓存，不会产生额外网络请求。

## ❓Dev 环境 style 插入主应用 head（无需处理）

开发环境（`vite dev`）下，样式由 Vite HMR 客户端以 `<style data-vite-dev-id="...">` 的形式动态注入 `document.head`。在 qiankun 场景中看到 style 节点出现在主应用 `head`，属于 **Vite 的预期行为**，不是异常。

<div style="display: grid; grid-template-columns: 0.63fr 0.36fr; gap: 16px; align-items: start;">
  <img src="./imgs/asset-path-figure-19.png" alt="Dev 环境下 style 标签注入主应用 head" />
  <img src="./imgs/asset-path-figure-20.png" alt="qiankun-head 内联 style 节点" />
</div>

当前项目不需要对该现象做额外处理，原因是：

1. **仅发生在开发环境**：生产构建不会走这套 HMR 注入机制，线上行为由构建产物的 `<link>` / `chunk` 加载机制决定。
2. **路径不受影响**：开发环境已通过 `server.origin` 提供正确资源来源；生产环境由 `renderBuiltUrl + window.__assetsPath` 兜底，关注点是资源 URL 正确性，而不是 style 节点位于哪个 `head`。
3. **样式污染风险可控**：业务样式以 Vue `scoped` 为主，规则带 `[data-v-xxxx]` 作用域；即使 style 节点位于主应用 `head`，也不会无边界扩散到其他子应用。

::: tip 什么时候才需要处理
只有在开发环境已经出现"可复现的样式串扰或覆盖"时，才需要针对具体样式来源做治理（例如全局 reset、第三方库全局样式），而不是因为"style 出现在主应用 head"这个现象本身去改加载机制。
:::

## 相关链接

- [Vite renderBuiltUrl](https://cn.vitejs.dev/guide/build#advanced-base-options)
- [Vite build.modulePreload](https://cn.vitejs.dev/config/build-options#build-modulepreload)
- [qiankun loadMicroApp — FrameworkConfiguration](https://qiankun.umijs.org/zh/api#loadmicroappapp-configuration)
- [import-html-entry fetch 钩子](https://github.com/kuitos/import-html-entry)
- [vite-plugin-qiankun：生产环境动态替换资源路径支持](https://github.com/tengmaoqing/vite-plugin-qiankun/issues/16)
- [qiankun issue：请求自动转换 CSS 中相对路径为完整链接](https://github.com/umijs/qiankun/issues/2014#issuecomment-1085552127)
- [qiankun issue：希望提供 CSS 后处理参数处理相对路径](https://github.com/umijs/qiankun/issues/981#issuecomment-714218539)
- [qiankun issue：子应用 CSS url() 相对路径加载失败](https://github.com/umijs/qiankun/issues/808#issuecomment-692652178)
