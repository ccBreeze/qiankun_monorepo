declare interface Window {
  /**
   * 子应用资源路径解析函数，由主应用微前端运行时注入。
   *
   * @param appName - 子应用名称，对应 VITE_APP_NAME
   * @param filename - 构建产物文件名，如 `assets/index-BuLkT9.js`
   * @returns 完整的资源 URL
   */
  __assetsPath: (appName: string, filename: string) => string
}
