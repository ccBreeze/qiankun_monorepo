import type { UserConfig } from 'vite'
import qiankun from 'vite-plugin-qiankun'

/** qiankun 子应用配置参数 */
export type QiankunOptions = {
  /** 开发服务器端口，用于生成资源请求的 origin */
  port: number
}

/**
 * 创建 qiankun 子应用配置，供不同框架的应用组合使用。
 */
export const createQiankunConfig = (options: QiankunOptions): UserConfig => {
  const { port } = options

  // 提前校验，避免 appName 为 undefined 时产生静默 404
  const appName = process.env.npm_package_name
  if (!appName) {
    throw new Error(
      '[vite-config] 缺少 npm_package_name，请通过包管理器运行子应用脚本，以读取 package.json 中的应用名称。',
    )
  }

  return {
    // 由 Vite 生成相对资源路径，HTML 入口由主应用基于子应用 entry 补全。
    base: './',
    define: {
      'import.meta.env.VITE_APP_NAME': JSON.stringify(appName),
    },
    plugins: [
      qiankun(appName, {
        useDevMode: true,
      }),
    ],
    server: {
      origin: `http://localhost:${port}`,
    },
  }
}
