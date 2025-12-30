# Requirements Document

## Introduction

将编辑器组件迁移到 packages 目录，作为独立的可复用包管理。同时新增 Code 类型支持代码编辑。

## Glossary

- **Editor_Package**: 独立的编辑器包，位于 packages 目录
- **Code_Editor**: 基于 Monaco 的代码编辑器
- **Code_Type**: 新增的 NodeType，用于代码文件
- **Activity_Bar**: 左侧活动栏，包含创建文件的快捷按钮
- **Code_Template**: Code 文件的模板配置

## Requirements

### Requirement 1: 编辑器包迁移

**User Story:** As a developer, I want editors to be independent packages, so that they can be reused across different apps.

#### Acceptance Criteria

1. THE DiagramEditor SHALL be moved to packages/diagram-editor
2. THE ExcalidrawEditor SHALL be moved to packages/excalidraw-editor
3. THE CodeEditor SHALL be moved to packages/code-editor
4. EACH editor package SHALL export View and Container components
5. EACH editor package SHALL have its own package.json with dependencies
6. THE apps/desktop SHALL import editors from @grain/xxx-editor packages

### Requirement 2: 新增 Code NodeType

**User Story:** As a user, I want to create code files, so that I can write and store code snippets in my notes.

#### Acceptance Criteria

1. THE NodeTypeSchema SHALL include "code" as a valid type
2. THE code type SHALL use ContentType "text" for storage
3. THE code type SHALL use CodeEditor for editing
4. WHEN code type is added, THE TabType SHALL automatically include it

### Requirement 3: Code 文件创建

**User Story:** As a user, I want to create code files with one click, so that I can quickly start writing code.

#### Acceptance Criteria

1. THE Activity_Bar SHALL have a Code button with code icon
2. WHEN user clicks Code button, THE system SHALL create a code file immediately
3. THE code file SHALL be created in Code/year/month/day/ folder structure
4. THE code file title SHALL follow pattern: code-{timestamp}-{time}.js
5. THE code file content SHALL have a comment: // Created by Grain - {date}

### Requirement 4: Code 模板配置

**User Story:** As a developer, I want Code template to follow the same pattern as other templates, so that the codebase is consistent.

#### Acceptance Criteria

1. THE Code_Template SHALL use createTemplatedFile high-order function
2. THE Code_Template SHALL have rootFolder as "Code"
3. THE Code_Template SHALL have fileType as "code"
4. THE Code_Template SHALL have tag as "code"
5. THE Code_Template generateFolderPath SHALL use getDateFolderStructure

### Requirement 5: CodeEditor 功能

**User Story:** As a user, I want a functional code editor, so that I can write code with syntax highlighting.

#### Acceptance Criteria

1. THE CodeEditor SHALL use Monaco editor as the underlying component
2. THE CodeEditor SHALL detect language from file extension
3. THE CodeEditor SHALL support syntax highlighting for: JavaScript, TypeScript, Python, JSON, Markdown, HTML, CSS, SQL, Shell, YAML
4. THE CodeEditor SHALL support Ctrl+S for manual save
5. THE CodeEditor SHALL use useEditorSave hook for save logic
