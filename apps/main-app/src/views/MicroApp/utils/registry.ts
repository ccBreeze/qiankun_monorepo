interface MicroAppConfig {
  /** 微应用包名，用于生成路由前缀 */
  packageName: string
}

export interface RegistrableMicroApp extends MicroAppConfig {
  /**
   * 路由前缀
   * - 主应用据此匹配微应用
   * - 微应用需将其作为 createWebHistory 的 base
   */
  pathPrefix: string
}

/** 所有微应用的静态配置列表 */
const microAppConfigs = [
  {
    packageName: 'candao-crm-v8',
  },
  {
    packageName: 'candao-crm',
  },
]

/**
 * 获取路由路径前缀
 *
 * eg: `candao-crm` → `/crm/`
 */
const getPathPrefix = (packageName: string) => {
  const routeSegment = packageName.replace(/^candao-/, '')
  return `/${routeSegment}/`
}

/** 将微应用配置转换为 [路由前缀, 完整配置] 的注册表条目 */
const createMicroAppRegistryEntry = (
  microAppConfig: MicroAppConfig,
): [string, RegistrableMicroApp] => {
  const pathPrefix = getPathPrefix(microAppConfig.packageName)

  return [
    pathPrefix,
    {
      ...microAppConfig,
      pathPrefix,
    },
  ]
}

export const microAppRegistry = new Map(
  microAppConfigs.map(createMicroAppRegistryEntry),
)
