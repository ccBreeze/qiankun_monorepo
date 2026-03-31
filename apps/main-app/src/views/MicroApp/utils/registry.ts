export interface MicroAppConfig {
  /** 微应用包名，用于生成激活规则 */
  packageName: string
  activeRule?: string
}

export interface RegistrableMicroApp extends MicroAppConfig {
  /**
   * 激活规则
   * - 主应用据此匹配微应用
   * - 微应用需将其作为 createWebHistory 的 base
   */
  activeRule: string
}

/** 所有微应用的静态配置列表 */
const microAppConfigs = [
  {
    packageName: 'ocrm',
    activeRule: '/ocrm/#/',
  },
  {
    packageName: 'vue3-history',
  },
  {
    packageName: 'breeze-crm-v8',
  },
]

/**
 * 获取激活规则
 *
 * eg: `breeze-crm-v8` → `/crm-v8/`
 */
const getActiveRule = (packageName: string) => {
  const routeSegment = packageName.replace(/^breeze-/, '')
  return `/${routeSegment}/`
}

/** 将微应用配置补全为可注册的微应用信息 */
const createRegistrableMicroApp = (
  microAppConfig: MicroAppConfig,
): RegistrableMicroApp => {
  const activeRule =
    microAppConfig.activeRule || getActiveRule(microAppConfig.packageName)

  return {
    ...microAppConfig,
    activeRule,
  }
}

export const microAppRegistry = new Map(
  microAppConfigs.map((microAppConfig) => [
    microAppConfig.packageName,
    createRegistrableMicroApp(microAppConfig),
  ]),
)
