#!/usr/bin/env node
import { execSync } from 'child_process'

/**
 * 所有可启动的 dev 服务 —— 唯一数据源
 * 新增应用只需在此追加一条记录，dev [name] 与 dev:all 自动生效
 *
 * @type {Array<{ name: string; cmd: string; color: string; port: number }>}
 */
const apps = [
  {
    name: 'mock',
    cmd: 'pnpm --filter @breeze/mock-server run dev',
    color: 'yellow',
    port: 8200,
  },
  {
    name: 'main',
    cmd: 'pnpm --filter main-app run dev',
    color: 'blue',
    port: 8100,
  },
  {
    name: 'vue3-history',
    cmd: 'pnpm --filter vue3-history run dev',
    color: 'green',
    port: 8101,
  },
  {
    name: 'ocrm',
    cmd: 'pnpm --filter ocrm run dev',
    color: 'cyan',
    port: 8102,
  },
  {
    name: 'vue3-crm-v8',
    cmd: 'pnpm --filter vue3-crm-v8 run dev',
    color: 'gray',
    port: 8103,
  },
  {
    name: 'docs',
    cmd: 'pnpm --prefix docs run dev',
    color: 'magenta',
    port: 8300,
  },
]

function printKillPortCommands(appList) {
  console.error('\n检测到 dev 服务异常退出，可按需清理占用端口：')
  const ports = appList.map((a) => a.port).join(' ')
  console.error(
    `\n# 一次性清理上述全部端口\nfor PORT in ${ports}; do PIDS=$(lsof -nP -tiTCP:$PORT -sTCP:LISTEN); [ -n "$PIDS" ] && kill -9 $PIDS; done\n`,
  )
}

function run(target) {
  // all：用 concurrently 带颜色标签启动所有
  if (!target || target === 'all') {
    const names = apps.map((a) => a.name).join(',')
    const colors = apps.map((a) => a.color).join(',')
    const cmds = apps.map((a) => `"${a.cmd}"`).join(' ')
    try {
      execSync(
        `concurrently --kill-others-on-fail -n ${names} -c ${colors} ${cmds}`,
        {
          stdio: 'inherit',
          shell: true,
        },
      )
    } catch (error) {
      printKillPortCommands(apps)
      throw error
    }
    return
  }

  const app = apps.find((a) => a.name === target)
  if (!app) {
    console.error(`未知目标: "${target}"`)
    console.error(`可用选项: all, ${apps.map((a) => a.name).join(', ')}`)
    process.exit(1)
  }
  try {
    execSync(app.cmd, { stdio: 'inherit' })
  } catch (error) {
    printKillPortCommands([app])
    throw error
  }
}

run(process.argv[2])
