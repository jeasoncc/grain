# Implementation Plan: File Tree Expand/Collapse Refactoring / 实施计划：文件树展开/折叠重构

## Overview / 概述

This implementation plan refactors the file tree expand/collapse logic and adds "Expand All" and "Collapse All" buttons. The work is divided into two phases: refactoring existing logic and adding new features.

本实施计划重构文件树展开/折叠逻辑并添加"全部展开"和"全部折叠"按钮。工作分为两个阶段：重构现有逻辑和添加新功能。

## Phase 1: Refactoring / 阶段 1：重构

### Task 1: Create Pure Functions for Expand State Initialization / 任务 1：创建展开状态初始化的纯函数

- [ ] 1.1 Create `apps/desktop/src/pipes/node/node.expand-init.fn.ts`
  - Implement `initializeExpandedFolders` function
  - Read from `NodeInterface.collapsed` field
  - Default to `false` (collapsed) when undefined
  - _Requirements: 3.1, 3.2_

- [ ] 1.2 Export from `apps/desktop/src/pipes/node/index.ts`
  - Add export for `initializeExpandedFolders`
  - _Requirements: 3.1_

### Task 2: Remove Database Persistence / 任务 2：移除数据库持久化

- [ ] 2.1 Update `apps/desktop/src/state/sidebar.state.ts`
  - Modify `partialize` function in persist middleware
  - Remove `fileTreeState` from persisted state
  - Keep `expandedFolders` in runtime state only
  - _Requirements: 1.1, 1.3, 3.4_

- [ ] 2.2 Delete `apps/desktop/src/hooks/use-optimistic-collapse.ts`
  - Remove entire file
  - _Requirements: 1.4_

### Task 3: Simplify Toggle Logic / 任务 3：简化切换逻辑

- [ ] 3.1 Update `apps/desktop/src/hooks/use-file-tree-panel.ts`
  - Remove import of `useOptimisticCollapse`
  - Remove `setCollapsedAsync` wrapper function
  - Simplify `handleToggleCollapsed` to directly call `useSidebarStore.getState().toggleFolderExpanded(nodeId)`
  - Use functional programming style (no async/await)
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3_

### Task 4: Initialize Expand State on Load / 任务 4：加载时初始化展开状态

- [ ] 4.1 Add initialization logic to `apps/desktop/src/hooks/use-file-tree-panel.ts`
  - Import `initializeExpandedFolders` from pipes
  - Add `useEffect` to initialize when nodes load
  - Reinitialize when workspace changes
  - Use functional programming style
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

### Task 5: Update File Tree to Use Zustand State / 任务 5：更新文件树使用 Zustand 状态

- [ ] 5.1 Update `apps/desktop/src/hooks/use-file-tree.ts`
  - Import `useExpandedFolders` from sidebar state
  - Pass `expandedFolders` to `buildTreeData`
  - Modify `buildTreeData` to read from `expandedFolders` instead of `node.collapsed`
  - _Requirements: 1.3_

- [ ] 5.2 Update `buildTreeData` function signature
  - Add `expandedFolders` parameter
  - Map `expandedFolders[node.id]` to `TreeData.collapsed`
  - Default to `true` (collapsed) when not in map
  - _Requirements: 1.3_

### Task 6: Checkpoint - Verify Refactoring / 任务 6：检查点 - 验证重构

- [ ] 6.1 Manual testing
  - Test single folder expand/collapse
  - Verify no database writes occur
  - Verify state resets on workspace change
  - Verify state resets on app restart
  - _Requirements: 1.1, 1.3, 3.3, 3.5_

## Phase 2: Add Expand/Collapse All / 阶段 2：添加全部展开/折叠

### Task 7: Create Pure Functions for Batch Operations / 任务 7：创建批量操作的纯函数

- [x] 7.1 Create `apps/desktop/src/pipes/node/node.expand-all.fn.ts`
  - Implement `calculateExpandAllFolders` function
  - Implement `calculateCollapseAllFolders` function
  - Implement `hasFolders` function
  - All functions should be pure (no side effects)
  - _Requirements: 4.1, 4.3, 5.1, 5.3, 7.1, 7.3_

- [x] 7.2 Export from `apps/desktop/src/pipes/node/index.ts`
  - Add exports for all three functions
  - _Requirements: 4.1, 5.1_

### Task 8: Add UI Buttons / 任务 8：添加 UI 按钮

- [x] 8.1 Update `apps/desktop/src/views/file-tree/file-tree.view.fn.tsx`
  - Import icons: `ChevronsDownUp`, `ChevronsUpDown` from lucide-react
  - Import pure functions from pipes
  - Import `useSidebarStore` from state
  - _Requirements: 6.1, 6.4_

- [x] 8.2 Add button handlers
  - Implement `handleExpandAll` using `useCallback`
  - Implement `handleCollapseAll` using `useCallback`
  - Both handlers should update Zustand and sync react-arborist
  - Use functional programming style (no async/await)
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3, 5.5, 8.1, 8.2, 8.3_

- [x] 8.3 Add button enabled state
  - Implement `hasAnyFolders` using `useMemo`
  - Disable buttons when no folders exist
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 8.4 Add buttons to Explorer Header
  - Position before existing "Create Folder" and "Create File" buttons
  - Use consistent styling with existing buttons
  - Add hover visibility (opacity-0 group-hover/header:opacity-100)
  - Add appropriate titles (bilingual: Chinese / English)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

### Task 9: Checkpoint - Verify New Features / 任务 9：检查点 - 验证新功能

- [ ] 9.1 Manual testing
  - Test "Expand All" button
  - Test "Collapse All" button
  - Verify buttons disabled when no folders
  - Verify buttons appear on hover
  - Verify no database writes occur
  - Verify UI updates immediately
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

## Notes / 注意事项

- All code must use functional programming style (TaskEither + pipe, no async/await) / 所有代码必须使用函数式编程风格（TaskEither + pipe，无 async/await）
- No database writes for expand/collapse operations / 展开/折叠操作不写数据库
- expandedFolders is not persisted to localStorage / expandedFolders 不持久化到 localStorage
- State resets on workspace change and app restart / 状态在工作区更改和应用重启时重置
- All functions in pipes/ must be pure / pipes/ 中的所有函数必须是纯函数
- Use Zustand as single source of truth for runtime state / 使用 Zustand 作为运行时状态的唯一数据源
