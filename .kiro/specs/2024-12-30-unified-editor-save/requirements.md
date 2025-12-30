# Requirements Document

## Introduction

统一所有编辑器的保存逻辑，确保用户在不同编辑器（Lexical、Excalidraw、DiagramEditor、CodeEditor）中获得一致的保存体验。同时将 TabType 复用 NodeType，消除重复的类型定义。

## Glossary

- **Editor_Save_Hook**: 统一的保存逻辑 hook，读取用户设置并管理 dirty 状态
- **Settings_Store**: 用户设置存储，包含 autoSave 和 autoSaveInterval 配置
- **Editor_Tab**: 打开的文件标签页，包含 isDirty 状态
- **Node_Type**: 节点类型枚举，定义文件树中的节点分类
- **Tab_Type**: 标签页类型，应复用 NodeType（排除 folder）
- **Dirty_State**: 文件修改状态，表示内容是否有未保存的更改

## Requirements

### Requirement 1: 统一保存配置来源

**User Story:** As a user, I want all editors to respect my auto-save settings, so that I have consistent save behavior across the application.

#### Acceptance Criteria

1. WHEN any editor initializes, THE Editor_Save_Hook SHALL read autoSave and autoSaveInterval from Settings_Store
2. WHEN autoSave is disabled in settings, THE Editor_Save_Hook SHALL not trigger automatic saves
3. WHEN autoSaveInterval is changed, THE Editor_Save_Hook SHALL use the new interval for subsequent saves
4. THE Editor_Save_Hook SHALL convert autoSaveInterval from seconds to milliseconds

### Requirement 2: 统一 Dirty 状态管理

**User Story:** As a user, I want to see consistent dirty indicators across all editors, so that I know which files have unsaved changes.

#### Acceptance Criteria

1. WHEN content changes in any editor, THE Editor_Save_Hook SHALL update the corresponding Editor_Tab isDirty to true
2. WHEN content is saved successfully, THE Editor_Save_Hook SHALL update the corresponding Editor_Tab isDirty to false
3. WHEN a tab shows isDirty as true, THE Tab_Component SHALL display a visual indicator (dot or asterisk)
4. THE isDirty state SHALL be synchronized between Editor_Save_Hook and Editor_Tab store

### Requirement 3: 统一保存回调机制

**User Story:** As a developer, I want a consistent callback mechanism for save events, so that editors can respond to save completion.

#### Acceptance Criteria

1. THE Editor_Save_Hook SHALL provide an onSaveSuccess callback parameter
2. WHEN save completes successfully, THE Editor_Save_Hook SHALL invoke the onSaveSuccess callback
3. THE Editor_Save_Hook SHALL provide an onSaveError callback parameter for error handling
4. WHEN save fails, THE Editor_Save_Hook SHALL invoke the onSaveError callback with error details

### Requirement 4: TabType 复用 NodeType

**User Story:** As a developer, I want TabType to derive from NodeType, so that I don't need to maintain duplicate type definitions.

#### Acceptance Criteria

1. THE Tab_Type SHALL be defined as `Exclude<NodeType, "folder">`
2. WHEN a new NodeType is added, THE Tab_Type SHALL automatically include it (except folder)
3. THE Editor_Tab interface SHALL use the derived Tab_Type instead of independent definition
4. THE OpenTabPayload interface SHALL use the derived Tab_Type

### Requirement 5: 迁移现有编辑器

**User Story:** As a developer, I want all existing editors to use the unified save hook, so that the codebase is consistent.

#### Acceptance Criteria

1. THE DiagramEditorContainer SHALL use Editor_Save_Hook for save logic
2. THE ExcalidrawEditorContainer SHALL use Editor_Save_Hook for save logic
3. THE StoryWorkspaceContainer (Lexical) SHALL use Editor_Save_Hook for save logic
4. WHEN migrating, THE existing save functionality SHALL be preserved without regression
