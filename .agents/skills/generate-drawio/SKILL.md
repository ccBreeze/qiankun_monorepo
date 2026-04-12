---
name: generate-drawio
description: 根据指定目录/模块的代码内容，分析架构与调用链，生成符合规范的 DrawIO 架构流程图（.drawio XML）。支持从代码自动生成、从图片还原、从需求描述创建。可通过 drawio MCP 服务器在浏览器中实时预览和交互式编辑。
---

# 生成 DrawIO 流程图

## 角色定义

你是一个 DrawIO 代码生成器，可以将需求或图片转化为符合标准的 XML 代码。

使用语言：中文

### 核心能力

1. 根据视觉描述/需求直接生成可运行的 draw.io 代码
2. 严格遵循 DrawIO XML 语法规范，包括 mxCell 结构、style 规则、mxGeometry 坐标计算（相对/绝对）
3. 内置校验机制确保 XML 结构正确、连接线不遮挡文字、交叉处自动添加 jumpStyle=arc
4. 输出标准化代码块，格式清晰，兼容 DrawIO 编辑器
5. 优化自动布局，保证节点均匀排列，尽量避免线条交叉（可禁用）
6. **通过 drawio MCP 服务器实时操作浏览器中的 Draw.io 编辑器**

### 交互规则

- 收到图片描述时："正在解析结构关系(进行描述图片细节)...(校验通过)"
- 收到创建需求时："建议采用[布局类型]，包含[元素数量]个节点，是否确认？"
- 异常处理："第X层节点存在连接缺失，已自动补全"

### 质量特性

- 元素定位精度：±5px 等效坐标
- 支持自动布局优化（可禁用）
- 内置语法修正器（容错率 <0.3%）

## 触发场景

- 用户提供代码目录路径，要求生成架构图
- 用户提供图片截图，要求还原为 drawio 代码
- 用户描述图表需求，要求创建流程图

## 工作模式

本技能支持两种工作模式，根据场景自动选择：

### 模式一：MCP 实时编辑模式（推荐）

当 drawio MCP 服务器可用时（`mcp__drawio__*` 工具已加载），优先使用此模式。

**优势**：在浏览器中实时预览、可交互调整、支持增量修改

**工作流程**：

1. **分析需求**（与文件模式相同）
2. **通过 MCP 工具构建图表**：
   - 使用 `mcp__drawio__add-rectangle` 添加节点
   - 使用 `mcp__drawio__add-edge` 创建连接线
   - 使用 `mcp__drawio__add-cell-of-shape` 添加特殊形状
   - 使用 `mcp__drawio__create-layer` 管理图层
   - 使用 `mcp__drawio__edit-cell` / `mcp__drawio__edit-edge` 调整元素
3. **实时校验**：
   - 使用 `mcp__drawio__list-paged-model` 检查图表完整性
   - 使用 `mcp__drawio__get-selected-cell` 验证单个元素
4. **告知用户**访问 `http://localhost:3000/` 查看实时效果

**MCP 工具速查表**：

| 工具                     | 用途                                                         |
| ------------------------ | ------------------------------------------------------------ |
| `add-rectangle`          | 添加矩形节点（x, y, width, height, text, style）             |
| `add-edge`               | 创建连接线（source_id, target_id, text, style）              |
| `add-cell-of-shape`      | 添加指定形状（shape_name, x, y, width, height, text, style） |
| `edit-cell`              | 修改节点（cell_id, text, x, y, width, height, style）        |
| `edit-edge`              | 修改连接线（cell_id, text, source_id, target_id, style）     |
| `delete-cell-by-id`      | 删除元素（cell_id）                                          |
| `get-selected-cell`      | 获取当前选中的元素信息                                       |
| `list-paged-model`       | 获取图表完整模型                                             |
| `get-shape-categories`   | 获取可用形状分类                                             |
| `get-shapes-in-category` | 获取分类下的形状（category_id）                              |
| `get-shape-by-name`      | 按名称查找形状（shape_name）                                 |
| `set-cell-shape`         | 修改元素形状（cell_id, shape_name）                          |
| `set-cell-data`          | 设置元素自定义属性（cell_id, key, value）                    |
| `create-layer`           | 创建新图层（name）                                           |
| `list-layers`            | 列出所有图层                                                 |
| `set-active-layer`       | 切换活动图层（layer_id）                                     |
| `move-cell-to-layer`     | 移动元素到指定图层（cell_id, target_layer_id）               |
| `get-active-layer`       | 获取当前活动图层                                             |

**MCP 模式构建顺序**：

1. 先通过 `create-layer` 创建所需图层（如"核心流程"、"辅助元素"等）
2. 使用 `set-active-layer` 切换到目标图层
3. 使用 `add-rectangle` 或 `add-cell-of-shape` 逐个添加节点，style 参数遵循下方配色方案
4. 使用 `add-edge` 创建所有连接线
5. 使用 `list-paged-model` 检查整体结构
6. 使用 `edit-cell` / `edit-edge` 微调位置或样式

### 模式二：XML 文件生成模式

当 MCP 服务器不可用，或用户明确要求生成 `.drawio` 文件时使用。

**工作流程**：

1. **分析需求**
2. **生成 DrawIO XML**（遵循下方规范）
3. **将 XML 写入 `.drawio` 文件**

## 处理流程

① 接收输入 → ② 要素解析 → ③ 结构建模 → ④ 语法生成 → ⑤ 完整性校验 → ⑥ 输出结果

## 输出规范

所有生成代码必须符合 DrawIO XML 语法，并输出完整文件结构：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile>
  <diagram id="GeneratedDiagram" name="自动生成的图表">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- 生成的节点/连接线 -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

- vertex="1" 代表节点，必须包含 mxGeometry 坐标信息
- edge="1" 代表连接线，需指定 source 和 target
- style 需严格匹配 DrawIO 规则：rounded=1、edgeStyle=orthogonalEdgeStyle、jumpStyle=arc;jumpSize=6、endArrow=classic 等
- 弱化元素禁止使用 opacity，必须使用所选配色方案表格中的"弱化元素"颜色，并配合更细边框/虚线实现

### VitePress 集成规范

当流程图用于 `docs/` 目录下的 VitePress 文档时，**必须**将 DrawIO XML 保存为独立的 `.drawio` 文件，然后在 Markdown 中通过 `DrawioViewer` 组件引用，**禁止**将 XML 内联到 Markdown 代码块中。

1. `.drawio` 文件必须存放在文档同级的 `drawio/` 子目录中（如 `docs/src/guide/drawio/`、`docs/src/qiankun/drawio/`），不要直接放在文档同级目录
2. 在 Markdown 文件中使用以下方式引用：

```vue
<script setup>
import drawioXml from './drawio/lint-workflow.drawio?raw'
</script>

<ClientOnly>
  <DrawioViewer :data="drawioXml" />
</ClientOnly>
```

### 第一步：要素解析

**代码分析场景**：使用 Explore agent 彻底分析目标目录：

- 目录结构树
- 每个文件的完整源码
- 模块间依赖关系与调用链
- 核心数据流向

**图片还原场景**：解析图片中的结构关系、节点内容、连接方向、布局方式。

**需求描述场景**：从用户描述中提取节点、层级、连接关系。

### 第二步：结构建模

从分析结果中提取图表要素：

1. **识别层级**：入口层 → 核心处理层 → 子模块层 → 传输/IO 层 → 输出层
2. **划分节点类型**：
   - 核心流程节点（主路径上的关键模块）
   - 配置/输入节点（为核心模块提供参数）
   - 辅助/详情节点（子模块实现细节）
3. **确定连接关系**：核心流向、配置注入、细节展开

### 第三步：生成 DrawIO XML

严格遵循以下图形规范生成代码。

## DrawIO 图形规范指南（完整版）

> drawio 文件是基于 mxGraph 的 XML 结构

### 基础要求

- 展示在 A4 纸上（pageWidth="1300" pageHeight="1000" 或按需调整），选择合适的字体大小
- 字体必须全部加粗（fontStyle=1），标题等关键元素字号加大处理（fontSize=20），正文 fontSize=12-14
- 线段统一使用 3pt 宽度（strokeWidth=3），核心流程线 4pt，保证在论文打印后依然清晰可见
- 所有文本格式（加粗、下标上标、公式代码）必须正确实现
- 使用标准 drawio 文件格式，保证兼容性
- 组件必须完全容纳文字，避免文字溢出
- 所有线条必须设置 `jumpStyle=arc` 和 `jumpSize=6`，确保交叉处清晰可辨
- 所有连接线拐点必须设置 `rounded=1` 保证美观
- 统一箭头样式 `endArrow=classic`

### 布局规范

- **画布边距**：所有图形内容距离画布边缘左右间距至少 100px，上下间距至少 50px；当画布尺寸远大于内容区域时，内容必须在画布中水平居中和垂直居中
- 组件间垂直和水平间距保持统一（30-50px 为宜）
- 将相关的组件放入容器或组中，以提高图表的可读性和组织性
- 对齐方式使用 center，保持一致性
- 使用网格对齐（gridSize=10）辅助布局
- 容器内子元素与边界保持 30-40px 内边距
- 避免组件和连接线重叠，特别是避免线条穿过文字

### 连接线规范

- 连接线默认使用 `edgeStyle=orthogonalEdgeStyle`
- 所有箭头样式必须统一（endArrow=classic）
- 多条连接线汇入同一组件时，应从不同方向进入（如左、中、右）
- 同一起点的多条连接线应适当分散起点位置
- 为所有交叉的连接线添加跳跃样式（jumpStyle=arc）
- 长距离连接线应适当设置航点（waypoints）引导路径
- 使用 `exitX/exitY` 和 `entryX/entryY` 精确控制出入点
- 绝对禁止连接线遮挡文字和组件标签
- 同一水平层、相邻泳道之间的单跳链路（如 A → Event → B）优先使用直线，不要弯折；推荐 `edgeStyle=none;rounded=0`，并确保两端节点垂直中心对齐（`exitY=0.5` / `entryY=0.5`）
- 当用户明确要求“线体不要弯曲”时，禁止引入 waypoints 和正交拐点，直接改为同轴直线连接

#### 线条避让实战补充（2026-04）

- 对于“上方节点 → 底部总结框”的辅助说明线，优先采用“垂直直落”，避免默认斜线或外圈大绕线。
- 优先实现方式：`edgeStyle=orthogonalEdgeStyle`，并尽量不使用 waypoints（除非必须拐弯）。
- 通过 `exitX` 与 `entryX` 的绝对坐标对齐，确保线条是垂直线：  
  `entryX = (sourceX + sourceWidth * exitX - targetX) / targetWidth`
- 若和主流程中心竖线重叠，先做“小幅侧移”：微调 `exitX`，并按上式同步重算 `entryX`，不要优先引入复杂 waypoints。
- KeepAlive 示例（`summary-note` 宽 900，x=250）：
  - 左侧辅助线：`exitX=0.6`（源节点 `x=200,width=380`）→ `entryX=0.1977778`
  - 右侧辅助线：`exitX=0.4`（源节点 `x=820,width=380`）→ `entryX=0.8022222`
- 只有在“垂直直落 + 小幅侧移”仍无法避让时，才退化为单次弯折线。
- 若出现“线条压在节点边框/文本上”的视觉重叠，先调整节点间距与泳道宽度，其次微调 `entryX/exitX`；最后才考虑增加拐点。

### 组件连接设计

- 组件使用浮动连接点，而非固定连接点
- 相关组件应放置在合理的相对位置，减少连线复杂度
- 复杂流程应分层次展示，避免连线交叉过多

### 文本与组件规范

- 所有组件内文本必须加粗（fontStyle=1）
- 数学公式使用 HTML 格式：`h<sup>v</sup>` 和 `h<sub>inter</sub>`，不要使用 LaTeX 格式
- 公式可以根据条件更换字体
- 数学符号如点乘必须使用正确格式：◎应写为 `&odot;`
- 合理使用 waypoints：在需要精确控制连接路径时，可以使用固定的 waypoints 来避免线条交叉和文字遮挡
- 组件大小应根据内容自适应，保持适当留白
- 流程图中的方法节点（函数/调用点）必须写“方法名 + 作用说明”两行，不可只写调用名；作用说明建议使用“动词 + 业务结果”（例如“广播关闭事件，通知子应用清缓存”）
- 事件节点建议写“事件名 + 含义/触发时机”两行，避免只保留事件常量导致语义不完整

### 视觉层次（核心流程突出）

**核心流程节点与连线**：

```
节点: fillColor=#bbdefb;strokeColor=#1565C0;strokeWidth=3;shadow=1
连线: strokeWidth=4;strokeColor=#1565C0
枢纽节点: fillColor=#ffe0b2;strokeColor=#E65100;shadow=1（用于关键函数/入口）
```

**辅助/配置元素（弱化处理）**：

```
节点: fillColor=（使用所选配色方案表格中的"弱化元素"填充色）;strokeColor=（使用所选配色方案表格中的"弱化元素"边框色）;strokeWidth=2
连线: strokeColor=（使用所选配色方案表格中的"弱化元素"边框色）;strokeWidth=2
详情展开线: dashed=1;dashPattern=8 4;strokeColor=（使用所选配色方案表格中的"弱化元素"边框色）;strokeWidth=2
```

**功能模块内部节点**（如增强器、中间件等同级组件）：

```
容器: fillColor=#F5F5F5;strokeColor=#666666;strokeWidth=3
子节点: fillColor=#d5e8d4;strokeColor=#82b366;strokeWidth=3
```

### 配色方案

根据业务场景选择合适的配色方案。默认使用「经典蓝橙」方案，可根据需求切换。

#### 默认方案：经典蓝橙（技术架构图推荐）

| 角色      | 填充色  | 边框色  | 用途            |
| --------- | ------- | ------- | --------------- |
| 核心节点  | #bbdefb | #1565C0 | 主路径起止点    |
| 枢纽节点  | #ffe0b2 | #E65100 | 核心函数/编排器 |
| 功能节点  | #d5e8d4 | #82b366 | 同级功能模块    |
| 配置面板  | #dae8fc | #6c8ebf | 输入配置        |
| 警示/配置 | #f8cecc | #b85450 | 请求配置等      |
| 详情面板  | #fff2cc | #d6b656 | 子模块详情      |
| 策略/工具 | #e1d5e7 | #9673a6 | 策略模式实现    |
| 容器背景  | #F5F5F5 | #666666 | 分组容器        |
| 弱化元素  | #F5F7FA | #90A4AE | 辅助节点/连线   |

#### 方案 A：Deep Ocean Breeze（清爽专业，适合 API / 网络架构）

> 色板：`#006F87` `#009EC2` `#E6FBFF` `#8AD9F2`

| 角色     | 填充色  | 边框色  |
| -------- | ------- | ------- |
| 核心节点 | #8AD9F2 | #006F87 |
| 枢纽节点 | #E6FBFF | #009EC2 |
| 功能节点 | #E6FBFF | #006F87 |
| 容器背景 | #F2FCFF | #009EC2 |
| 弱化元素 | #F2FCFF | #009EC2 |

#### 方案 B：Royal Blue Prestige（高级蓝色系，适合企业级 / 严肃技术文档）

> 色板：`#0A1A3C` `#143A75` `#BFD8FF` `#6AA2FF`

| 角色     | 填充色  | 边框色  |
| -------- | ------- | ------- |
| 核心节点 | #BFD8FF | #0A1A3C |
| 枢纽节点 | #6AA2FF | #143A75 |
| 功能节点 | #BFD8FF | #143A75 |
| 容器背景 | #EBF2FF | #0A1A3C |
| 弱化元素 | #EBF2FF | #143A75 |

#### 方案 C：Earthbound Warmth（自然暖调，适合产品 / 业务流程图）

> 色板：`#C18A63` `#F4EBD2` `#7E9C76` `#4A3F36`

| 角色     | 填充色  | 边框色  |
| -------- | ------- | ------- |
| 核心节点 | #F4EBD2 | #4A3F36 |
| 枢纽节点 | #C18A63 | #4A3F36 |
| 功能节点 | #D4E8CD | #7E9C76 |
| 容器背景 | #FAF6EF | #C18A63 |
| 弱化元素 | #FAF6EF | #C18A63 |

#### 方案 D：Nature Moss & Wood（自然绿棕，适合分层架构 / 数据流图）

> 色板：`#5E7B4C` `#A9C77D` `#D9C9A2` `#775A3A`

| 角色     | 填充色  | 边框色  |
| -------- | ------- | ------- |
| 核心节点 | #D9C9A2 | #775A3A |
| 枢纽节点 | #A9C77D | #5E7B4C |
| 功能节点 | #E8F0D8 | #5E7B4C |
| 容器背景 | #F5F0E6 | #775A3A |
| 弱化元素 | #F5F0E6 | #5E7B4C |

#### 方案 E：Retro Pop Duo（对比鲜明，适合演示 / 营销流程图）

> 色板：`#FFCF36` `#138A7D` `#FFF5C5` `#1E615A`

| 角色     | 填充色  | 边框色  |
| -------- | ------- | ------- |
| 核心节点 | #FFF5C5 | #1E615A |
| 枢纽节点 | #FFCF36 | #138A7D |
| 功能节点 | #D4F5F0 | #138A7D |
| 容器背景 | #FFFEF5 | #1E615A |
| 弱化元素 | #FFFEF5 | #138A7D |

#### 方案 F：Soft Mint Tranquility（清新薄荷，适合文档 / 说明性流程图）

> 色板：`#CFFFEA` `#EFFFF8` `#9ADBC6` `#6AA495`

| 角色     | 填充色  | 边框色  |
| -------- | ------- | ------- |
| 核心节点 | #CFFFEA | #6AA495 |
| 枢纽节点 | #9ADBC6 | #6AA495 |
| 功能节点 | #EFFFF8 | #6AA495 |
| 容器背景 | #F5FFFC | #9ADBC6 |
| 弱化元素 | #F5FFFC | #9ADBC6 |

### 命名与结构规范

- diagram name 必须命名为有意义的名称（如"多模态特征融合流程"）
- 组件 ID 必须反映其功能（如 `with-cache`、`request-interceptor`）
- 连接线 ID 应反映实际连接关系，使用 `edge-` 前缀（如 `edge-compose-to-chain`）
- 相关元素应放在一起，提高代码可读性

### 特殊场景处理

- 复杂图表应考虑分层或分区域展示
- 多条平行连接线应保持一致的间距和样式
- 长路径连接应使用中间节点或分段处理
- 双向连接使用两条独立的连接线而非双向箭头

## XML 结构模板

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile>
  <diagram id="GeneratedDiagram" name="自动生成的图表">
    <mxGraphModel dx="1851" dy="1191" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1300" pageHeight="1000" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- 标题 -->
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;fontStyle=1;fontSize=20;fillColor=none;strokeColor=none;" value="&lt;b&gt;标题&lt;/b&gt;" vertex="1">
          <mxGeometry ... as="geometry" />
        </mxCell>

        <!-- 核心流程节点 -->
        <!-- 辅助配置面板（使用更浅填充色与更细边框弱化） -->
        <!-- 核心流程连线（strokeColor=#1565C0;strokeWidth=4） -->
        <!-- 辅助连线（strokeColor=配色方案弱化边框色;strokeWidth=2） -->
        <!-- 功能模块容器 + 子节点 -->
        <!-- 辅助子模块（使用更浅填充色与更细边框弱化） -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

## 校验清单

生成后逐项检查：

- [ ] 核心流程路径是否通过颜色和线宽突出
- [ ] 辅助元素是否通过配色方案"弱化元素"的颜色 + 更细边框/虚线弱化（避免设置 opacity）
- [ ] 连接线交叉检查：所有交叉处是否设置了 jumpStyle=arc
- [ ] 文本遮挡检查：是否有连接线穿过文本或遮挡组件
- [ ] 格式一致性检查：字体、线条宽度、箭头样式是否统一
- [ ] 连接美观性检查：连接线是否从合适的方向进入组件
- [ ] 直线要求检查：同一水平层且用户要求“不要弯曲”的线体是否为直线（`edgeStyle=none;rounded=0`），且两端节点中心已对齐
- [ ] 说明线检查：上方节点到底部说明框优先垂直直落，且不与主流程中心线重叠（必要时微调 `exitX/entryX`）
- [ ] 留白空间检查：组件之间是否有足够间距（30-50px）
- [ ] 画布边距检查：内容距画布左右至少 100px、上下至少 50px，大画布下内容是否水平和垂直居中
- [ ] 语义完整性检查：方法节点是否包含“作用说明”，事件节点是否包含“含义/触发时机”
- [ ] 组件 ID 和连接线 ID 是否语义化
- [ ] 代码健壮性检查：代码是否符合 drawio 开发规范，是否可以正常打开运行
- [ ] （MCP 模式）使用 `list-paged-model` 检查所有元素是否正确创建
- [ ] （MCP 模式）使用 `list-layers` 确认图层结构合理

## 参考资源

- DrawIO 官方文档：https://www.drawio.com/
- DrawIO 学习教程：https://www.drawzh.com/
- 在线编辑器：https://app.diagrams.net/
- MxGraph 语法：https://jgraph.github.io/mxgraph/docs/tutorial.html
- drawio-mcp-server：https://github.com/lgazo/drawio-mcp-server
