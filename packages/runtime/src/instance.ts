import { QiankunRuntime } from './QiankunRuntime'

declare global {
  interface Window {
    QiankunRuntime?: QiankunRuntime
  }
}

const GLOBAL_RUNTIME_KEY = 'QiankunRuntime' as const

export const createContext = () => {
  if (typeof window === 'undefined') {
    throw new Error('[QiankunRuntime] 浏览器环境不可用')
  }

  return (window[GLOBAL_RUNTIME_KEY] ??= new QiankunRuntime())
}

export const QiankunRuntimeInstance = createContext()
