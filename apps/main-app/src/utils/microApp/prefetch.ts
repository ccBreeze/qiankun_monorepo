import { prefetchApps } from 'qiankun'
import { cssFetchInterceptor } from './cssProcessor'
import { processDynamicImport } from './htmlProcessor'
import { microApps } from './registry'

/**
 * 空闲时预加载所有子应用资源
 *
 */
export const prefetchMicroApps = () => {
  // import-html-entry 按 URL 缓存处理后的 HTML，预取必须使用与正式加载相同的入口改写。
  for (const { name, entry } of microApps) {
    prefetchApps([{ name, entry }], {
      fetch: cssFetchInterceptor,
      getTemplate: (tpl: string) => processDynamicImport(tpl, entry),
    })
  }
}
