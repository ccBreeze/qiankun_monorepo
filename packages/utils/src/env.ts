type ImportMetaEnvShim = {
  env?: {
    DEV?: boolean
  }
}

const isViteDev = Boolean((import.meta as ImportMetaEnvShim).env?.DEV)

export const GRAY_DIR = '/new'

export const RUNTIME_ENV = {
  /** 开发 */
  DEV: 'development',
  QC: 'qc',
  BETA: 'beta',
  /** 灰度 */
  GRAY: 'gray',
  /** 生产 */
  PROD: 'prod',
} as const

export type RuntimeEnv = (typeof RUNTIME_ENV)[keyof typeof RUNTIME_ENV]

export const runtimeEnv: RuntimeEnv = (function () {
  const { host, pathname } = window.location
  if (isViteDev) return RUNTIME_ENV.DEV
  if (host.includes('-qc-')) return RUNTIME_ENV.QC
  if (host.includes('-beta-')) return RUNTIME_ENV.BETA
  if (pathname.startsWith(GRAY_DIR)) return RUNTIME_ENV.GRAY
  return RUNTIME_ENV.PROD
})()

export const isDev = runtimeEnv === RUNTIME_ENV.DEV
export const isQc = runtimeEnv === RUNTIME_ENV.QC
export const isBeta = runtimeEnv === RUNTIME_ENV.BETA
export const isGray = runtimeEnv === RUNTIME_ENV.GRAY
export const isProd = runtimeEnv === RUNTIME_ENV.PROD

/** 灰度目录 */
export const grayDir = isGray ? GRAY_DIR : ''
