import { microApps } from './registry'

/** 格式化子应用入口 URL */
export const normalizeMicroAppEntryBase = (entry: string) => {
  if (!entry) return ''
  return entry
    .replace(/\/[^/]*\.html$/, '') // 'https://app/index.html' -> 'https://app'
    .replace(/\/$/, '') //'https://app/' -> 'https://app'
}

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
