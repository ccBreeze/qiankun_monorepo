# iOS WebView H5 页面字体短暂异常放大

记录 iOS App WebView 加载 H5 页面时，字体在初始渲染阶段短暂偏大随后跳变回正常尺寸的问题及解决方案。

## 问题现象

在 iOS App 的 WebView 中打开 H5 页面时，页面首次渲染的瞬间字体明显偏大，随即跳缩至正常大小，造成明显的视觉闪烁。Android 端和 PC 浏览器上较少复现，iOS WebView 中尤为突出。

## 根本原因

项目使用 `rem` 作为布局单位，`<html>` 的 `font-size` 作为换算基准。原有方案将 `rem.js` 以外部脚本形式放在 `<body>` 底部：

```html
<!-- 原有方案：外部脚本放在 body 底部 -->
<script src="/javaScript/rem.js"></script>
```

这导致执行时序存在一个危险窗口：

```
1. 浏览器解析并渲染 HTML/CSS
   └─ 此时 font-size 为浏览器默认值（16px）
   └─ rem 单位按 16px 基准计算 → 元素尺寸偏大
2. 用户短暂看到"放大"效果 ← 问题出现在这里
3. body 底部的 rem.js 加载并执行
   └─ font-size 被设置为 100px（或按屏幕宽度缩放）
4. 页面重排，字体跳变回正常大小
```

第 1～3 步之间的时间差在 iOS WebView 中因脚本加载受网络延迟影响而被放大，导致闪烁明显。

## 解决方案

将 rem 计算逻辑改为**内联脚本**，放置在 `<head>` 中，并以 IIFE 形式**立即同步执行**，同时注释掉原有的外部脚本引用。

```html
<head>
  <!-- rem 基准值计算：必须内联、必须在 head 中、必须同步执行 -->
  <script>
    ;(function (doc, win) {
      var u = navigator.userAgent
      var isPC =
        u.indexOf('iPhone') < 0 &&
        u.indexOf('iphone') < 0 &&
        u.indexOf('Android') < 0 &&
        u.indexOf('android') < 0

      var docEl = doc.documentElement
      var resizeEvt =
        'orientationchange' in window ? 'orientationchange' : 'resize'

      function recalc() {
        var clientWidth = docEl.clientWidth
        if (!clientWidth) return
        if (isPC) {
          docEl.style.fontSize = '100px'
        } else {
          docEl.style.fontSize = 100 * (clientWidth / 375) + 'px'
        }
      }

      recalc() // 立即执行，渲染前设好基准值

      if (!doc.addEventListener) return
      win.addEventListener(resizeEvt, recalc, false)
      doc.addEventListener('DOMContentLoaded', recalc, false)
    })(document, window)
  </script>
</head>

<body>
  <!-- 注释掉原有外部脚本 -->
  <!-- <script src="/javaScript/rem.js"></script> -->
</body>
```

修复后的执行时序：

```
1. 解析 <head> 中的内联脚本
   └─ 立即执行 recalc()
   └─ font-size 按屏幕宽度正确设置
2. 浏览器开始渲染 body
   └─ rem 单位按正确基准值计算，无闪烁
```

## 为什么不能用 `async`

有时会想到给外部脚本加 `async` 属性来"加速加载"，但这恰好与需求相反：

| 方式                          | 下载     | 执行时机                     | 是否可行 |
| ----------------------------- | -------- | ---------------------------- | -------- |
| 默认同步脚本（`<head>` 内联） | 无需下载 | 立即同步执行，阻塞渲染       | ✅       |
| `async` 外部脚本              | 并行下载 | 下载完才执行，时机**不确定** | ❌       |
| `defer` 外部脚本              | 并行下载 | DOM 解析完后执行             | ❌       |

`async` 脚本的执行时机完全取决于网络速度。网速慢时，页面大部分内容已渲染完毕脚本才执行，反而让闪烁窗口更长。

解决字体闪变的核心约束是：**在浏览器渲染第一个像素之前，同步设置好 `font-size`**。只有放在 `<head>` 中的无 `async`/`defer` 的**内联脚本**才能满足这一约束。

## 关键点总结

| 要素                               | 原因                             |
| ---------------------------------- | -------------------------------- |
| **内联脚本**（非外部文件）         | 无网络请求延迟，零等待时间       |
| **放在 `<head>` 中**               | 在任何 DOM 内容渲染前执行        |
| **同步执行**（无 `async`/`defer`） | 阻塞渲染，确保基准值先于像素输出 |
| **IIFE 立即调用 `recalc()`**       | 不依赖任何事件，脚本解析完即设置 |

这一模式与主题色注入、暗黑模式初始化等场景完全一致，是"渲染前必须同步生效的全局状态"的标准处理方式。
