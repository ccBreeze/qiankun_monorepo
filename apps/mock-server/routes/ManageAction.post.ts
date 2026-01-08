import { defineEventHandler, readBody } from 'h3'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const generateLogId = () => crypto.randomUUID()

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const fail = (msg: string, data: unknown = null) => ({
  status: 0,
  msg,
  logId: generateLogId(),
  data,
})

// Build-time glob to include all json mocks under data/.
const resolveDataDir = () => {
  const candidates = [
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), 'apps/mock-server/data'),
  ]
  const resolved = candidates.find((candidate) => existsSync(candidate))
  return resolved ?? candidates[0]
}

const dataDir = resolveDataDir()

const isSafeActionName = (actionName: string) =>
  !actionName.includes('/') &&
  !actionName.includes('\\') &&
  !actionName.includes('..')

/** ManageAction 请求体结构 */
interface ManageActionRequest {
  actionName: string
  content: Record<string, unknown>
  clientIsGray?: number
  token?: string
  systemCode?: string
}

/**
 * 根据 actionName 加载对应的 mock 数据
 * actionName: candao.account.login -> data/candao.account.login.json
 */
const loadMockData = async (actionName: string) => {
  if (!isSafeActionName(actionName)) {
    return null
  }

  const filePath = path.join(dataDir, `${actionName}.json`)

  try {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * ManageAction 统一入口
 * POST /ManageAction
 *
 * 根据 actionName 自动匹配 data 目录下的 json 文件
 * 例如: candao.account.login -> data/candao.account.login.json
 */
export default defineEventHandler(async (event) => {
  // 模拟网络延迟
  await delay(300)

  const body = await readBody<ManageActionRequest>(event)
  const { actionName } = body

  // 加载对应的 mock 数据
  const mockData = await loadMockData(actionName)

  if (mockData) {
    return mockData
  }

  // 未找到对应的 mock 数据
  event.node.res.statusCode = 404
  return fail(`未找到 mock 数据: data/${actionName}.json`)
})
