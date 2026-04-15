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

## 参考文档

- [百度 Comate：字体加载优化](https://comate.baidu.com/zh/page/a96y0jt9jkp)
- [fedev：Web 字体优化（Part 3）](https://fedev.cn/performance/optimizing-web-fonts-part3.html)
