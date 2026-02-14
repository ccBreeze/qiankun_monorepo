---
title: 类型感知 Linting
---

# 类型感知 Linting

基础配置已包含类型感知规则，通过 Project Service API 自动启用。

同时包含 `typescript-eslint` 的推荐规则集（`typescript-eslint/recommended`）。

> 说明：下表仅列出显式配置的规则，其它规则来自 `typescript-eslint/recommended`。

## 包含的规则

以下为 `packages/eslint-config/src/typescript.ts` 中显式配置的规则：

### 错误级别（error）

| 规则                                             | 描述                     |
| ------------------------------------------------ | ------------------------ |
| `@typescript-eslint/no-floating-promises`        | 禁止未处理的 Promise     |
| `@typescript-eslint/await-thenable`              | 禁止 await 非 Promise    |
| `@typescript-eslint/no-misused-promises`         | 禁止错误使用 Promise     |
| `@typescript-eslint/switch-exhaustiveness-check` | 检查 switch 覆盖所有情况 |

### 警告级别（warn）

| 规则                                               | 描述                                      |
| -------------------------------------------------- | ----------------------------------------- |
| `@typescript-eslint/no-unnecessary-condition`      | 检测不必要的条件判断                      |
| `@typescript-eslint/no-unnecessary-type-assertion` | 检测不必要的类型断言                      |
| `@typescript-eslint/consistent-type-imports`       | 统一使用 type 导入（prefer type-imports） |
| `@typescript-eslint/no-explicit-any`               | 禁止使用 any（推荐使用 unknown）          |

## Project Service 优势

- 零配置：自动发现项目中的 `tsconfig.json`
- Monorepo 友好：无需手动配置多项目路径
- 支持 `.vue` 文件：原生支持 Vue 单文件组件
- 与编辑器一致：使用与 VS Code 相同的类型检查逻辑

## 常见问题与排查

- **找不到 tsconfig**：检查子项目是否有 `tsconfig.json`，并在 `eslint.config.js` 中设置 `parserOptions.tsconfigRootDir` 为 `import.meta.dirname`。
- **auto-imports 未生效**：确认 `src/types/auto-imports.d.ts` 等生成文件已加入项目 `tsconfig` 的 `include`。
- **类型规则误报/漏报**：通常是项目边界不清晰，确保每个子项目有独立 tsconfig，并避免根目录“一把梭”。
- **性能过慢**：优先开启 `--cache`，减少 lint 范围，避免将构建产物与生成文件纳入扫描。
- **根目录脚本报错**：已通过 `allowDefaultProject` 放行 `*.js/*.mjs/*.cjs`，如仍有问题可在子项目配置中单独覆盖。

## 参考

- https://typescript-eslint.io/blog/project-service/
- https://typescript-eslint.io/troubleshooting/typed-linting/monorepos/
- https://eslint.org/docs/latest/use/configure/configuration-files
