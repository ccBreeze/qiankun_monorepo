export interface MicroAppConfig {
  /** 微应用包名，用于生成路由前缀 */
  packageName: string
  pathPrefix?: string
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
    packageName: 'ocrm',
    pathPrefix: '/ocrm/#/',
  },
  {
    packageName: 'breeze-crm',
  },
  {
    packageName: 'breeze-crm-v8',
  },
]

/**
 * 获取路由路径前缀
 *
 * eg: `breeze-crm` → `/crm/`
 */
const getPathPrefix = (packageName: string) => {
  const routeSegment = packageName.replace(/^breeze-/, '')
  return `/${routeSegment}/`
}

/** 将微应用配置转换为 [路由前缀, 完整配置] 的注册表条目 */
const createMicroAppRegistryEntry = (
  microAppConfig: MicroAppConfig,
): [string, RegistrableMicroApp] => {
  const pathPrefix =
    microAppConfig.pathPrefix || getPathPrefix(microAppConfig.packageName)

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

/**
 * 根据 packageName 从注册表中查找对应的 pathPrefix
 *
 * @throws 找不到时抛出错误，确保配置一致性
 */
export const resolvePathPrefix = (packageName: string): string => {
  for (const [, app] of microAppRegistry) {
    if (app.packageName === packageName) return app.pathPrefix
  }
  throw new Error(
    `[MicroApp] 未在注册表中找到 packageName "${packageName}"，请检查 microAppConfigs 配置`,
  )
}
