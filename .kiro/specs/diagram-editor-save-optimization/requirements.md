# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用中编辑器统一保存机制的优化需求。当前项目有两类编辑器：
- **Lexical 编辑器**：用于 diary、wiki、note、todo、ledger（富文本编辑）
- **Monaco 编辑器**：用于 plantuml、mermaid（图表代码编辑）

### 当前状态分析

**已有的基础设施：**
- `useSettings` Store：已有 `autoSave` 和 `autoSaveInterval` 字段
- `useEditorSave` Hook：统一的编辑器保存逻辑，但未使用 Settings 中的配置
- `SaveStore`：全局保存状态管理（status、hasUnsavedChanges）
- `EditorTab.isDirty`：标签页脏状态，用于显示 ● 指示器
- General 设置页面：已有自动保存开关和间隔配置 UI

**需要解决的问题：**
1. **两套自动保存逻辑**：
   - StoryWorkspaceContainer（Lexical）：直接使用 `useSettings` 的配置，自己实现定时器
   - DiagramEditorContainer（Monaco）：使用 `useEditorSave` hook，但 hook 未读取 Settings
2. DiagramEditorContainer 同时做实时预览渲染，导致输入时频繁渲染
3. `EditorTab.isDirty` 与 `SaveStore.hasUnsavedChanges` 需要同步
4. 设置页面的 autoSaveInterval 范围（10-3600）与实际需求（1-60）不匹配

## Glossary

- **Editor**: 编辑器组件，包括 Lexical 编辑器和 Monaco 编辑器
- **Auto_Save**: 自动保存功能，在用户停止编辑后自动保存内容
- **Save_Store**: 全局保存状态管理 Store，管理 status、hasUnsavedChanges 等状态
- **Settings_Store**: 用户设置 Store（useSettings），包含 autoSave 和 autoSaveInterval
- **Editor_Tab**: 编辑器标签页，包含 isDirty 字段表示是否有未保存更改
- **useEditorSave**: 统一的编辑器保存 Hook，封装 EditorSaveService
- **EditorSaveService**: 编辑器保存服务，处理防抖保存逻辑

## Requirements

### Requirement 1: useEditorSave 读取全局设置

**User Story:** As a user, I want my auto-save settings to apply to all editors, so that I have a consistent editing experience.

#### Acceptance Criteria

1. THE useEditorSave Hook SHALL read `autoSave` setting from Settings_Store
2. THE useEditorSave Hook SHALL read `autoSaveInterval` setting from Settings_Store
3. WHEN autoSave is disabled THEN the System SHALL only save on manual trigger (Ctrl+S)
4. WHEN autoSaveInterval changes THEN the System SHALL apply the new delay to subsequent saves
5. THE useEditorSave Hook SHALL convert autoSaveInterval from seconds to milliseconds

### Requirement 2: 自动保存延迟范围验证

**User Story:** As a user, I want the auto-save delay to be within a reasonable range, so that I can balance between save frequency and editing experience.

#### Acceptance Criteria

1. THE Settings_Store SHALL enforce a minimum autoSaveInterval of 1 second
2. THE Settings_Store SHALL enforce a maximum autoSaveInterval of 60 seconds
3. THE Settings_Store SHALL set the default autoSaveInterval to 3 seconds
4. THE Settings_Store SHALL set the default autoSave to true

### Requirement 3: Tab isDirty 状态同步

**User Story:** As a user, I want to see a consistent unsaved indicator on tabs, so that I know which files have pending changes.

#### Acceptance Criteria

1. WHEN useEditorSave marks content as unsaved THEN the System SHALL update EditorTab.isDirty to true
2. WHEN useEditorSave marks content as saved THEN the System SHALL update EditorTab.isDirty to false
3. THE System SHALL use the same ● indicator style for all editor types
4. THE useEditorSave Hook SHALL accept a tabId parameter for updating tab dirty state

### Requirement 4: 基于保存的预览渲染

**User Story:** As a user, I want the diagram preview to update only after saving, so that I don't see constant flickering while typing.

#### Acceptance Criteria

1. WHEN content is saved (manually or auto-save) THEN the DiagramEditor SHALL trigger preview rendering
2. WHEN the user is typing THEN the DiagramEditor SHALL NOT trigger preview rendering
3. THE DiagramEditorContainer SHALL remove the debouncedPreview call from handleCodeChange
4. THE DiagramEditorContainer SHALL use onSaveSuccess callback to trigger preview rendering

### Requirement 5: 设置界面范围调整

**User Story:** As a user, I want the auto-save interval input to have a reasonable range, so that I can set a shorter delay for faster feedback.

#### Acceptance Criteria

1. THE Settings page SHALL set the minimum autoSaveInterval input to 1 second (currently 10)
2. THE Settings page SHALL set the maximum autoSaveInterval input to 60 seconds (currently 3600)
3. THE Settings page SHALL display the current interval value in the input field

