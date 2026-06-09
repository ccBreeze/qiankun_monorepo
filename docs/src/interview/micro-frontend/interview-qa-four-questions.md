---
title: 微前端面试 QA
outline: deep
---

# 微前端面试 QA

本文整理 qiankun、Vite 和 Monorepo 相关的高频面试问题及回答。

## 为什么选择 qiankun 而不是 Garfish / wujie / micro-app / single-spa

## qiankun 为什么不支持 vite

根本原因是 **qiankun 的沙箱执行模型和 Vite 的原生 ESM 产物不兼容**：

1. qiankun 加载子应用时，先用 `fetch` 拿到子应用的 JS 文本，再包成 `with(window.proxy){ ... }` 后通过 `eval` 执行，从而把全局访问重定向到沙箱代理。
2. Vite 构建后的入口是 module script `<script type="module">`，依赖和后续 chunk 都通过原生 ESM 的静态 `import` 加载。
3. 静态 `import` 只能出现在模块上下文，qiankun 使用 `eval` 执行时会直接抛 `SyntaxError` 语法错误。

解决方案：使用 `vite-plugin-qiankun` 插件适配 Vite 的入口加载和生命周期接入，但代价是放弃 JS 沙箱、允许副作用逃逸。

## vite-plugin-qiankun 原理

主要解决两个问题：

1. Vite 的 ESM 入口不能直接通过 qiankun 的 `eval` 执行；
2. ESM 也不会像 UMD 一样把生命周期挂到 `window[appName]`，导致 qiankun 无法获取子应用生命周期。

原理：

1. 编译时通过 Vite 的 `transformIndexHtml()` 把 module script 改成普通 `<script>` 中的动态 `import()`。
   > 动态 import() 是合法的运行期表达式，可以在普通脚本的 eval 中执行，不会像静态 import 一样在解析阶段抛出语法错误。代码执行到 import() 时，浏览器再将模块加载交给原生 ESM loader。
2. 编译时还会向 HTML 注入一组 `bootstrap`、`mount`、`unmount` 占位生命周期的普通脚本。
3. 运行时，qiankun 先在 JS 沙箱中执行注入脚本，从 `window[appName]` 获取占位生命周期；随后浏览器加载 ESM 入口，子应用的入口代码通过 `renderWithQiankun()` 把真实生命周期注册到插件维护的全局映射中。动态 `import()` 完成后，插件读取并回填真实生命周期，结束 Promise 等待，最终让 qiankun 调用到子应用真实的生命周期函数。

真正的 ESM 模块仍由浏览器原生执行，不经过 qiankun js 沙箱执行，子应用的副作用将会发生逃逸，子应用卸载后对应全局的副作用被清除；

## qiankun 原理

## js 沙箱隔离

### 副作用补丁

### vite 中的 js 沙箱逃逸如何解决？

处理方案要先看隔离强度要求：

1. 如果必须保证强 JS 隔离，使用能被 qiankun `eval` 包装的 UMD/IIFE 构建，或者使用 iframe。Vite 原生 ESM + `vite-plugin-qiankun` 不能提供同等强度的 JS 沙箱。
2. 如果继续使用 Vite，则把 `mount/unmount` 当成唯一资源边界，所有定时器、监听器、连接和模块级状态都要显式登记和释放。
3. 必须访问 qiankun 沙箱全局时，使用 `vite-plugin-qiankun` 提供的 `qiankunWindow`，不要在业务代码中直接写 `window.xxx` 或 `globalThis.xxx`。但这只是减少全局污染，不能替代 `unmount` 清理。

```ts [src/main.ts]
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

let dispose: (() => void) | undefined

export function mount() {
  const timer = qiankunWindow.setInterval(refresh, 10_000)
  const handleResize = () => refreshLayout()

  qiankunWindow.addEventListener('resize', handleResize)

  dispose = () => {
    qiankunWindow.clearInterval(timer)
    qiankunWindow.removeEventListener('resize', handleResize)
  }
}

export function unmount() {
  dispose?.()
  dispose = undefined
}
```

### js 沙箱逃逸：副作用如何处理？

即使 qiankun 能拦截部分代理对象上的 API，也不能把浏览器的所有状态都自动回滚。Vite 子应用应按“谁创建、谁释放”的原则管理副作用：

| 副作用                            | 主要风险                                           | 处理方式                                                                                                    |
| --------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 全局变量                          | 应用间覆盖、隐藏依赖、卸载后残留                   | 优先放模块状态、Vue store 或 qiankun `props`；必须共享时使用受控的 `@breeze/runtime` 或带命名空间的全局协议 |
| `setInterval` / `setTimeout`      | 卸载后仍执行，重复请求或更新已销毁组件             | 保存 timer id，在 `unmount` 或 Vue `onUnmounted` 中清理；模块顶层创建的 timer 也必须登记                    |
| `addEventListener`                | 监听器累积、一次操作触发多次、闭包无法释放         | 使用具名 handler，成对调用 `removeEventListener`；跨应用通信使用 `qiankunRuntime.channel.on/off`            |
| `localStorage` / `sessionStorage` | 同源共享、key 冲突、数据不会随 `unmount` 回滚      | 使用 `breeze:<appName>:<key>` 命名空间，不使用 `clear()`；持久数据在“应用卸载”时按明确策略清理              |
| Cookie                            | 没有应用级命名空间，Path/Domain 不一致导致无法清理 | cookie 名称加应用前缀，并固定 `Path`、`Domain`、`SameSite`；删除时使用完全相同的属性                        |
| IndexedDB                         | 数据库和连接按 origin 共享，连接长期占用           | 数据库名按应用隔离，保存并关闭 `IDBDatabase` 连接；只有明确执行“清除应用数据”时才删除数据库                 |

其中，`localStorage`、`sessionStorage`、Cookie 和 IndexedDB 都是持久化浏览器状态，qiankun 没有办法在 `unmount` 时自动恢复它们。命名空间只能解决互相覆盖，不能代替数据生命周期设计。

### 为什么不建议定义全局变量？有什么缺点？

全局变量不是绝对不能用，但不应作为业务通信和业务状态的默认方案：

- **容易冲突**：不同子应用可能使用相同 key，加载顺序会影响最终值；
- **生命周期不清晰**：`unmount` 不代表真实 `window` 上的属性会被清理；
- **依赖不可见**：代码可以在任意位置读写，难以追踪谁初始化、谁修改、谁负责释放；
- **难以测试和复用**：独立运行、并行挂载和多版本共存时都容易出现状态串台。

业务侧应优先使用 qiankun `props`、共享包导出的类型化 API，或 `@breeze/runtime` 的事件通道。该仓库的 `QiankunRuntime` 虽然在 `globalThis` 上复用实例，但它使用 `Symbol.for(...)`、单一初始化入口和模块导出封装，这是运行时基础设施的受控例外，不等同于业务代码随意挂载 `window.xxx`。

#### 团队维护一份全局变量登记文档是否可行？

可以维护，但它只能作为治理清单，不能作为隔离方案或唯一约束。文档能够说明“已经有哪些全局变量”，却不能阻止代码写入重复的 key，也不能保证变量会在子应用卸载时被清理。

只依赖文档通常还有几个问题：

- 文档和代码容易不同步，新增、重命名或删除变量后可能忘记更新；
- 无法提供类型检查，变量值被其他应用改成不兼容结构时只能在运行时报错；
- 无法表达并发读写、初始化顺序和多版本应用同时运行时的冲突；
- 无法强制所有开发者遵守，更不能自动回收 timer、listener 等由全局对象间接持有的资源。

更可靠的做法是把约束落到代码和工具中：

1. 把允许共享的全局能力收口到公共 runtime 包，由它统一定义 key、类型和访问 API；
2. 使用带应用命名空间的 key，或使用 `Symbol.for(...)` 创建框架级唯一 key，禁止业务代码直接写裸的 `window.xxx`；
3. 通过 ESLint、CI 扫描或 code review 阻止未经登记的全局写入；
4. 在 API 中明确初始化方、读写方、版本兼容和销毁方式，并用测试验证重复挂载和卸载；
5. 文档从这份代码契约生成或与其同步维护，记录 owner、用途、类型、生命周期和清理策略。

面试时可以这样回答：**文档可以降低沟通成本，但不能提供技术上的隔离和强制力。我会把共享全局变量收口成一个类型化的 runtime API，让代码成为唯一事实来源，再用文档解释协议和责任边界。**

### 如果定时器或者监听不清理会怎么样？

`setInterval` 不是“创建一个后台线程”，而是向浏览器的定时器机制注册一个重复调度任务。每次间隔时间到达后，浏览器把回调安排到任务队列，主线程再按事件循环规则逐个执行。回调执行期间，页面上的其他脚本和渲染也要等待；如果回调本身耗时，后续任务只能排队等待。

例如一个子应用每次挂载都创建一个 `setInterval(refresh, 1000)`，但卸载时没有清理：

```text
第一次 mount   -> 注册 interval A
第一次 unmount  -> A 仍然存在
第二次 mount   -> 注册 interval B
第二次 unmount  -> A、B 都仍然存在

每秒到期后，A、B 会分别调度自己的回调，最终同一个 refresh 被执行多次。
```

`clearInterval` 只能阻止后续的重复调度，不能中断已经开始执行的回调；回调中已经发出的请求、创建的 Promise 或其他异步任务，也不会因为清理 timer 自动取消。

全局事件监听的表现类似，但触发机制不同：浏览器派发一次事件时，会在当前事件任务中依次调用所有仍然注册的 handler。每次挂载创建的闭包通常都是不同的函数对象，因此旧 handler 不会因为 Vue 组件卸载而自动消失。

最直接的后果是：

- 子应用切换后，旧 timer 继续执行并发请求；
- 同一个全局事件触发多个旧 handler，产生重复提交、重复通知或重复路由操作；
- handler 闭包继续引用 Vue 实例、store 和 DOM，造成内存泄漏；
- 子应用再次挂载时，旧状态和新状态叠加，问题表现为“偶现”和“串台”。

因此 `app.unmount()` 只负责销毁 Vue 组件树，并不等于所有 ESM 模块级副作用都会自动消失。清理时至少要覆盖三层：

1. 清除 timer：`clearInterval`、`clearTimeout`；
2. 移除监听：使用同一个 handler 和监听选项调用 `removeEventListener`，或在 `unmount` 时调用 `AbortController.abort()`；
3. 取消后续异步工作：例如用 `AbortController` 取消 fetch，并让回调在执行前检查当前应用是否仍处于 mounted 状态。

面试中应明确说出：**副作用必须和 `mount/unmount` 或组件的 `onMounted/onUnmounted` 成对管理，并对 `unmount` 做重复调用和异常路径兜底。**

## CSS 样式隔离

## keepAlive 保活

## 子应用资源加载

## Q1：`resume/resume-crm.md` 里这个项目，前端架构负责人主要做了什么？

**A：** 不是只做“技术选型”，而是把微前端从概念落成一套可以持续接入、持续演进的工程体系。

可以拆成 5 件事来讲：

### 1. 定整体方案，明确演进路径

- 选择 `qiankun` 作为应用级编排层，解决主应用加载、挂载、卸载子应用的问题；
- 选择 `Vue 3 + Vite` 承接新子应用；
- 保留旧 `Vue 2 + Webpack` 子应用接入能力，支持存量系统灰度迁移；
- 选择 `pnpm workspace` 作为 Monorepo 基建，让共享包、工程配置和本地联调统一管理。

这一步的关键不是“选了什么技术”，而是**保证新旧系统能并存，迁移过程不断业务**。

### 2. 搭主应用壳层，把编排能力做完整

主应用不是只渲染一个容器，而是负责一整套运行时编排：

- 维护子应用注册表，统一管理 `activeRule`、`entry`、`container`；
- 根据当前路由识别激活子应用；
- 通过 `loadMicroApp()` 管理挂载、切换和卸载；
- 把 `authorizedRoutes`、`userData`、`activeRule` 等上下文通过 `props` 下发给子应用；
- 和菜单、标签页、KeepAlive、实例回收逻辑协作。

对应仓库里的关键实现可以直接落到这些文档：

- [子应用注册表](../../qiankun/micro-app-registry)
- [子应用状态管理](../../qiankun/micro-app-store)
- [路由协作机制](../../qiankun/routing-mechanism)

### 3. 抽公共基础包，把“接入成本”从人肉经验变成标准能力

这个项目里，架构负责人更重要的产出通常不是某个页面，而是把重复问题抽成共享层：

- `@breeze/runtime`：主子应用共享运行时、事件通道、类型定义；
- `@breeze/router`：动态路由和权限注册；
- `@breeze/bridge-vue`：把 qiankun 生命周期和 Vue 应用初始化桥接起来；
- `@breeze/vite-config`：统一子应用 Vite 接入方式；
- `@breeze/components`、`@breeze/utils`、`@breeze/i18n`：沉淀可复用基础能力。

这类包的价值是：**新应用接入时不再从零拼装微前端能力，而是按约定消费现成基建。**

### 4. 解决迁移期的硬问题

真正体现架构价值的通常不是 happy path，而是这些问题有没有被系统解决：

- `activeRule`、Vue Router `base`、资源路径三者如何保持一致；
- Vite 子应用如何接入 qiankun，而不是停留在“理论上可行”；
- 老 `Webpack + Vue 2` 子应用如何兼容接入；
- 子应用切换时如何处理 KeepAlive、实例复用和真正 `unmount`；
- 子应用资源、样式、全局副作用如何清理和兜底。

对应深挖资料：

- [qiankun 原理](../../micro-frontend/qiankun-principle)
- [vite-plugin-qiankun 解决了什么问题](../../micro-frontend/vite-plugin-qiankun)
- [OCRM 接入问题排查](../../qiankun/ocrm-troubleshooting)

### 5. 把方案沉淀成团队可复用规范

前端架构负责人最后要对“团队效率”负责，而不是只对“自己能做出来”负责：

- 统一 `tsconfig`、ESLint、Stylelint、提交规范；
- 统一 workspace 依赖管理和共享脚本；
- 补齐接入文档、原理文档、踩坑文档；
- 让新子应用接入流程更标准，减少对个人经验的依赖。

**一句话收口：** 这个角色更像“前端平台 / 微前端基础设施 owner”，核心工作是定边界、做底座、解迁移难题、降团队接入成本。

## Q2：qiankun 的原理是什么？

**A：** 一句话讲，qiankun 本质上是在主应用里做了三件事：**按路由识别子应用、按 HTML Entry 加载资源、按生命周期驱动挂载和卸载。**

可以按下面 6 步讲清楚：

### 1. 主应用先决定“现在该激活谁”

主应用监听路由变化，根据当前 URL 和每个子应用的 `activeRule` 判断当前该加载哪个子应用。

比如：

- `/vue3-history/...` 命中 `vue3-history`
- `/ocrm/#/...` 命中 `ocrm`

### 2. qiankun 拉取子应用入口 HTML

和“直接 import 一个远程模块”不同，qiankun 走的是 **HTML Entry 模型**。

主应用拿到的是一个完整子应用入口，例如：

```text
http://localhost:8101/index.html
```

然后交给 `import-html-entry` 去解析。

### 3. 解析 HTML，抽取 CSS、JS 和资源基准路径

`import-html-entry` 会做几件事：

- 提取模板 HTML；
- 收集外部 CSS 和 JS；
- 计算 `assetPublicPath`；
- 把相对资源地址补成完整 URL。

这一步解决的是：**子应用虽然嵌在主应用里运行，但资源仍然要从子应用自己的部署地址加载。**

### 4. 创建沙箱，在隔离环境中执行子应用 JS

qiankun 会给子应用创建运行时沙箱。这样子应用对 `window` 的读写、全局变量的污染、副作用记录，都能被一定程度拦截和回收。

可以把它理解成：

- 子应用“以为”自己在独立页面里运行；
- 实际上它是在主应用准备好的代理环境里运行。

### 5. 从子应用里拿到生命周期函数

子应用执行完入口脚本后，qiankun 要拿到这几个生命周期：

- `bootstrap`
- `mount`
- `unmount`

后面主应用切换路由时，本质上就是在驱动这几个生命周期。

### 6. single-spa 负责生命周期调度

qiankun 底层基于 `single-spa`。所以最终子应用不是“加载一次就完事”，而是会随着路由切换持续进入：

```text
bootstrap -> mount -> unmount
```

在本项目里，Vite 子应用还额外依赖 [vite-plugin-qiankun 解决了什么问题](../../micro-frontend/vite-plugin-qiankun)，因为 Vite 默认是原生 ESM 入口，而 qiankun 的执行链路并不直接等价于浏览器原生模块加载。

**一句话收口：** qiankun 不是“远程组件加载器”，而是“应用级加载器 + 生命周期调度器 + 运行时隔离层”。

## Q4：Monorepo 在这个项目里担任了什么角色？

**A：** Monorepo 在这个项目里主要负责**研发阶段的协同和基础设施沉淀**。我们把 `runtime`、`router`、`bridge-vue`、`vite-config` 这类共享能力都放在同一个仓库里，方便统一维护和源码联调。

这样做的价值是，子应用可以继续独立运行、独立部署，但底层基建、工程规范和公共包不用每个项目重复造一遍。

所以可以简单理解成：**qiankun 解决运行时集成，Monorepo 解决研发期协作。**

## Q5：如果 Monorepo 里改了公共组件，是不是每个子应用都要重新部署？怎么解决？

**A：** 如果公共组件是通过 `workspace` 包在构建期打进各个子应用里的，那原则上**需要重建受影响的子应用**，因为组件代码已经进了它们各自的 bundle。

很多人会说“那做成组件库不就行了”，但如果这个组件库还是通过 npm / workspace 安装，最后一样会被打进子应用产物里，本质上还是**构建期依赖**，所以改了组件库之后，受影响的子应用照样要重新部署。

这个问题我一般分两层处理：**稳定的基础组件继续走 Monorepo 共享 + 自动化 affected deploy**，只发布真正依赖它的子应用；**需要高频独立发布的组件**，再考虑做成运行时共享，比如独立组件服务或 Module Federation。

所以本质上不是“Monorepo 怎么做到完全不用部署”，而是要区分：**构建期共享的东西走受影响发布，运行时共享的东西再做远程化。**

## Q3：模块联邦 Module Federation 的区别是什么？

**A：** 因为我们当前要解决的是**应用级编排**，不是模块级共享。这个项目需要主应用按路由加载完整子应用，还要统一处理菜单、权限、标签页、挂载卸载和新旧系统并存，这些更适合 qiankun。

qiankun 和 Module Federation 的核心区别是：**qiankun 管的是完整子应用，Module Federation 管的是远程模块**。前者更适合微前端壳和生命周期管理，后者更适合跨应用共享组件或能力模块。

所以对这个项目来说，qiankun 是主方案；如果以后要做远程组件共享，Module Federation 可以作为补充，而不是替代。

# Web Components

Web Components 可以作为“胶水层”，让各个子应用共享通用组件，而无需担心框架冲突
