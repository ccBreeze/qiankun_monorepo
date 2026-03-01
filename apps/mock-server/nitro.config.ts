import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  // 路由配置
  routeRules: {
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
  },

  // 兼容性配置
  compatibilityDate: '2025-01-01',
})
