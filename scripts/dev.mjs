#!/usr/bin/env node
import { execSync } from 'child_process'

/**
 * 所有可启动的 dev 服务 —— 唯一数据源
 * 新增应用只需在此追加一条记录，dev [name] 与 dev:all 自动生效
 *
 * @type {Array<{ name: string, cmd: string, color: string }>}
 */
const apps = [
  {
    name: 'mock',
    cmd: 'pnpm --filter @breeze/mock-server run dev',
    color: 'yellow',
  },
  {
    name: 'main',
    cmd: 'pnpm --filter main-app run dev',
    color: 'blue',
  },
  {
    name: 'vue3-history',
    cmd: 'pnpm --filter vue3-history run dev',
    color: 'green',
  },
  {
    name: 'docs',
    cmd: 'pnpm --prefix docs run dev',
    color: 'magenta',
  },
]

function run(target) {
  // all：用 concurrently 带颜色标签启动所有
  if (!target || target === 'all') {
    const names = apps.map((a) => a.name).join(',')
    const colors = apps.map((a) => a.color).join(',')
    const cmds = apps.map((a) => `"${a.cmd}"`).join(' ')
    execSync(`concurrently -n ${names} -c ${colors} ${cmds}`, {
      stdio: 'inherit',
      shell: true,
    })
    return
  }

  const app = apps.find((a) => a.name === target)
  if (!app) {
    console.error(`未知目标: "${target}"`)
    console.error(`可用选项: all, ${apps.map((a) => a.name).join(', ')}`)
    process.exit(1)
  }
  execSync(app.cmd, { stdio: 'inherit' })
}

run(process.argv[2])
