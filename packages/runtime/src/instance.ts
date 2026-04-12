import { QiankunRuntime } from './QiankunRuntime'

declare global {
  interface Window {
    QiankunRuntime: QiankunRuntime
  }
}

export const createContext = () => {
  if (typeof window === 'undefined') {
    throw new Error('[QiankunRuntime] 浏览器环境不可用')
  }

  return (window.QiankunRuntime ??= new QiankunRuntime())
}

createContext()
