/**
 * 处理子应用 HTML 模板中的动态导入路径。
 *
 * vite experimental.renderBuiltUrl 只能处理静态资源引用，
 * HTML 模板里代码分割产生的动态 import() 语句需要在 qiankun
 * getTemplate 钩子中手动替换为运行时路径。
 */
export const processDynamicImport = (tpl: string, appName: string): string => {
  // 开发环境已配置 server.origin
  if (import.meta.env.DEV) return tpl

  return tpl.replace(
    /import\((["'])([^"']+)(["'])\)/g,
    (_, quote1, url, quote2) =>
      `import(\`\${window.__assetsPath('${appName}',${quote1}${url}${quote2})}\`)`,
  )
}
