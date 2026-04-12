---
title: 微前端中如何子应用切换 KeepAlive 保活
outline: [2, 3]
---

# 微前端中如何子应用切换 KeepAlive 保活

在微前端场景里，除了本文采用的"wrapper 组件 + fullPath 缓存 key"方案，社区里还常见以下几种思路。

## 方案一：`loadMicroApp` + 不销毁 DOM

核心思路：

1. 基于 `loadMicroApp` 手动控制微应用的加载与切换。
2. 在基座和微应用内部都配置合适的 KeepAlive / 缓存策略。
3. 应用切换时不卸载前一个微应用，而是通过 `display: none` 控制显示与隐藏。
4. 基座为每个微应用维护独立的挂载点，这样切换到其他应用时，前一个微应用的 DOM 不会被卸载。

这个方案的出发点是：只要 DOM 还在，页面历史状态通常就不会丢；一旦重新渲染 DOM，很多表单输入、滚动位置、组件内部状态都可能丢失。

方案不足：

1. 子应用切换时不销毁 DOM，会让页面中长期堆积大量 DOM 节点和事件监听，严重时可能造成明显卡顿。
2. 子应用切换时既然没有真正卸载，那么定时器、全局事件、路由监听等副作用也不会自动清理，需要额外为"激活/失活"状态编写一套特殊处理逻辑。

## 方案二：`registerMicroApps` + 缓存 VNode ❌

另一类思路是继续使用 `registerMicroApps`，但尝试在基座层缓存微应用对应的 VNode 或渲染结果，希望切换回来时直接复用。

这类方案在讨论里出现过，但整体上并不是一个稳定、通用、可维护的做法，因此本文不采用。主要原因是 qiankun 的微应用实例、沙箱、副作用管理和 DOM 生命周期并不是单纯缓存一个 VNode 就能完整恢复的。

更具体的讨论可参考以下资料：

- [qiankun 应用保活方案的一种思路](https://juejin.cn/post/7127082488114970631#heading-3)
- [微前端缓存与保活相关讨论](https://juejin.cn/post/6856569463950639117#heading-14)
- [qiankun 场景下的 KeepAlive / 缓存实践](https://juejin.cn/post/7237425413873713209)
- [qiankun issue #361：相关社区讨论](https://github.com/umijs/qiankun/issues/361)
- [基于 Vue 3 + Monorepo + 微前端的中后台前端项目框架全景解析](https://juejin.cn/post/7565423807570362374)
