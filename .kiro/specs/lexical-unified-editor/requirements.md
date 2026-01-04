# Requirements Document

## Introduction

本文档定义了 Grain 编辑器统一化重构的需求。目标是将 apps/desktop 主应用中的所有编辑功能统一使用 Lexical 编辑器实现，同时保留 packages/ 目录下的其他编辑器包（Monaco、Tiptap、CodeMirror）作为后备军，供未来其他项目使用。

核心原则：
- **单一编辑器**：主应用只使用 Lexical 编辑器
- **保留后备军**：packages/ 下的其他编辑器包保持完整
- **完善核心接口**：editor-core 提供灵活的抽象层，方便未来替换
- **移除配置选项**：Settings 中不再提供编辑器选择功能

## Glossary

- **Lexical_Editor**: 基于 Lexical 框架的富文本编辑器，支持文档、代码、图表编辑
- **Excalidraw_Editor**: 基于 Excalidraw 的绘图编辑器，仅用于 .excalidraw 文件
- **Editor_Core**: packages/editor-core 包，定义编辑器抽象接口
- **Editor_Lexical**: packages/editor-lexical 包，Lexical 编辑器实现
- **Editor_Monaco**: packages/editor-monaco 包，Monaco 编辑器实现（后备军）
- **Editor_Tiptap**: packages/editor-tiptap 包，Tiptap 编辑器实现（后备军）
- **Editor_CodeMirror**: packages/editor-codemirror 包，CodeMirror 编辑器实现（后备军）
- **Desktop_App**: apps/desktop 主应用
- **ActivityBar**: 左侧活动栏，包含新建文件按钮
- **MultiEditorContainer**: Lexical 多标签编辑器容器组件
- **EditorType**: 编辑器类型，重构后只有 "lexical" | "excalidraw"

## Requirements

### Requirement 1: 统一编辑器类型

**User Story:** As a developer, I want all text files to use Lexical editor, so that the codebase is simpler and more maintainable.

#### Acceptance Criteria

1. THE Desktop_App SHALL use Lexical_Editor for all text file types including .grain, .md, .js, .ts, .mermaid, .plantuml
2. THE Desktop_App SHALL use Excalidraw_Editor only for .excalidraw files
3. WHEN a user creates a new file from ActivityBar, THE Desktop_App SHALL open it with Lexical_Editor (except .excalidraw)
4. WHEN a user opens any text file, THE Desktop_App SHALL render it using MultiEditorContainer with Lexical_Editor
5. THE EditorType type SHALL be defined as "lexical" | "excalidraw" only

### Requirement 2: 移除 Monaco 编辑器引用

**User Story:** As a developer, I want to remove Monaco editor dependencies from the desktop app, so that the bundle size is smaller and the codebase is cleaner.

#### Acceptance Criteria

1. THE Desktop_App SHALL NOT import any components from @monaco-editor/react
2. THE Desktop_App SHALL NOT import any components from packages/editor-monaco
3. THE Desktop_App package.json SHALL NOT include @monaco-editor/react as a dependency
4. WHEN building the Desktop_App, THE build process SHALL NOT include Monaco editor code

### Requirement 3: 移除编辑器配置选项

**User Story:** As a user, I want a simplified settings page without editor selection, so that the interface is cleaner.

#### Acceptance Criteria

1. THE Settings page SHALL NOT display editor type selection options
2. THE Settings page SHALL retain typography settings (font family, font size, line height, etc.)
3. THE Settings page SHALL retain behavior settings (fold icon style)
4. THE editor-settings.store SHALL NOT include editor type selection state
5. THE editor-settings.interface SHALL NOT define editor type selection types

### Requirement 4: 保留后备编辑器包

**User Story:** As a developer, I want to keep other editor packages in the monorepo, so that they can be used in future projects.

#### Acceptance Criteria

1. THE packages/editor-monaco directory SHALL remain intact with all source files
2. THE packages/editor-tiptap directory SHALL remain intact with all source files
3. THE packages/editor-codemirror directory SHALL remain intact with all source files
4. THE packages/editor-lexical directory SHALL remain intact and be the only editor used by Desktop_App
5. THE packages/editor-core directory SHALL remain intact with complete interface definitions

### Requirement 5: 完善 Editor Core 接口

**User Story:** As a developer, I want well-defined editor interfaces in editor-core, so that I can easily swap editor implementations in the future.

#### Acceptance Criteria

1. THE Editor_Core SHALL export DocumentEditorAdapter interface for rich text editing
2. THE Editor_Core SHALL export CodeEditorAdapter interface for code editing
3. THE Editor_Core SHALL export DiagramEditorAdapter interface for diagram editing
4. THE Editor_Core SHALL export FileTypeMapping for file extension to editor type mapping
5. THE Editor_Core SHALL export utility functions for content conversion between formats
6. WHEN a new editor implementation is needed, THE developer SHALL be able to implement the adapter interfaces without modifying Desktop_App

### Requirement 6: 清理 Desktop App 组件

**User Story:** As a developer, I want to remove unused editor components from the desktop app, so that the codebase is cleaner.

#### Acceptance Criteria

1. IF components/code-editor directory exists with Monaco-based components, THEN THE Desktop_App SHALL remove it
2. IF components/diagram-editor directory exists with Monaco-based components, THEN THE Desktop_App SHALL remove it
3. THE story-workspace.container SHALL only import from @grain/editor-lexical
4. THE story-workspace.container SHALL NOT import CodeEditorContainer or DiagramEditorContainer (if they use Monaco)
5. WHEN rendering editor content, THE story-workspace.container SHALL use MultiEditorContainer for all non-Excalidraw files

### Requirement 7: 更新文件创建流程

**User Story:** As a user, I want all new files to open in Lexical editor, so that I have a consistent editing experience.

#### Acceptance Criteria

1. WHEN creating a new document file from ActivityBar, THE Desktop_App SHALL open it with Lexical_Editor
2. WHEN creating a new code file from ActivityBar, THE Desktop_App SHALL open it with Lexical_Editor (using code block)
3. WHEN creating a new diagram file from ActivityBar, THE Desktop_App SHALL open it with Lexical_Editor (using code block)
4. WHEN creating a new drawing file from ActivityBar, THE Desktop_App SHALL open it with Excalidraw_Editor
5. THE file creation actions SHALL NOT reference Monaco or other non-Lexical editors
