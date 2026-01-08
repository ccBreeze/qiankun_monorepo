import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  // 开发服务器端口（通过环境变量 NITRO_PORT 或默认 3100）
  devServer: {
    port: Number(process.env.NITRO_PORT) || 3100,
  },

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
