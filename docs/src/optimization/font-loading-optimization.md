# font 字体加载优化

本文聚焦字体加载在微前端场景下的性能优化，目标是在保证可读性与视觉一致性的前提下，降低首屏阻塞和重复下载成本。

## 优化目标

- 降低首屏渲染阻塞，减少 FOIT/FOUT 带来的体验波动
- 减少字体文件体积与请求数量
- 提高主应用与子应用间的字体缓存复用率

## 建议策略

1. 优先使用 `woff2`，仅在确有兼容需求时保留 `ttf` 兜底
2. 使用 `unicode-range` 做子集拆分（如数字/英文/其他字符）
3. 主应用统一托管字体资源，子应用只消费 `font-family`
4. `font-display` 默认推荐 `swap`，再按页面类型微调
5. 仅对首屏关键字体做 `preload`，其余字体按需加载
6. 配置强缓存（hash 文件名 + 长缓存策略）减少重复下载

## 可变字体文件

可变字体（Variable Font）是在单个字体文件内包含多个字重/字宽轴的字体格式，常见文件形态如下：

- `FontName[wght].woff2`（仅字重轴）
- `FontName[wdth,wght].woff2`（字宽 + 字重轴）

### 适用价值

1. 一份文件覆盖多个字重，减少资源数量与切换成本
2. 对多字重场景（如 400/500/600/700）通常更易统一加载策略
3. 与 `unicode-range` 结合时，可同时做到“轴可变 + 字符子集控制”

### 使用建议

1. 优先选择官方提供的可变字体文件，不建议将静态 `ttf` 在线“转换”为可变字体
2. 仍建议优先使用 `woff2`，并保留清晰的 fallback 字体栈
3. 在主应用统一托管可变字体资源，子应用只使用 `font-family`
4. 首屏仅 preload 必需字体，其他轴能力按正常加载链路获取

### 示例（字重轴）

```css
@font-face {
  font-family: 'ExampleVF';
  src: url('/fonts/ExampleVF[wght].woff2') format('woff2');
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}
```

## 参考文档

- [百度 Comate：字体加载优化](https://comate.baidu.com/zh/page/a96y0jt9jkp)
- [fedev：Web 字体优化（Part 3）](https://fedev.cn/performance/optimizing-web-fonts-part3.html)
