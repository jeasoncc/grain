# Requirements Document: 编辑器保存服务单例化

## Introduction

本功能重构编辑器保存架构，采用单例多 model 模式。当前方案中，每个编辑器组件实例化自己的 `UnifiedSaveService`，组件卸载时需要处理复杂的清理和保存逻辑，导致竞态条件和状态丢失问题。

新方案将保存服务改为单例管理器，按 nodeId 管理多个 model（保存状态），组件只负责连接服务，不负责创建/销毁。这样组件卸载时服务和状态都保留，切换 Tab 时无需重新创建服务。

## Glossary

- **SaveServiceManager**: 单例保存服务管理器，管理所有节点的保存状态
- **SaveModel**: 单个节点的保存状态模型，包含 pendingContent、lastSavedContent 等
- **Node_ID**: 节点唯一标识符
- **Tab_Switch**: 用户切换编辑器标签页的操作
- **isDirty**: 标签页是否有未保存更改的状态

## Requirements

### Requirement 1: SaveServiceManager 单例

**User Story:** As a developer, I want a singleton save service manager, so that save state persists across component mounts/unmounts.

#### Acceptance Criteria

1. THE SaveServiceManager SHALL be implemented as a singleton
2. THE SaveServiceManager SHALL manage multiple SaveModels by nodeId
3. THE SaveServiceManager SHALL provide `getOrCreate(nodeId, config)` to get or create a SaveModel
4. THE SaveServiceManager SHALL provide `updateContent(nodeId, content)` to update pending content
5. THE SaveServiceManager SHALL provide `saveNow(nodeId)` to immediately save a node
6. THE SaveServiceManager SHALL provide `hasUnsavedChanges(nodeId)` to check dirty state
7. THE SaveServiceManager SHALL provide `setInitialContent(nodeId, content)` to set baseline
8. THE SaveServiceManager SHALL provide `dispose(nodeId)` to optionally clean up a model

### Requirement 2: SaveModel 状态管理

**User Story:** As a developer, I want each node to have its own save state, so that multiple editors can work independently.

#### Acceptance Criteria

1. EACH SaveModel SHALL track: pendingContent, lastSavedContent, isSaving
2. THE SaveModel SHALL support auto-save with configurable debounce delay
3. THE SaveModel SHALL support manual save via saveNow()
4. WHEN pendingContent equals lastSavedContent, hasUnsavedChanges SHALL return false
5. THE SaveModel SHALL persist across component mounts/unmounts

### Requirement 3: 组件连接（不创建/销毁）

**User Story:** As a user, I want tab switching to preserve my edits, so that I don't lose work.

#### Acceptance Criteria

1. WHEN an editor component mounts, IT SHALL connect to existing SaveModel (if any)
2. WHEN an editor component unmounts, IT SHALL NOT dispose the SaveModel
3. THE component SHALL only call updateContent() and saveNow() on the manager
4. THE component SHALL NOT manage service lifecycle

### Requirement 4: isDirty 状态同步

**User Story:** As a user, I want to see unsaved indicator on tabs, so that I know which files need saving.

#### Acceptance Criteria

1. WHEN content changes, THE Tab isDirty indicator SHALL be updated
2. WHEN save completes, THE Tab isDirty indicator SHALL be cleared
3. THE isDirty state SHALL follow tab switching (each tab shows its own state)

### Requirement 5: 自动保存

**User Story:** As a user, I want my content to be auto-saved, so that I don't lose work.

#### Acceptance Criteria

1. THE SaveModel SHALL support configurable auto-save delay (default 3 seconds)
2. THE auto-save SHALL use debounce to avoid excessive saves
3. WHEN auto-save is disabled (delay=0), only manual save SHALL work
4. THE auto-save timer SHALL persist across component mounts/unmounts

### Requirement 6: 清理策略

**User Story:** As a developer, I want unused SaveModels to be cleaned up, so that memory is not leaked.

#### Acceptance Criteria

1. THE SaveServiceManager SHALL provide `dispose(nodeId)` to clean up a model
2. THE SaveServiceManager SHALL provide `disposeAll()` to clean up all models
3. WHEN a Tab is closed (not just switched), THE SaveModel MAY be disposed
4. THE dispose SHALL cancel any pending auto-save timers

### Requirement 7: 错误处理

**User Story:** As a user, I want save errors to be handled gracefully.

#### Acceptance Criteria

1. IF save fails, THE error SHALL be logged
2. IF save fails, THE SaveModel SHALL retain pendingContent for retry
3. THE SaveServiceManager SHALL provide error callbacks

