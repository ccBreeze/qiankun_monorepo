import { prefetchApps } from 'qiankun'
import { cssFetchInterceptor } from './cssProcessor'
import { microApps } from './registry'

/**
 * 空闲时预加载所有子应用资源
 *
 */
export const prefetchMicroApps = () => {
  prefetchApps(
    microApps.map(({ name, entry }) => ({ name, entry })),
    { fetch: cssFetchInterceptor },
  )
}
