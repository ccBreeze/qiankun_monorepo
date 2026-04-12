---
name: commit
description: 分析暂存区变更，生成符合规范的 commit message 并提交代码。
---

# Git Commit

## 流程

1. 执行 `git status` 和 `git diff --cached` 查看暂存区变更
2. 执行 `git log --oneline -5` 参考最近的提交风格
3. 根据变更内容生成 commit message
4. 确认后执行提交

## Commit Message 规范

遵循 Conventional Commits 格式：`<type>(<scope>): <description>`

### description（首行）

- 只概括核心改动，一句话说明意图
- 不要堆砌细节、包名、文件名

### body（正文）

- 用于列举补充说明，分条书写
- 保持简洁概括，不要罗列从 diff 中即可看到的具体名称（如包名、文件名）

### 示例

```
chore(monorepo): 通过 catalog 统一剩余硬编码依赖版本

- 使用 codemod 迁移硬编码版本到 catalog
- 新增 pnpm Workspace 与 Catalog 指南文档
- sidebar 注册新文档入口
```
