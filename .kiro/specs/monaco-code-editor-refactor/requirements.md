# Requirements Document

## Introduction

重构 Grain 编辑器的代码编辑模块，引入 Monaco Editor 作为统一的代码编辑组件。目标是让 PlantUML、Mermaid 等需要编写代码的场景都使用 Monaco Editor，并与 Diary、Wiki 等文件类型共享统一的编辑器架构和保存逻辑。

## 设计哲学：数据如气息流动

软件的生命在于数据的流动，而非功能的堆砌。

正如中国古老思想中"气息"在生命体内的流动——从口入，经五脏六腑，复从口出——软件中的数据也应当如此：**从用户而来，经过层层管道的纯净变换，最终回到用户身上**。

当功能越来越丰富时，必须保证所有功能都遵循同一套"水流"逻辑：
- 每个组件、函数都是管道中的一个节点
- 数据顺畅地流过每个节点，不被阻塞、不被污染
- 管道的方向始终清晰：用户输入 → 数据变换 → 持久化 → 状态更新 → UI 响应 → 用户感知

**本次重构的核心目标**：让 Monaco Editor、Lexical Editor、Excalidraw 三种编辑器的数据流动遵循同一套管道逻辑，而非各自为政。

## 背景

当前问题：
1. DiagramEditor 使用简单的 `<textarea>` 作为代码编辑器，缺乏语法高亮、自动补全等专业功能
2. DiagramEditor 的保存逻辑与 Lexical 编辑器（Diary/Wiki）完全独立，代码重复
3. 不同编辑器类型（Lexical、Excalidraw、Diagram）各自实现保存逻辑，难以维护
4. 快捷键（如 Ctrl+S 保存）在不同编辑器中各自实现，没有统一的事件流

解决方案：
1. 引入 Monaco Editor 作为代码编辑组件，提供专业的代码编辑体验
2. 创建统一的 CodeEditor 组件，复用 Monaco 实例
3. 抽象统一的编辑器保存逻辑，让所有编辑器类型共享
4. 统一快捷键事件流，所有编辑器的 Ctrl+S 都流向同一个保存管道

## Glossary

- **Monaco_Editor**: VS Code 使用的代码编辑器核心，提供语法高亮、自动补全、错误提示等功能
- **Code_Editor**: 基于 Monaco 的代码编辑器组件，用于 PlantUML、Mermaid 等代码编辑场景
- **Editor_Save_Service**: 统一的编辑器保存服务，处理防抖保存、状态管理等
- **Diagram_Editor**: 图表编辑器，包含代码编辑区（Monaco）和预览区
- **Content_Type**: 内容类型，包括 lexical、text、excalidraw、mermaid、plantuml 等

## Requirements

### Requirement 1: Monaco Editor 集成

**User Story:** As a developer, I want to use Monaco Editor for code editing, so that users get professional code editing experience with syntax highlighting and auto-completion.

#### Acceptance Criteria

1. THE System SHALL install `@monaco-editor/react` package as dependency
2. THE Monaco_Editor SHALL support PlantUML syntax highlighting
3. THE Monaco_Editor SHALL support Mermaid syntax highlighting
4. THE Monaco_Editor SHALL support dark/light theme switching based on app theme
5. THE Monaco_Editor SHALL provide basic auto-completion for diagram keywords
6. THE Monaco_Editor SHALL support keyboard shortcuts (Ctrl+S for save, etc.)

### Requirement 2: CodeEditor 组件

**User Story:** As a user, I want a professional code editor for writing diagram code, so that I can write code efficiently with syntax highlighting.

#### Acceptance Criteria

1. THE Code_Editor SHALL be a reusable component accepting language and content props
2. THE Code_Editor SHALL support `plantuml`, `mermaid`, `json`, `markdown` languages
3. THE Code_Editor SHALL emit onChange events with debounce support
4. THE Code_Editor SHALL preserve cursor position and scroll state
5. THE Code_Editor SHALL follow the View/Container component pattern
6. THE Code_Editor SHALL be placed in `components/code-editor/` directory

### Requirement 3: 统一保存逻辑

**User Story:** As a developer, I want unified save logic across all editor types, so that code is maintainable and consistent.

#### Acceptance Criteria

1. THE Editor_Save_Service SHALL handle save operations for all content types
2. THE Editor_Save_Service SHALL support configurable auto-save delay
3. THE Editor_Save_Service SHALL emit save status events (saving, saved, error)
4. THE Editor_Save_Service SHALL support manual save trigger
5. WHEN component unmounts, THE System SHALL save any pending changes
6. THE Editor_Save_Service SHALL be a pure function module in `fn/save/`

### Requirement 4: DiagramEditor 重构

**User Story:** As a user, I want to edit diagrams with Monaco Editor, so that I get syntax highlighting and better editing experience.

#### Acceptance Criteria

1. THE Diagram_Editor SHALL use Code_Editor component instead of textarea
2. THE Diagram_Editor SHALL use Editor_Save_Service for content persistence
3. THE Diagram_Editor SHALL maintain split view layout (code + preview)
4. THE Diagram_Editor SHALL support real-time preview with debounce
5. WHEN save fails, THE System SHALL display error notification
6. THE Diagram_Editor SHALL support Ctrl+S for manual save

### Requirement 5: StoryWorkspace 集成

**User Story:** As a user, I want all editor types to work seamlessly in the workspace, so that I have consistent editing experience.

#### Acceptance Criteria

1. THE Story_Workspace SHALL render appropriate editor based on node type
2. THE Story_Workspace SHALL use unified save status indicator for all editors
3. WHEN switching between tabs, THE System SHALL preserve editor state
4. THE Story_Workspace SHALL support word count for text-based editors only
5. THE System SHALL share save status store across all editor types

### Requirement 6: 编辑器类型扩展

**User Story:** As a developer, I want to easily add new code-based file types, so that the system is extensible.

#### Acceptance Criteria

1. THE System SHALL define EditorType enum including all supported types
2. THE System SHALL provide factory function to create editor config
3. WHEN adding new code type, THE Developer SHALL only need to add config
4. THE System SHALL support custom language definitions for Monaco
5. THE System SHALL support custom preview renderers per file type

### Requirement 7: 统一快捷键事件流

**User Story:** As a user, I want Ctrl+S to save in any editor type, so that I have consistent experience across the app.

#### Acceptance Criteria

1. THE System SHALL provide unified keyboard shortcut handler for all editors
2. WHEN user presses Ctrl+S in Monaco Editor, THE System SHALL trigger save through unified save service
3. WHEN user presses Ctrl+S in Lexical Editor, THE System SHALL trigger save through unified save service
4. WHEN user presses Ctrl+S in Excalidraw Editor, THE System SHALL trigger save through unified save service
5. THE keyboard event SHALL flow through: Editor → Hook → SaveService → DB → Store → UI feedback
6. THE System SHALL prevent default browser save dialog

### Requirement 8: 性能优化

**User Story:** As a user, I want fast editor loading and smooth editing experience, so that I can work efficiently.

#### Acceptance Criteria

1. THE Monaco_Editor SHALL be lazy loaded to reduce initial bundle size
2. THE System SHALL reuse Monaco instances across tabs when possible
3. THE Preview rendering SHALL be debounced to avoid excessive API calls
4. THE System SHALL cancel pending preview requests when content changes
5. THE System SHALL use Web Workers for Monaco if supported

### Requirement 8: 性能优化

**User Story:** As a user, I want fast editor loading and smooth editing experience, so that I can work efficiently.

#### Acceptance Criteria

1. THE Monaco_Editor SHALL be lazy loaded to reduce initial bundle size
2. THE System SHALL reuse Monaco instances across tabs when possible
3. THE Preview rendering SHALL be debounced to avoid excessive API calls
4. THE System SHALL cancel pending preview requests when content changes
5. THE System SHALL use Web Workers for Monaco if supported

### Requirement 9: Mermaid 客户端渲染

**User Story:** As a user, I want Mermaid diagrams to render without network dependency, so that I can work offline.

#### Acceptance Criteria

1. WHEN rendering Mermaid diagram, THE System SHALL use mermaid.js client-side rendering
2. THE Mermaid rendering SHALL NOT require Kroki server connection
3. WHEN rendering PlantUML diagram, THE System SHALL use Kroki server rendering
4. THE Mermaid renderer SHALL support dark/light theme based on app theme
5. IF Mermaid syntax is invalid, THE System SHALL display syntax error message
6. THE System SHALL initialize mermaid.js with appropriate security settings
