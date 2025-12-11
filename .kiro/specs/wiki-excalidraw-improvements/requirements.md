# Requirements Document

## Introduction

本文档定义了 Novel Editor 桌面应用的 Wiki 系统整合与 Excalidraw 绘图功能改进需求。主要目标是：

1. 清理系统中残留的角色（characters）和世界观（world）模块，统一为 Wiki 系统
2. 完善 Wiki 功能，包括 @ 自动补全和类似维基百科的悬浮预览
3. 修复 Excalidraw 绘图功能无法正常显示的问题
4. 优化绘图界面与编辑器的集成体验

## Glossary

- **Wiki**: 统一的知识管理系统，用于管理角色、地点、物品等各种类型的自定义内容
- **Wiki Entry**: Wiki 条目，包含名称、别名、标签和详细描述内容
- **Mention**: 提及功能，在编辑器中使用 @ 符号引用 Wiki 条目
- **Hover Preview**: 悬浮预览，鼠标悬停在提及内容上时显示的预览卡片
- **Excalidraw**: 开源的手绘风格绘图工具，集成在编辑器中
- **Drawing Workspace**: 绘图工作区，用于创建和编辑绘图的界面
- **Lexical Editor**: 应用使用的富文本编辑器框架

## Requirements

### Requirement 1: 清理残留的角色和世界观模块

**User Story:** 作为开发者，我希望移除系统中残留的角色（characters）和世界观（world）模块代码，这样系统只保留统一的 Wiki 模块，减少代码冗余和用户困惑。

#### Acceptance Criteria

1. WHEN 用户查看路由系统 THEN 系统 SHALL 不包含 /characters 和 /world 路由
2. WHEN 用户查看 Activity Bar THEN 系统 SHALL 不显示角色和世界观相关的独立按钮
3. WHEN 系统启动 THEN 系统 SHALL 不加载任何角色或世界观相关的组件
4. WHEN 代码库被检查 THEN 系统 SHALL 不包含废弃的角色和世界观相关文件

### Requirement 2: Wiki 条目管理功能

**User Story:** 作为作者，我希望能够创建和管理 Wiki 条目，包括名称、别名、标签和详细描述，这样我可以构建小说的知识库。

#### Acceptance Criteria

1. WHEN 用户创建 Wiki 条目 THEN 系统 SHALL 允许设置条目名称
2. WHEN 用户编辑 Wiki 条目 THEN 系统 SHALL 允许添加和删除别名
3. WHEN 用户编辑 Wiki 条目 THEN 系统 SHALL 允许添加和删除标签
4. WHEN 用户编辑 Wiki 条目 THEN 系统 SHALL 提供富文本编辑器用于编写详细描述
5. WHEN 用户删除 Wiki 条目 THEN 系统 SHALL 显示确认对话框并在确认后删除条目

### Requirement 3: @ 自动补全功能

**User Story:** 作为作者，我希望在写作时使用 @ 符号能够自动补全 Wiki 条目，这样我可以快速引用已定义的角色、地点等内容。

#### Acceptance Criteria

1. WHEN 用户在编辑器中输入 @ 符号 THEN 系统 SHALL 显示 Wiki 条目的下拉列表
2. WHEN 用户继续输入字符 THEN 系统 SHALL 根据输入内容过滤 Wiki 条目列表
3. WHEN 过滤 Wiki 条目 THEN 系统 SHALL 匹配条目名称、别名和标签
4. WHEN 用户选择一个 Wiki 条目 THEN 系统 SHALL 在编辑器中插入该条目的提及节点
5. WHEN 提及节点被插入 THEN 系统 SHALL 以特殊样式显示该提及内容

### Requirement 4: Wiki 悬浮预览功能

**User Story:** 作为作者，我希望鼠标悬停在 Wiki 提及内容上时能看到预览卡片，这样我可以快速查看条目的详细信息而无需离开当前编辑位置。

#### Acceptance Criteria

1. WHEN 用户将鼠标悬停在提及节点上 THEN 系统 SHALL 显示悬浮预览卡片
2. WHEN 悬浮预览卡片显示 THEN 系统 SHALL 包含条目名称、别名和内容摘要
3. WHEN 内容摘要超过预设长度 THEN 系统 SHALL 使用省略号截断显示
4. WHEN 用户将鼠标移出提及节点 THEN 系统 SHALL 在短暂延迟后隐藏预览卡片
5. WHEN 用户将鼠标移入预览卡片 THEN 系统 SHALL 保持预览卡片显示

### Requirement 5: 修复 Excalidraw 绘图显示问题

**User Story:** 作为作者，我希望在编辑器中插入绘图时能够正常显示和编辑，这样我可以在小说中添加手绘图示。

#### Acceptance Criteria

1. WHEN 用户通过 / 命令插入绘图 THEN 系统 SHALL 显示完整的 Excalidraw 绘图界面
2. WHEN 绘图界面显示 THEN 系统 SHALL 提供所有基本绘图工具
3. WHEN 用户点击已存在的绘图 THEN 系统 SHALL 不产生错误并正常进入编辑模式
4. WHEN 用户编辑绘图 THEN 系统 SHALL 自动保存绘图数据到文档中
5. WHEN 用户切换编辑和预览模式 THEN 系统 SHALL 正确渲染绘图内容

### Requirement 6: 优化绘图界面集成

**User Story:** 作为作者，我希望绘图界面能够更好地融入编辑器，这样绘图体验更加流畅和一致。

#### Acceptance Criteria

1. WHEN 绘图组件渲染 THEN 系统 SHALL 使用与编辑器一致的主题样式
2. WHEN 绘图组件显示工具栏 THEN 系统 SHALL 不显示"在外部打开"按钮
3. WHEN 绘图组件在编辑模式 THEN 系统 SHALL 提供适当的最小尺寸以确保可用性
4. WHEN 绘图组件在预览模式 THEN 系统 SHALL 显示绘图内容的静态预览
5. WHEN 用户双击预览模式的绘图 THEN 系统 SHALL 切换到编辑模式

### Requirement 7: 绘图全屏编辑功能

**User Story:** 作为作者，我希望能够全屏编辑绘图，这样我可以在更大的画布上进行详细绘制。

#### Acceptance Criteria

1. WHEN 用户点击全屏按钮 THEN 系统 SHALL 以全屏模式显示绘图编辑器
2. WHEN 全屏模式激活 THEN 系统 SHALL 隐藏其他界面元素
3. WHEN 用户在全屏模式编辑 THEN 系统 SHALL 提供保存和导出功能
4. WHEN 用户点击退出全屏按钮 THEN 系统 SHALL 返回正常编辑模式并保留更改

