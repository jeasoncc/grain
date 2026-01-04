# Requirements Document

## Introduction

本项目旨在重构 Grain 的编辑器包结构，建立清晰的编辑器分类体系。编辑器按**功能类型**（文档、代码、图表）和**底层技术**（Lexical、Tiptap、Monaco）两个维度组织，便于对比不同编辑器在 Tauri WebView 中的性能和体验表现。

## 包结构设计

```
packages/
├── editor-core/                    # 编辑器核心抽象层
│   └── src/
│       ├── types/                  # 统一类型定义
│       │   ├── document.interface.ts   # 文档编辑器接口
│       │   ├── code.interface.ts       # 代码编辑器接口
│       │   └── diagram.interface.ts    # 图表编辑器接口
│       └── index.ts
│
├── editor-lexical/                 # Lexical 实现（原 @grain/editor）
│   └── src/
│       ├── document/               # 文档编辑（富文本）
│       ├── code/                   # 代码编辑（基于 CodeNode）
│       ├── diagram/                # 图表编辑（Mermaid 预览）
│       └── index.ts
│
├── editor-tiptap/                  # Tiptap 实现（新增）
│   └── src/
│       ├── document/               # 文档编辑（富文本）
│       ├── code/                   # 代码编辑（lowlight）
│       ├── diagram/                # 图表编辑（Mermaid 预览）
│       └── index.ts
│
├── editor-monaco/                  # Monaco 实现（原 @grain/code-editor）
│   └── src/
│       ├── document/               # 文档编辑（Markdown + 实时预览）
│       ├── code/                   # 代码编辑（专业级）
│       ├── diagram/                # 图表编辑（代码+预览）
│       └── index.ts
│
├── editor-codemirror/              # CodeMirror 6 实现（新增）
│   └── src/
│       ├── document/               # 文档编辑（Markdown + 实时预览）
│       ├── code/                   # 代码编辑（轻量级）
│       ├── diagram/                # 图表编辑（代码+预览）
│       └── index.ts
│
├── excalidraw-editor/              # Excalidraw（保持独立，无替代）
└── rust-core/                      # Rust 后端（不变）
```

## 功能类型说明

| 功能类型 | 英文名 | 用途 | 示例 |
|---------|--------|------|------|
| **文档编辑** | Document | 富文本笔记、日记、Wiki | Notion、Obsidian |
| **代码编辑** | Code | 代码片段、配置文件 | VS Code |
| **图表编辑** | Diagram | Mermaid、PlantUML | 流程图、时序图 |

## Glossary

- **Editor_Core**: 编辑器核心抽象层，定义统一的编辑器接口
- **Document_Editor**: 文档编辑器，用于富文本编辑（标题、列表、表格等）
- **Code_Editor**: 代码编辑器，用于代码编辑（语法高亮、补全等）
- **Diagram_Editor**: 图表编辑器，用于图表编辑（Mermaid、PlantUML）
- **Lexical_Editor**: 基于 Meta Lexical 的编辑器实现
- **Tiptap_Editor**: 基于 Tiptap/ProseMirror 的编辑器实现
- **Monaco_Editor**: 基于 Microsoft Monaco 的编辑器实现
- **CodeMirror_Editor**: 基于 CodeMirror 6 的编辑器实现
- **Serialized_Content**: 编辑器内容的序列化格式，用于存储和传输
- **Editor_Config**: 编辑器配置，用于在运行时切换不同编辑器实现
- **File_Type_Resolver**: 文件类型解析器，根据文件后缀匹配编辑器类型

## Requirements

### Requirement 1: 编辑器核心抽象层

**User Story:** As a developer, I want a unified editor interface for each editor type, so that I can switch between different implementations without changing application code.

#### Acceptance Criteria

1. THE Editor_Core SHALL define a `DocumentEditorAdapter` interface for rich text editing with methods: getContent, setContent, toggleBold, toggleItalic, insertHeading, insertList, insertTable
2. THE Editor_Core SHALL define a `CodeEditorAdapter` interface for code editing with methods: getContent, setContent, setLanguage, formatCode, insertSnippet
3. THE Editor_Core SHALL define a `DiagramEditorAdapter` interface for diagram editing with methods: getSource, setSource, getDiagramType, render
4. THE Editor_Core SHALL define event handlers for all adapters: onChange, onFocus, onBlur, onSave
5. THE Editor_Core SHALL define lifecycle methods for all adapters: focus, blur, destroy
6. THE Editor_Core SHALL define a `SerializedContent` type that supports JSON, Markdown, and HTML formats
7. THE Editor_Core SHALL define an `EditorConfig` type for runtime editor selection by type (document, code, diagram)
8. THE Editor_Core SHALL define a `FileTypeResolver` that maps file extensions to editor types

### Requirement 2: 编辑器包重命名与重组

**User Story:** As a developer, I want editor packages to be organized by underlying technology, so that I can easily identify and compare different implementations.

#### Acceptance Criteria

1. WHEN the package `@grain/editor` is renamed, THE System SHALL rename it to `@grain/editor-lexical`
2. WHEN the package `@grain/code-editor` is renamed, THE System SHALL rename it to `@grain/editor-monaco`
3. THE System SHALL create a new package `@grain/editor-core` for shared interfaces and types
4. THE System SHALL create a new package `@grain/editor-tiptap` for Tiptap implementation
5. THE System SHALL create a new package `@grain/editor-codemirror` for CodeMirror implementation
6. WHEN packages are renamed, THE System SHALL update all import paths in `apps/desktop` to use the new package names
7. WHEN packages are renamed, THE System SHALL update the root `package.json` workspace configuration
8. THE System SHALL delete the `@grain/diagram-editor` package and merge its functionality into editor packages

### Requirement 3: Lexical 编辑器子模块

**User Story:** As a developer, I want the Lexical editor package to provide document, code, and diagram editing capabilities, so that I can use Lexical for all editing needs.

#### Acceptance Criteria

1. THE Lexical_Editor SHALL export a `LexicalDocumentEditor` component implementing `DocumentEditorAdapter`
2. THE Lexical_Editor SHALL export a `LexicalCodeEditor` component implementing `CodeEditorAdapter` using `@lexical/code`
3. THE Lexical_Editor SHALL export a `LexicalDiagramEditor` component implementing `DiagramEditorAdapter` with Mermaid preview
4. THE Lexical_Editor SHALL preserve all existing functionality (mentions, tags, wiki links, code highlighting)
5. THE Lexical_Editor SHALL convert content to and from `SerializedContent` format
6. WHEN exporting, THE Lexical_Editor SHALL use subpath exports: `@grain/editor-lexical/document`, `@grain/editor-lexical/code`, `@grain/editor-lexical/diagram`

### Requirement 4: Tiptap 编辑器实现

**User Story:** As a developer, I want a Tiptap-based editor implementation with document, code, and diagram capabilities, so that I can compare its performance with Lexical in WebView.

#### Acceptance Criteria

1. THE Tiptap_Editor SHALL export a `TiptapDocumentEditor` component implementing `DocumentEditorAdapter`
2. THE Tiptap_Editor SHALL support rich text formatting: bold, italic, strike, headings (1-6), lists (bullet, ordered, task), blockquote, horizontal rule
3. THE Tiptap_Editor SHALL support tables using `@tiptap/extension-table`
4. THE Tiptap_Editor SHALL support markdown shortcuts for quick formatting
5. THE Tiptap_Editor SHALL export a `TiptapCodeEditor` component implementing `CodeEditorAdapter` using `@tiptap/extension-code-block-lowlight`
6. THE Tiptap_Editor SHALL export a `TiptapDiagramEditor` component implementing `DiagramEditorAdapter` with Mermaid preview
7. THE Tiptap_Editor SHALL convert content to and from `SerializedContent` format
8. WHEN Tiptap editor is initialized, THE System SHALL load only necessary extensions to minimize bundle size
9. WHEN exporting, THE Tiptap_Editor SHALL use subpath exports: `@grain/editor-tiptap/document`, `@grain/editor-tiptap/code`, `@grain/editor-tiptap/diagram`

### Requirement 5: Monaco 编辑器子模块

**User Story:** As a developer, I want the Monaco editor package to provide document, code, and diagram editing capabilities, so that I can use Monaco for all editing needs including Markdown preview.

#### Acceptance Criteria

1. THE Monaco_Editor SHALL export a `MonacoDocumentEditor` component implementing `DocumentEditorAdapter` with Markdown split-view preview
2. THE Monaco_Editor SHALL support real-time Markdown rendering in preview pane
3. THE Monaco_Editor SHALL support sync scrolling between editor and preview
4. THE Monaco_Editor SHALL export a `MonacoCodeEditor` component implementing `CodeEditorAdapter`
5. THE Monaco_Editor SHALL support 100+ programming languages with syntax highlighting
6. THE Monaco_Editor SHALL support code completion, error highlighting, and formatting
7. THE Monaco_Editor SHALL export a `MonacoDiagramEditor` component implementing `DiagramEditorAdapter` with split view (code + preview)
8. THE Monaco_Editor SHALL convert content to and from `SerializedContent` format
9. WHEN exporting, THE Monaco_Editor SHALL use subpath exports: `@grain/editor-monaco/document`, `@grain/editor-monaco/code`, `@grain/editor-monaco/diagram`

### Requirement 6: CodeMirror 编辑器实现

**User Story:** As a developer, I want a CodeMirror-based editor implementation with document, code, and diagram capabilities, so that I can compare its lightweight performance with other editors.

#### Acceptance Criteria

1. THE CodeMirror_Editor SHALL export a `CodeMirrorDocumentEditor` component implementing `DocumentEditorAdapter` with Markdown split-view preview
2. THE CodeMirror_Editor SHALL support real-time Markdown rendering in preview pane
3. THE CodeMirror_Editor SHALL export a `CodeMirrorCodeEditor` component implementing `CodeEditorAdapter`
4. THE CodeMirror_Editor SHALL support common programming languages with syntax highlighting using CodeMirror 6 language packages
5. THE CodeMirror_Editor SHALL export a `CodeMirrorDiagramEditor` component implementing `DiagramEditorAdapter` with split view
6. THE CodeMirror_Editor SHALL convert content to and from `SerializedContent` format
7. WHEN exporting, THE CodeMirror_Editor SHALL use subpath exports: `@grain/editor-codemirror/document`, `@grain/editor-codemirror/code`, `@grain/editor-codemirror/diagram`

### Requirement 7: 文件类型匹配机制

**User Story:** As a user, I want the system to automatically select the appropriate editor based on file extension, so that I get the best editing experience for each file type.

#### Acceptance Criteria

1. WHEN a file with extension `.grain` or `.note` is opened, THE System SHALL use the Document editor
2. WHEN a file with extension `.md`, `.mdx`, or `.markdown` is opened, THE System SHALL use the Document editor with Markdown mode
3. WHEN a file with code extension (`.js`, `.ts`, `.py`, `.rs`, etc.) is opened, THE System SHALL use the Code editor with appropriate language
4. WHEN a file with extension `.mermaid` or `.mmd` is opened, THE System SHALL use the Diagram editor with Mermaid type
5. WHEN a file with extension `.plantuml`, `.puml`, or `.pu` is opened, THE System SHALL use the Diagram editor with PlantUML type
6. WHEN a file with extension `.excalidraw` is opened, THE System SHALL use the Excalidraw editor
7. THE System SHALL allow users to override the default editor for any file type in settings

### Requirement 8: 编辑器切换机制

**User Story:** As a developer, I want to switch between editor implementations at runtime, so that I can compare their performance and behavior.

#### Acceptance Criteria

1. THE System SHALL provide an `EditorProvider` component that accepts `documentEditor`, `codeEditor`, and `diagramEditor` props
2. WHEN `documentEditor` is set to 'lexical', THE EditorProvider SHALL use `LexicalDocumentEditor`
3. WHEN `documentEditor` is set to 'tiptap', THE EditorProvider SHALL use `TiptapDocumentEditor`
4. WHEN `documentEditor` is set to 'monaco', THE EditorProvider SHALL use `MonacoDocumentEditor`
5. WHEN `documentEditor` is set to 'codemirror', THE EditorProvider SHALL use `CodeMirrorDocumentEditor`
6. THE System SHALL preserve editor content when switching between editor implementations
7. THE System SHALL provide a settings UI to select default editor for each type

### Requirement 9: 向后兼容

**User Story:** As a developer, I want the refactoring to maintain backward compatibility, so that existing functionality continues to work.

#### Acceptance Criteria

1. WHEN the refactoring is complete, THE System SHALL maintain all existing editor features (mentions, tags, wiki links)
2. WHEN the refactoring is complete, THE System SHALL maintain existing content serialization format compatibility
3. IF existing content cannot be loaded by new editor, THEN THE System SHALL provide a content migration utility
4. THE System SHALL provide deprecation warnings for old import paths during transition period
