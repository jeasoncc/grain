# Lexical Only Editor - 统一使用 Lexical 编辑器

## 概述

将项目中所有编辑器统一为 Lexical，移除其他编辑器实现（Tiptap、Monaco、CodeMirror），并删除编辑器选择配置模块。

## 背景

当前项目支持多种编辑器（Lexical、Tiptap、Monaco、CodeMirror），但这种灵活性带来了：
- 维护成本高
- 包体积大
- 兼容性问题（如 Tiptap 的 ProseMirror `localsInner` 错误）
- 用户配置复杂

决定统一使用 Lexical 作为唯一编辑器，简化架构。

## 用户故事

### US-1: 文档编辑
**作为** 用户  
**我想要** 使用 Lexical 编辑器编写文档  
**以便** 获得稳定、一致的编辑体验

**验收标准:**
- [ ] 所有文档类型（.grain 文件）使用 Lexical 编辑器
- [ ] 支持富文本格式：粗体、斜体、下划线、删除线
- [ ] 支持标题（H1-H6）
- [ ] 支持列表（有序、无序、任务列表）
- [ ] 支持代码块和行内代码
- [ ] 支持引用块
- [ ] 支持链接和图片
- [ ] 支持表格
- [ ] 支持撤销/重做

### US-2: 代码编辑
**作为** 用户  
**我想要** 使用 Lexical 编辑代码文件  
**以便** 在同一编辑器中编写代码

**验收标准:**
- [ ] 代码文件使用 Lexical 的代码块模式
- [ ] 支持语法高亮
- [ ] 支持基本的代码编辑功能

### US-3: 图表编辑
**作为** 用户  
**我想要** 使用 Lexical 编辑 Mermaid 图表  
**以便** 创建流程图、时序图等

**验收标准:**
- [ ] 图表文件使用 Lexical 的代码块模式
- [ ] 支持 Mermaid 语法
- [ ] 支持实时预览（可选）

### US-4: 移除编辑器配置
**作为** 开发者  
**我想要** 移除编辑器选择配置  
**以便** 简化代码和用户界面

**验收标准:**
- [ ] 删除设置页面中的编辑器选择选项
- [ ] 删除 `editor-settings.store.ts`
- [ ] 删除 `editor-settings.interface.ts`
- [ ] 删除设置路由中的编辑器配置页面

### US-5: 清理未使用的包
**作为** 开发者  
**我想要** 移除未使用的编辑器包  
**以便** 减少项目体积和维护成本

**验收标准:**
- [ ] 删除 `packages/editor-tiptap/` 目录
- [ ] 删除 `packages/editor-monaco/` 目录
- [ ] 删除 `packages/editor-codemirror/` 目录
- [ ] 更新根目录 `package.json` 移除相关 workspace 引用
- [ ] 更新 `apps/desktop/package.json` 移除相关依赖
- [ ] 简化 `packages/editor-core/` 移除多编辑器支持代码

### US-6: 更新应用组件
**作为** 开发者  
**我想要** 更新应用组件直接使用 Lexical  
**以便** 移除编辑器选择逻辑

**验收标准:**
- [ ] 更新 `story-workspace.container.fn.tsx` 直接使用 Lexical
- [ ] 删除 `apps/desktop/src/components/tiptap-editor/` 目录
- [ ] 删除 `apps/desktop/src/components/codemirror-editor/` 目录
- [ ] 删除 `apps/desktop/src/components/codemirror-code-editor/` 目录
- [ ] 删除 `apps/desktop/src/components/codemirror-diagram-editor/` 目录
- [ ] 更新或创建 Lexical 编辑器容器组件

## 技术要求

### 依赖管理
- 保留 `@grain/editor-lexical` 包
- 保留 `@grain/editor-core` 包（简化后）
- 移除所有 Tiptap、Monaco、CodeMirror 相关依赖

### Lexical 功能要求
- 使用 `@lexical/react` 官方 React 绑定
- 使用 `@lexical/rich-text` 富文本支持
- 使用 `@lexical/list` 列表支持
- 使用 `@lexical/code` 代码块支持
- 使用 `@lexical/link` 链接支持
- 使用 `@lexical/table` 表格支持
- 使用 `@lexical/markdown` Markdown 支持

### 数据格式
- 保持现有的 `SerializedContent` 格式
- 使用 JSON 格式存储 Lexical 编辑器状态
- 确保向后兼容现有文档

## 风险和注意事项

1. **数据迁移**: 现有使用其他编辑器格式保存的文档可能需要迁移
2. **功能差异**: Lexical 可能缺少某些 Tiptap/Monaco 特有功能
3. **学习曲线**: Lexical 的 API 与其他编辑器不同

## 优先级

1. 高优先级：移除编辑器配置和未使用的包
2. 中优先级：完善 Lexical 编辑器功能
3. 低优先级：数据迁移工具（如需要）
