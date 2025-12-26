# 项目编码规范

## Monorepo 约定

- 使用 pnpm workspace 管理依赖，跨包依赖统一写成 `workspace:*`/`workspace:^`，禁止使用相对路径引用其他包的源码
- `apps/*` 只放最终应用，`packages/*` 存放可复用库
- **包命名规范**：
  - 包名统一使用 `@breeze/*` 作用域（在 package.json 的 name 字段中定义）
  - 目录名使用简洁的包名，不包含作用域前缀
  - 例如：目录为 `packages/vite-config`，package.json 中 `"name": "@breeze/vite-config"`
- 新增包的 TS 配置应继承根目录 `tsconfig.lib.json`/`tsconfig.node.base.json`，保持 `composite` 与声明输出能力一致
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

### Vue Router 路由命名

- **目录命名**：使用 PascalCase（如 `Demo`、`UserProfile`）
- **文件命名**：使用 PascalCase（如 `AutoImportExample.vue`、`UserSettings.vue`）
- **路由 path**：与目录和文件名保持一致
  - 示例：`/Demo/AutoImportExample`
  - 示例：`/UserProfile/UserSettings`
- **路由 name**：格式为 `目录名-文件名`（使用短横线连接）
  - 示例：`Demo-AutoImportExample`
  - 示例：`UserProfile-UserSettings`

**完整示例**：

```typescript
// 文件：src/views/Demo/AutoImportExample.vue
{
  path: '/Demo/AutoImportExample',
  name: 'Demo-AutoImportExample',
  component: () => import('../views/Demo/AutoImportExample.vue'),
}
```

## 其他约定

- 使用 ESLint 和 Prettier 保持代码风格一致
- 提交前通过 lint-staged 检查代码
- 使用 Conventional Commits 规范提交信息
- 为公共函数和组件编写 JSDoc 注释

## AI 代码修改规范

- 请始终使用中文回答问题，代码注释也使用中文

在修改或新增代码文件后，**必须**执行以下检查以确保代码质量：

1. **自动修复并检查代码**

   对修改的文件运行自动修复和检查：

   ```bash
   # ESLint 自动修复
   pnpm -w run lint:fix [修改的文件路径]

   # 样式自动修复（针对 .vue/.css/.scss 文件）
   pnpm -w run lint:style:fix [修改的文件路径]

   # 格式化代码
   pnpm -w run format
   ```

   如果修改了多个相关文件或核心代码，建议运行全项目检查：

   ```bash
   pnpm -w run lint:fix && pnpm -w run lint:style:fix && pnpm -w run format
   ```

   > 💡 **说明**：
   >
   > - `lint:fix` 会自动修复 ESLint 问题
   > - `lint:style:fix` 会自动修复样式问题
   > - `format` 会统一代码格式
   > - 提交时 lint-staged 会再次自动检查暂存的文件

2. **运行类型检查**（针对 TypeScript 文件）

   ```bash
   cd [对应的包目录] && pnpm run type-check
   ```

3. **检查要求**
   - ✅ 修改的文件必须通过 lint 检查（无错误）
   - ✅ 所有类型错误必须解决
   - ✅ 代码必须经过格式化
   - ⚠️ 如果有无法自动修复的 warning，需要向用户说明原因
   - 🚫 不得提交包含 lint 或类型错误的代码
