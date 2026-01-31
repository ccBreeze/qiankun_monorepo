/**
 * 内存缓存策略
 * @description 使用 Map 实现的内存缓存，页面刷新时自动重置，无过期和数量限制
 */
export const memoryCacheStrategy = new Map()
