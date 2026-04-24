#!/usr/bin/env node
import { execSync } from 'child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 所有可启动的 dev 服务 —— 唯一数据源
 * 新增应用只需在此追加一条记录，dev [name] 与 dev:all 自动生效
 *
 * @type {Array<{
 *   name: string
 *   cmd: string
 *   color: string
 *   portSource: { type: 'regex' | 'package-json-script', file: string, pattern?: RegExp, scriptName?: string }
 * }>}
 */
const apps = [
  {
    name: 'mock',
    cmd: 'pnpm --filter @breeze/mock-server run dev',
    color: 'yellow',
    portSource: {
      type: 'package-json-script',
      file: 'apps/mock-server/package.json',
      scriptName: 'dev',
    },
  },
  {
    name: 'main',
    cmd: 'pnpm --filter main-app run dev',
    color: 'blue',
    portSource: {
      type: 'regex',
      file: 'apps/main-app/vite.config.ts',
      pattern: /port:\s*(\d+)/,
    },
  },
  {
    name: 'vue3-history',
    cmd: 'pnpm --filter vue3-history run dev',
    color: 'green',
    portSource: {
      type: 'regex',
      file: 'apps/vue3-history/vite.config.ts',
      pattern: /port:\s*(\d+)/,
    },
  },
  {
    name: 'docs',
    cmd: 'pnpm --prefix docs run dev',
    color: 'magenta',
    portSource: {
      type: 'regex',
      file: 'docs/src/.vitepress/config.ts',
      pattern: /port:\s*(\d+)/,
    },
  },
]

function readWorkspaceFile(file) {
  return readFileSync(resolve(process.cwd(), file), 'utf8')
}

function resolveAppPort(app) {
  const source = app.portSource
  const content = readWorkspaceFile(source.file)

  if (source.type === 'regex') {
    const match = content.match(source.pattern)
    if (!match?.[1]) {
      throw new Error(`未能从 ${source.file} 解析 ${app.name} 的端口`)
    }
    return Number(match[1])
  }

  const pkg = JSON.parse(content)
  const script = pkg.scripts?.[source.scriptName]
  const match =
    typeof script === 'string' ? script.match(/--port\s+(\d+)/) : null

  if (!match?.[1]) {
    throw new Error(
      `未能从 ${source.file} 的 ${source.scriptName} 脚本解析 ${app.name} 的端口`,
    )
  }

  return Number(match[1])
}

function printKillPortCommands(appList) {
  console.error('\n检测到 dev 服务异常退出，可按需清理占用端口：')
  const ports = appList.map(resolveAppPort).join(' ')
  console.error(
    `\n# 一次性清理上述全部端口\nfor PORT in ${ports}; do PIDS=$(lsof -ti tcp:$PORT); [ -n "$PIDS" ] && kill -9 $PIDS; done\n`,
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
