/** 微应用激活规则枚举 */
export const MICRO_APP_ACTIVE_RULE = {
  OCRM: '/ocrm/#',
  VUE3_HISTORY: '/vue3-history',
  BREEZE_CRM_V8: '/crm-v8',
} as const

export type MicroAppActiveRule =
  (typeof MICRO_APP_ACTIVE_RULE)[keyof typeof MICRO_APP_ACTIVE_RULE]
