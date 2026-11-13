/** 格式化子应用入口 URL，统一得到不带末尾斜杠的基础路径 */
export const normalizeMicroAppEntryBase = (entry: string) => {
  if (!entry) return ''
  return entry
    .replace(/\/[^/]*\.html$/, '') // 'https://app/index.html' -> 'https://app'
    .replace(/\/$/, '') // 'https://app/' -> 'https://app'
}
