import { RUNTIME_ENV, runtimeEnv, type RuntimeEnv } from '@breeze/utils/env'
import { MICRO_APP_ACTIVE_RULE } from '@/constant'

export interface MicroAppDefinition {
  /** 微应用激活规则 */
  activeRule: string
  /** 传递给子应用的菜单标识，仅业务用途，路由授权不依赖该字段 */
  menuKey?: string
  /** 各运行环境的入口 URL 映射 */
  entryMap: Partial<Record<RuntimeEnv, string>>
}

export interface ResolvedMicroApp {
  /**
   * 激活规则
   * - 主应用据此匹配微应用
   * - 微应用需将其作为 createWebHistory 的 base
   */
  activeRule: string
  /** 微应用名称，对应 qiankun 应用名 */
  name: string
  /** 当前环境入口 URL */
  entry?: string
  /** 容器选择器 */
  container: string
  menuKey?: string
}

/** 所有微应用的静态配置列表 */
const microAppDefinitions = [
  {
    activeRule: MICRO_APP_ACTIVE_RULE.OCRM,
    entryMap: {
      [RUNTIME_ENV.DEV]: 'http://localhost:8102',
    },
  },
  {
    activeRule: MICRO_APP_ACTIVE_RULE.VUE3_HISTORY,
    menuKey: 'crmReadFunctionList',
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
] as const

/**
 * 从 activeRule 提取应用标识符
 * @example '/ocrm/#' → 'ocrm'
 * @example '/vue3-history' → 'vue3-history'
 */
const getPackageId = (activeRule: string) =>
  activeRule.replace(/^\//, '').replace(/[/#].*$/, '')

/** 将微应用静态配置补全为可直接使用的解析结果 */
const resolveMicroApp = (config: MicroAppDefinition): ResolvedMicroApp => {
  const id = getPackageId(config.activeRule)
  return {
    activeRule: config.activeRule,
    name: id,
    entry: config.entryMap[runtimeEnv],
    container: `#micro-container__${id}`,
    menuKey: config.menuKey,
  }
}

export const resolvedMicroApps: ResolvedMicroApp[] =
  microAppDefinitions.map(resolveMicroApp)
