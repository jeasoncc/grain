# Requirements Document

## Introduction

本功能解决编辑器在 Tab 切换时内容丢失的问题。当前 Code、Diagram、Excalidraw 编辑器使用 `key={activeTab.id}` 导致组件在 Tab 切换时销毁重建，而 `useUnifiedSave` 的清理保存是异步的，新组件从数据库加载内容时可能早于保存完成，造成竞态条件。

本方案使用 p-queue 库实现保存队列，确保 Tab 切换时的保存操作有序完成，新组件加载前等待对应节点的保存完成。

## Glossary

- **Save_Queue**: 基于 p-queue 的保存任务队列服务，管理所有编辑器的异步保存操作
- **Node_ID**: 节点唯一标识符，用于追踪特定节点的保存状态
- **Pending_Save**: 已入队但尚未完成的保存任务
- **Tab_Switch**: 用户切换编辑器标签页的操作
- **Cleanup_Save**: 组件卸载时触发的保存操作
- **Race_Condition**: 竞态条件，指保存和加载操作的时序冲突

## Requirements

### Requirement 1: 保存队列服务

**User Story:** As a developer, I want a centralized save queue service, so that all editor save operations are managed consistently and race conditions are prevented.

#### Acceptance Criteria

1. THE Save_Queue SHALL be implemented as a singleton service using p-queue library
2. THE Save_Queue SHALL provide an `enqueueSave(nodeId, saveFn)` function to add save tasks
3. THE Save_Queue SHALL provide a `waitForSave(nodeId)` function to wait for pending saves
4. THE Save_Queue SHALL track pending saves by Node_ID
5. WHEN multiple saves for the same Node_ID are enqueued, THE Save_Queue SHALL only keep the latest save task
6. THE Save_Queue SHALL use concurrency of 1 to ensure sequential save execution

### Requirement 2: 编辑器卸载时入队保存

**User Story:** As a user, I want my editor content to be saved when I switch tabs, so that I don't lose my work.

#### Acceptance Criteria

1. WHEN a Code/Diagram/Excalidraw editor component unmounts, THE useUnifiedSave hook SHALL enqueue the save task to Save_Queue
2. THE Cleanup_Save SHALL be fire-and-forget (not blocking the unmount)
3. WHEN the editor has no unsaved changes, THE Cleanup_Save SHALL skip enqueueing
4. THE Cleanup_Save SHALL use the existing `saveNow()` function as the save task

### Requirement 3: 编辑器加载时等待保存

**User Story:** As a user, I want to see my latest content when switching back to a tab, so that my edits are preserved.

#### Acceptance Criteria

1. WHEN a Code/Diagram/Excalidraw editor component mounts, THE container SHALL call `waitForSave(nodeId)` before loading content from database
2. WHEN there is a Pending_Save for the Node_ID, THE container SHALL wait for it to complete
3. WHEN there is no Pending_Save for the Node_ID, THE `waitForSave` SHALL resolve immediately
4. IF the Pending_Save fails, THEN THE container SHALL still proceed to load content and log the error

### Requirement 4: isDirty 状态显示

**User Story:** As a user, I want to see a visual indicator when my content has unsaved changes, so that I know the save status.

#### Acceptance Criteria

1. WHILE editing in Code/Diagram/Excalidraw editor, THE Tab SHALL display isDirty indicator
2. WHEN Tab_Switch occurs and save is enqueued, THE Tab isDirty indicator SHALL be cleared
3. THE Lexical editor SHALL continue to display isDirty indicator as before (multi-instance, no change)

### Requirement 5: 错误处理

**User Story:** As a user, I want save errors to be handled gracefully, so that I can recover from failures.

#### Acceptance Criteria

1. IF a save task in Save_Queue fails, THEN THE Save_Queue SHALL log the error
2. IF a save task fails, THEN THE Save_Queue SHALL remove it from pending saves
3. THE Save_Queue SHALL NOT block subsequent saves due to a failed save
4. WHEN `waitForSave` encounters a failed save, THE function SHALL resolve (not reject) to allow content loading

### Requirement 6: 性能要求

**User Story:** As a user, I want tab switching to feel responsive, so that my workflow is not interrupted.

#### Acceptance Criteria

1. THE `enqueueSave` function SHALL return immediately (non-blocking)
2. THE `waitForSave` function SHALL have a maximum timeout of 5 seconds
3. IF `waitForSave` times out, THEN THE function SHALL resolve and log a warning
4. THE Save_Queue SHALL NOT cause memory leaks (clean up completed saves)
