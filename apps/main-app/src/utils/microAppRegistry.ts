import { RUNTIME_ENV, runtimeEnv, type RuntimeEnv } from '@breeze/utils/env'
import { MICRO_APP_ACTIVE_RULE } from '@breeze/runtime'
import type { RegistrableApp } from 'qiankun'

export interface MicroAppDefinition {
  /**
   * 激活规则（收窄为 string）
   * - 主应用据此匹配子应用
   * - 子应用需将其作为 createWebHistory 的 base
   */
  activeRule: string
  /** 各运行环境的入口 URL 映射 */
  entryMap: Partial<Record<RuntimeEnv, string>>
}

/**
 * 子应用静态解析结果
 *
 * - `activeRule` 收窄为 `string`
 * - `props` 由 `useMicroAppStore` 在运行时注入，不在此处定义
 *
 * @see https://qiankun.umijs.org/zh/api#registermicroappsapps-lifecycles
 */
export type ResolvedMicroApp = RegistrableApp<object> &
  Pick<MicroAppDefinition, 'activeRule'> & {
    container: string
  }

/** 所有子应用的静态配置列表 */
const microAppDefinitions: MicroAppDefinition[] = [
  {
    activeRule: MICRO_APP_ACTIVE_RULE.OCRM,
    entryMap: {
      [RUNTIME_ENV.DEV]: 'http://localhost:8102',
    },
  },
  {
    activeRule: MICRO_APP_ACTIVE_RULE.VUE3_HISTORY,
    entryMap: {
      [RUNTIME_ENV.DEV]: 'http://localhost:8101',
    },
  },
  {
    activeRule: MICRO_APP_ACTIVE_RULE.BREEZE_CRM_V8,
    entryMap: {
      [RUNTIME_ENV.DEV]: 'http://localhost:8103',
    },
  },
]

/**
 * 从 activeRule 提取应用标识符
 * @example
 * getPackageId('/vue3-history')  // → 'vue3-history'
 * getPackageId('/ocrm/#')  // → 'ocrm'
 * getPackageId('/#/ocrm')       // → 'ocrm'（⚠️ 不推荐，hash 前缀无法生成独立路由别名）
 */
export const getPackageId = (activeRule: string) => {
  const segments = activeRule
    .split('/')
    .filter((segment) => segment && segment !== '#')
  return segments[0] ?? ''
}

/** 将子应用静态配置补全 */
export const microApps = microAppDefinitions.map((config): ResolvedMicroApp => {
  const id = getPackageId(config.activeRule)
  return {
    activeRule: config.activeRule,
    entry: config.entryMap[runtimeEnv]!,
    name: id,
    container: `#micro-container__${id}`,
  }
})
