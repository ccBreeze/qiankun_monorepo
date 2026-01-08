/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// vite-plugin-svg-icons 虚拟模块类型声明
declare module 'virtual:svg-icons-register'
