---
name: 替换-getcssvar
description: 将 Vue/CSS/SCSS 中的 getcssvar('token') 替换为 apps/main-app/src/assets/theme.css 中对应的具体值，并解析 --candao-crm-* 与 var() 引用链；当需要去除 getcssvar 依赖时使用。
---

# 替换 getcssvar

## 概述

将 getcssvar('token') 内联为 apps/main-app/src/assets/theme.css 中的具体值。
遇到 var(--candao-crm-\*) 时，持续解析到字面值为止。

## 流程

1. 在目标文件中定位 getcssvar。
2. 将 token 转成主题变量名：`--candao-crm-<token>`。
3. 在 `apps/main-app/src/assets/theme.css` 中查找该变量。
4. 解析取值：
   - 若为字面值（hex、rgb、px 等），直接使用。
   - 若为 `var(--candao-crm-...)`，继续追踪直到得到字面值。
5. 用字面值替换 `getcssvar('token')`。
6. 重复处理全部出现位置，保持原有格式。

## 命令

使用 `rg` 查找使用位置与变量：

```bash
rg -n "getcssvar\\(" <target-file>
rg -n "--candao-crm-<token>" apps/main-app/src/assets/theme.css
```
