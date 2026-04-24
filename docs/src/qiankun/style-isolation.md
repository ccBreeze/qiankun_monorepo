---
title: CSS 样式隔离
---

# CSS 样式隔离

本文总结 qiankun 场景下主应用与子应用的样式隔离实践，并给出推荐的落地顺序。

## 背景

Vue / React 组件本身具备一定的样式封装能力，但在微前端场景中仍可能出现以下问题：

- 子应用全局样式污染主应用
- 主应用样式覆盖子应用（尤其是 reset / 通配选择器）
- 弹窗、消息等挂载到 `document.body` 的组件样式失效或越界

对于传统项目（例如 jQuery 或全局样式较重的系统），通常需要结合 qiankun 沙箱与应用侧样式策略共同治理。

## 官方基线（qiankun FAQ）

根据 qiankun FAQ 中“如何确保主应用跟微应用之间的样式隔离”的说明，可落地为三条基线：

1. 开启沙箱后，qiankun 会自动隔离微应用之间的样式
1. 主应用与微应用之间，仍建议手动做前缀隔离（尤其是主应用全局样式）
1. 可选开启 `sandbox: { experimentalStyleIsolation: true }` 做运行时 scoped CSS（实验特性）

对于 antd/antdv，优先采用“编译期变量 + 运行时 `ConfigProvider.prefixCls`”双配置。

```ts
// 示例：主应用统一前缀（React/antd）
import { ConfigProvider } from 'antd'

export const MyApp = () => (
  <ConfigProvider prefixCls="yourPrefix">
    <App />
  </ConfigProvider>
)
```

## 推荐方案顺序

1. 优先采用 `Shadow DOM` 做强隔离（隔离边界最清晰）
1. 同时配置组件库统一前缀（`prefixCls`）降低冲突概率
1. 对全局 reset 使用作用域包裹（预处理器嵌套 / 容器限定）
1. `experimentalStyleIsolation` 仅作为兜底，不建议作为主方案

## Garfish 视角：DOM 隔离不只等于 CSS 隔离

Garfish 在沙箱章节的“DOM 隔离”里强调了一个关键点：隔离对象分为两类。

- 样式节点（`style` / `link` 等）
- DOM 节点（运行时插入节点、副作用节点）

文档中将沙箱能力拆分为：

- 快照沙箱：主要处理样式节点回收，不处理完整 DOM 节点隔离
- VM 沙箱：同时处理样式节点与 DOM 节点，并支持多实例场景下的来源追踪与清理

这意味着在工程实践里，样式隔离方案需要和“节点挂载位置、弹出层容器、卸载清理”一起设计，不能只看 CSS 选择器本身。

## 主/子应用中的 reset.css

### 问题

当主应用与子应用都引入 reset 样式时，容易出现基础样式互相覆盖。对 Ant Design Vue 这类组件库，还要避免破坏其 `:where()` 低优先级策略。

### 建议

- 对 reset 使用 `@layer` 做层级隔离，避免与业务样式直接竞争优先级
- reset 仅保留必要规则，不要放业务类选择器

```css
/* 示例：将 reset 放到独立层 */
@import 'ant-design-vue/dist/reset.css' layer(reset);

@layer reset, base, components, utilities;
```

## 开启 Shadow DOM（推荐）

`Shadow DOM` 可以天然实现双向隔离：

- Shadow 内样式不会泄漏到外部
- 外部样式不会影响 Shadow 内部

典型做法是在子应用挂载阶段创建 `shadowRoot`，并把应用根节点挂到 Shadow 容器中。

```ts
// 伪代码：在子应用 mount 阶段创建 Shadow Root
const host = container.querySelector('#subapp-root')
const shadowRoot = host.attachShadow({ mode: 'open' })
const appRoot = document.createElement('div')
shadowRoot.appendChild(appRoot)
app.mount(appRoot)
```

结合 Garfish 的 DOM 隔离设计，`Shadow DOM` 落地时至少要保证：

1. 子应用节点创建与动态样式插入都落在容器内部
1. 查询类 DOM API 也在容器语义下执行，避免误查到主应用节点
1. 事件传播链不破坏框架事件委托（例如 React 事件系统）

### Shadow DOM 的边界

- 需要同步处理 DOM 挂载策略，不是“只开开关”就结束
- 某些组件库/基础库对 Shadow DOM 支持不完整，需要专项验证

### 与 Ant Design Vue 配合

需要同步处理“样式注入容器”和“弹出层容器”：

1. 样式注入容器指向 Shadow 内部容器（例如 `StyleProvider.container`）
1. 弹出层挂载容器改为 Shadow 内节点（例如 `ConfigProvider.getPopupContainer`）

否则会出现样式注入到主应用 `<head>`、弹窗出现在 Shadow 外导致样式丢失的问题。

## 统一样式前缀（prefixCls）

即使使用 Shadow DOM，也建议统一配置组件库样式前缀，进一步降低样式类名冲突风险：

1. 全局 `ConfigProvider` 配置 `prefixCls`
1. `Modal` / `Message` / `Notification` 等静态方法入口同步设置根前缀

该策略适合多套设计系统并存或主子应用都使用 antd/antdv 的场景。

## `experimentalStyleIsolation` 说明

qiankun 的 `sandbox: { experimentalStyleIsolation: true }` 会在运行时改写子应用样式选择器，类似“自动加作用域前缀”。

它可以缓解部分污染问题，但不建议作为主方案：

- 运行时改写存在兼容边界
- 对复杂选择器、第三方样式、弹出层场景并不总是稳定
- 维护成本和排障成本较高

更推荐采用 `Shadow DOM + prefixCls + scoped reset` 的组合策略。

## 策略选型（结合 qiankun 与 Garfish）

- 只做 `prefixCls` / namespace：改造成本可控，兼容性好；但无法天然隔离弹出层与动态节点副作用
- 运行时 scoped（如 `experimentalStyleIsolation`）：接入快，但存在实验性与边界场景
- `Shadow DOM + 容器化 DOM 管理`：隔离最强，适合多应用并行与多实例；需处理组件库兼容与节点托管

## 预处理器嵌套（容器作用域）

对于无法快速改造的存量样式，可以先将 reset 与全局规则包裹到应用容器下，减少外溢：

```scss
#crm {
  input::-ms-clear,
  input::-ms-reveal {
    display: none;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
}
```

这是过渡方案，长期仍建议向 Shadow DOM 或更彻底的组件化样式治理演进。

## 其他可选隔离方式

- BEM：规范成本较高，但可控
- CSS-in-JS：动态能力强，但有运行时与心智负担
- CSS Modules：隔离好，但类名哈希降低调试可读性
- Vue Scoped：组件级隔离友好，仍需处理全局样式与弹出层

## 使用 Ant Design 变量体系

在主题定制场景下，建议优先走组件库官方变量体系，减少“手写覆盖样式”的冲突面：

- Ant Design CSS Variables
- Ant Design Vue `ConfigProvider` 主题配置

## 相关文档

- [Garfish：沙箱 - DOM 隔离](https://www.garfishjs.org/guide/concept/sandbox.html#dom-%E9%9A%94%E7%A6%BB)
- [qiankun FAQ：如何确保主应用跟微应用之间的样式隔离](https://qiankun.umijs.org/zh/faq#%E5%A6%82%E4%BD%95%E7%A1%AE%E4%BF%9D%E4%B8%BB%E5%BA%94%E7%94%A8%E8%B7%9F%E5%BE%AE%E5%BA%94%E7%94%A8%E4%B9%8B%E9%97%B4%E7%9A%84%E6%A0%B7%E5%BC%8F%E9%9A%94%E7%A6%BB)
- [常见问题与解决方案（子应用 CSS 插入到主应用 head）](./troubleshooting.md#子应用-css-样式插入到主应用-head)
- [qiankun issue #1316：沙箱 + body 挂载样式问题](https://github.com/umijs/qiankun/issues/1316#issuecomment-824735192)
- [Ant Design：Shadow DOM 场景样式兼容](https://ant.design/docs/react/compatible-style-cn#shadow-dom-%E5%9C%BA%E6%99%AF)
- [详解 CSS @layer 规则](https://www.zhangxinxu.com/wordpress/2022/05/css-layer-rule/)
