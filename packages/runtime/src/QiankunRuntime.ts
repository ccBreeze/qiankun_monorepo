import { EventEmitter2 } from 'eventemitter2'

const RUNTIME_SINGLETON_KEY = Symbol.for('@breeze/runtime/QiankunRuntime')

class QiankunRuntime {
  private constructor() {}
  static getInstance() {
    const runtimeGlobal = globalThis as RuntimeGlobal
    return (runtimeGlobal[RUNTIME_SINGLETON_KEY] ??= new QiankunRuntime())
  }

  readonly channel = new EventEmitter2()
}

type RuntimeGlobal = typeof globalThis & {
  [key: symbol]: QiankunRuntime | undefined
}

export const qiankunRuntime = QiankunRuntime.getInstance()
