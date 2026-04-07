import { RUNTIME_ENV, runtimeEnv, type RuntimeEnv } from '@breeze/utils/env'
import type { RegistrableApp } from 'qiankun'

/** 子应用激活规则枚举 */
export const MICRO_APP_ACTIVE_RULE = {
  OCRM: '/ocrm/#',
  VUE3_HISTORY: '/vue3-history',
  BREEZE_CRM_V8: '/crm-v8',
} as const

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
 * @example '/ocrm/#' → 'ocrm'
 * @example '/vue3-history' → 'vue3-history'
 */
const getPackageId = (activeRule: string) => {
  return activeRule
    .replace(/^\//, '') // 去掉开头的斜杠
    .replace(/[/#].*$/, '') // 去掉第一个 /# 及其后的内容
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
