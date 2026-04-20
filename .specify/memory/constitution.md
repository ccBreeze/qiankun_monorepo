<!--
Sync Impact Report
版本变更: N/A -> 1.0.0
修订原则:
- 新增: 中文优先交付
- 新增: 英文标识与清晰命名
- 新增: 中文用户体验与诊断反馈
- 新增: Clean Code 为默认实现标准
新增章节:
- 附加约束
- 研发流程与合规检查
移除章节:
- 无
需同步的模板与文档:
- ✅ /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/templates/constitution-template.md
- ✅ /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/templates/plan-template.md
- ✅ /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/templates/spec-template.md
- ✅ /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/templates/tasks-template.md
- ✅ /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.claude/CLAUDE.md
- ⚠ pending /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/extensions/git/README.md
- ⚠ pending /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/extensions/git/commands/speckit.git.commit.md
- ⚠ pending /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/extensions/git/commands/speckit.git.initialize.md
- ⚠ pending /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/extensions/git/commands/speckit.git.feature.md
- ⚠ pending /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/extensions/git/commands/speckit.git.remote.md
- ⚠ pending /Users/xingfengli/Desktop/work/github/qiankun_monorepo/.specify/extensions/git/commands/speckit.git.validate.md
后续 TODO:
- TODO(DOC_LOCALIZATION): 将历史遗留的扩展说明文档与命令文档逐步迁移为简体中文。
-->
# learn_monorepo 项目宪章

## 核心原则

### 一、中文优先交付
所有项目文档、设计产物、代码注释、提交信息以及协作记录必须使用简体中文。新建或修改
模板、规范、脚本帮助文本时，默认也必须使用简体中文；仅当第三方协议、配置键名或工具
关键字要求保留原文时，才允许局部保留英文。这样做是为了让团队协作、代码评审与知识沉淀
始终处于统一语境，减少理解偏差与沟通成本。

### 二、英文标识与清晰命名
代码中的变量名、函数名、类型名、导出符号和目录内业务标识必须使用语义明确的英文命名。
禁止使用拼音、难以理解的缩写或与职责不符的名称；如果某段实现需要大量注释才能说明含义，
必须优先通过重构改善结构，再使用中文注释补充必要背景。这样做是为了保证代码与生态习惯
一致，同时保持可搜索性、可维护性与跨团队可读性。

### 三、中文用户体验与诊断反馈
用户界面文本、表单提示、校验文案、错误提示、控制台日志、运行告警与诊断输出必须默认提
供简体中文。若第三方平台强制返回英文信息，调用边界必须补充中文上下文或转换说明，避免
将未经处理的英文错误直接暴露给用户。这样做是为了让最终用户与维护者都能快速理解系统状
态，缩短排障与支持路径。

### 四、Clean Code 为默认实现标准
所有代码变更必须遵循 Clean Code 原则：单一职责、避免重复、清晰边界、函数短小、模块低
耦合高内聚、删除死代码，并优先选择简单直接的实现。任何新增复杂抽象、兼容层、跨模块隐
式耦合或临时补丁的方案，都必须在计划、评审或提交说明中明确其必要性、适用范围与退出条
件。这样做是为了持续控制复杂度，让代码在未来仍然容易阅读、测试与演进。

## 附加约束

- 新增或修改项目文档时，必须同步检查标题、示例、注释与说明文字是否为简体中文。
- 代码注释只用于解释背景、约束或不直观的实现，禁止编写重复代码字面含义的无效注释。
- 提交信息必须以简体中文描述变更目的与影响，允许保留必要的英文技术关键词，但不可整条
  提交信息写成英文。
- 需求、计划、任务拆解中只要涉及用户界面、错误提示或日志输出，必须明确其中文化策略。

## 研发流程与合规检查

- 在规格、计划、任务与评审阶段，必须显式检查本宪章的四项核心原则，并将例外情况记录在
  对应文档中。
- 方案设计必须优先通过拆分职责、减少重复与收窄边界来解决复杂度问题，不得以“后续再重
  构”为理由放宽 Clean Code 要求。
- 代码评审必须核对英文标识是否清晰、中文注释是否必要、界面与日志文案是否为简体中文，
  以及是否引入了未经说明的复杂结构。
- 历史遗留的英文文档或输出允许分阶段治理，但只要本次变更触达相关内容，就必须一并完成
  中文化，或在评审记录中说明延期原因与后续计划。

## 治理

本宪章高于仓库内的临时约定、个人习惯与未同步更新的模板说明。任何修订都必须通过文档变
更提出，并同步评估受影响的模板、脚本、协作文档与自动化配置。

版本管理遵循语义化规则：新增原则或新增强制章节记为 MINOR，调整或重定义既有原则记为
MAJOR，仅做措辞澄清、格式修订或非语义调整记为 PATCH。若无法明确判断升级级别，必须在
修订说明中给出理由后再发布。

合规检查是每次规格制定、计划评审、任务拆解、代码评审与发布验收的必选项。发现违背宪章
的变更时，必须先修正实现或补齐豁免说明，再进入下一阶段。

**版本**: 1.0.0 | **批准日期**: 2026-04-21 | **最近修订**: 2026-04-21
