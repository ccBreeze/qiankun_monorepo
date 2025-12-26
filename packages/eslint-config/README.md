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

## 🚀 快速开始

### 1. 安装

在 monorepo 中使用 workspace 依赖：

```json
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

```javascript
// eslint.config.js
import { base } from '@breeze/eslint-config'

export default [...base]
```

### 3. Vue 3 项目配置

```javascript
// eslint.config.js
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

## 🎯 类型感知 Linting

基础配置已包含类型感知规则，通过 **Project Service API** 自动启用！

### 包含的规则

| 规则                            | 级别  | 描述                     |
| ------------------------------- | ----- | ------------------------ |
| `no-floating-promises`          | error | 禁止未处理的 Promise     |
| `await-thenable`                | error | 禁止 await 非 Promise    |
| `no-misused-promises`           | error | 禁止错误使用 Promise     |
| `switch-exhaustiveness-check`   | error | 检查 switch 覆盖所有情况 |
| `no-unnecessary-condition`      | warn  | 检测不必要的条件判断     |
| `no-unnecessary-type-assertion` | warn  | 检测不必要的类型断言     |

### Project Service 优势

- ✅ **零配置** - 自动发现项目中的 `tsconfig.json`
- ✅ **Monorepo 友好** - 无需手动配置多项目路径
- ✅ **支持 .vue 文件** - 原生支持 Vue 单文件组件
- ✅ **与编辑器一致** - 使用与 VS Code 相同的类型检查逻辑

## ⚙️ 性能优化

### 启用 ESLint 缓存

```json
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

- [Turborepo ESLint Guide](https://turborepo.com/docs/guides/tools/eslint)
- [TypeScript ESLint - Monorepo Configuration](https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/)
- [TypeScript ESLint - Project Service](https://typescript-eslint.io/blog/project-service/)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
