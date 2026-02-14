# @breeze/eslint-config

Breeze Monorepo 的共享 ESLint 配置包，支持类型感知 linting。

> 参考: [Turborepo ESLint Guide](https://turborepo.com/docs/guides/tools/eslint)

## 📦 导出的配置

| 导出路径                           | 描述                           |
| ---------------------------------- | ------------------------------ |
| `@breeze/eslint-config`            | 完整导出（包含所有配置）       |
| `@breeze/eslint-config/base`       | 基础配置（JS + TS + Prettier） |
| `@breeze/eslint-config/vue3`       | Vue 3 配置（含基础配置）       |
| `@breeze/eslint-config/typescript` | TypeScript 规则（类型感知）    |
| `@breeze/eslint-config/prettier`   | Prettier 集成                  |
| `@breeze/eslint-config/ignores`    | 全局忽略规则                   |

:::tip 选择哪种导出

- `base` 已包含 `typescript` 与 `prettier`，适合大多数非框架项目
- `vue3` 已包含 `base`，适合 Vue 3 + TS 项目
- `typescript`/`prettier`/`ignores` 适合按需组合或局部覆盖
  :::

:::info 版本与依赖要求

- ESLint: `^9.0.0`
- Prettier: `^3.0.0`
- TypeScript: `>=5.0.0`
- Node: 需与 ESLint v9 兼容（以 ESLint 官方要求为准）
  :::

## 🚀 快速开始

### 1. 安装

在 monorepo 中使用 workspace 依赖：

```json [package.json]
{
  "devDependencies": {
    "@breeze/eslint-config": "workspace:*",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 2. 基础项目配置

```javascript [eslint.config.js]
import { base } from '@breeze/eslint-config'

export default [...base]
```

### 3. Vue 3 项目配置

```javascript [eslint.config.js]
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { vue3 } from '@breeze/eslint-config'

export default defineConfigWithVueTs(
  ...vue3,
  // 可选：添加项目特定规则
  {
    name: 'my-app/custom-rules',
    rules: {
      'no-console': 'warn',
    },
  },
)
```

### 4. 按需组合（typescript / prettier / ignores）

```javascript [eslint.config.js]
import eslint from '@eslint/js'
import { typescript, prettier, ignores } from '@breeze/eslint-config'

export default [ignores, eslint.configs.recommended, ...typescript, ...prettier]
```

### 5. Monorepo 项目上下文（tsconfigRootDir + auto-import）

```javascript [eslint.config.js]
import { defineConfigWithVueTs } from '@vue/eslint-config-typescript'
import { vue3 } from '@breeze/eslint-config'
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

export default defineConfigWithVueTs(...vue3, {
  name: 'my-app/auto-import',
  languageOptions: {
    globals: autoImportGlobals.globals,
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

## 🎯 类型感知 Linting

类型感知规则说明与优势见文档：[类型感知 Linting](./typed-linting)。

## ⚙️ 性能优化

### 启用 ESLint 缓存

```json [package.json]
{
  "scripts": {
    "lint": "eslint . --cache --cache-location .eslintcache"
  }
}
```

### Monorepo 最佳实践

1. **依赖集中管理**: ESLint 依赖放在 `@breeze/eslint-config` 包中
2. **配置复用**: 所有项目共享基础配置，仅添加项目特定规则
3. **缓存优化**: 使用 `--cache` 标志，首次运行后可节省 50-90% 时间

## 📚 相关文档

- [架构与设计理念](./architecture)
- [Turborepo ESLint Guide](https://turborepo.com/docs/guides/tools/eslint)
- [TypeScript ESLint - Monorepo Configuration](https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/)
- [TypeScript ESLint - Project Service](https://typescript-eslint.io/blog/project-service/)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
