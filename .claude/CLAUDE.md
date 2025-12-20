# 项目编码规范

## Monorepo 约定

- 使用 pnpm workspace 管理依赖，跨包依赖统一写成 `workspace:*`/`workspace:^`，禁止使用相对路径引用其他包的源码
- `apps/*` 只放最终应用，`packages/*` 存放可复用库
- **包命名规范**：
  - 包名统一使用 `@breeze/*` 作用域（在 package.json 的 name 字段中定义）
  - 目录名使用简洁的包名，不包含作用域前缀
  - 例如：目录为 `packages/vite-config`，package.json 中 `"name": "@breeze/vite-config"`
- 新增包的 TS 配置应继承根目录 `tsconfig.option.json`/`tsconfig.node.base.json`，保持 `composite` 与声明输出能力一致
- 公共依赖优先提升到根，包内只保留运行/构建必需项，安装/更新依赖在仓库根执行 `pnpm install`

## 技术栈

### TypeScript 优先

- ✅ 所有新代码统一使用 TypeScript（`.ts`、`.tsx`）
- ❌ 避免使用 JavaScript（`.js`、`.jsx`），除非是配置文件
- 📝 为复杂逻辑提供完整的类型定义
- 🎯 充分利用 TypeScript 的类型推导能力

## 命名规范

### 文件命名

**PascalCase（大写驼峰）** - 用于组件文件
**camelCase（小写驼峰）** - 用于普通模块

## 其他约定

- 使用 ESLint 和 Prettier 保持代码风格一致
- 提交前通过 lint-staged 检查代码
- 使用 Conventional Commits 规范提交信息
- 为公共函数和组件编写 JSDoc 注释
