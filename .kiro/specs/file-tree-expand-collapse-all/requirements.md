# Requirements Document / 需求文档

## Introduction / 简介

This document defines the requirements for refactoring the file tree expand/collapse logic and adding "Expand All" and "Collapse All" buttons to the file tree panel.

本文档定义了重构文件树展开/折叠逻辑以及为文件树面板添加"全部展开"和"全部折叠"按钮的需求。

### Project Scope / 项目范围

This project consists of two phases:

本项目包含两个阶段：

**Phase 1: Refactor Existing Logic / 阶段 1：重构现有逻辑**
- Remove database persistence for folder expand/collapse state / 移除文件夹展开/折叠状态的数据库持久化
- Move expand/collapse state management to Zustand / 将展开/折叠状态管理移至 Zustand
- Use functional programming style (TaskEither, pipe) / 使用函数式编程风格（TaskEither, pipe）
- Remove `use-optimistic-collapse.ts` hook / 移除 `use-optimistic-collapse.ts` hook

**Phase 2: Add Expand/Collapse All Buttons / 阶段 2：添加全部展开/折叠按钮**
- Add "Expand All" and "Collapse All" buttons to Explorer Header / 在资源管理器标题栏添加"全部展开"和"全部折叠"按钮
- Implement batch expand/collapse operations / 实现批量展开/折叠操作
- Use functional programming style (TaskEither, pipe) / 使用函数式编程风格（TaskEither, pipe）

## Glossary / 术语表

- **File_Tree / 文件树**: The hierarchical tree view component that displays workspace files and folders / 显示工作区文件和文件夹的层级树视图组件
- **Folder_Node / 文件夹节点**: A node in the file tree that represents a folder (can contain children) / 文件树中代表文件夹的节点（可以包含子节点）
- **Expanded_State / 展开状态**: The UI state that determines whether a folder node shows its children / 决定文件夹节点是否显示其子节点的 UI 状态
- **Sidebar_Store / 侧边栏存储**: The Zustand store that manages sidebar UI state including folder expansion / 管理侧边栏 UI 状态（包括文件夹展开）的 Zustand 存储
- **Explorer_Header / 资源管理器标题栏**: The top bar of the file tree panel containing action buttons / 文件树面板顶部包含操作按钮的标题栏
- **TaskEither**: A functional programming monad for handling asynchronous operations with error handling / 用于处理带错误处理的异步操作的函数式编程单子
- **Collapsed_Field / Collapsed 字段**: The `collapsed` field in NodeInterface, used as initial state from database / NodeInterface 中的 `collapsed` 字段，用作从数据库读取的初始状态

## Requirements / 需求

### Phase 1: Refactoring Requirements / 阶段 1：重构需求

### Requirement 1: Remove Database Persistence for Expand/Collapse / 需求 1：移除展开/折叠的数据库持久化

**User Story / 用户故事:** As a developer, I want to remove unnecessary database writes for folder expand/collapse operations, so that the application performs better and the architecture is cleaner.

作为开发者，我希望移除文件夹展开/折叠操作的不必要数据库写入，以便应用程序性能更好且架构更清晰。

#### Acceptance Criteria / 验收标准

1. WHEN a user expands or collapses a folder, THE system SHALL NOT write to the database
   
   当用户展开或折叠文件夹时，系统不应写入数据库

2. THE NodeInterface.collapsed field SHALL be preserved as initial state from database
   
   NodeInterface.collapsed 字段应保留作为从数据库读取的初始状态

3. THE system SHALL use Zustand expandedFolders as the single source of truth for runtime state
   
   系统应使用 Zustand expandedFolders 作为运行时状态的唯一数据源

4. THE use-optimistic-collapse.ts hook SHALL be removed
   
   use-optimistic-collapse.ts hook 应被移除

### Requirement 2: Functional Programming Style / 需求 2：函数式编程风格

**User Story / 用户故事:** As a developer, I want all asynchronous operations to use TaskEither and pipe, so that the code is consistent with the project's functional programming principles.

作为开发者，我希望所有异步操作使用 TaskEither 和 pipe，以便代码与项目的函数式编程原则保持一致。

#### Acceptance Criteria / 验收标准

1. THE system SHALL NOT use async/await syntax for asynchronous operations
   
   系统不应使用 async/await 语法进行异步操作

2. THE system SHALL use TaskEither for all operations that may fail
   
   系统应对所有可能失败的操作使用 TaskEither

3. THE system SHALL use pipe for composing operations
   
   系统应使用 pipe 来组合操作

4. THE system SHALL use TE.fold or TE.match for handling results
   
   系统应使用 TE.fold 或 TE.match 来处理结果

### Requirement 3: Initialize Expand State from Database / 需求 3：从数据库初始化展开状态

**User Story / 用户故事:** As a user, I want the file tree to initialize with sensible default expand states, so that I have a good starting point when opening a workspace.

作为用户，我希望文件树以合理的默认展开状态初始化，以便在打开工作区时有一个良好的起点。

#### Acceptance Criteria / 验收标准

1. WHEN nodes are loaded from database, THE system SHALL initialize Zustand expandedFolders from NodeInterface.collapsed
   
   当从数据库加载节点时，系统应从 NodeInterface.collapsed 初始化 Zustand expandedFolders

2. WHEN NodeInterface.collapsed is undefined, THE system SHALL default to collapsed (false in expandedFolders)
   
   当 NodeInterface.collapsed 未定义时，系统应默认为折叠状态（expandedFolders 中为 false）

3. WHEN workspace changes, THE system SHALL reinitialize expandedFolders
   
   当工作区更改时，系统应重新初始化 expandedFolders

4. THE expandedFolders state SHALL NOT be persisted to localStorage
   
   expandedFolders 状态不应持久化到 localStorage

5. WHEN the application restarts, THE expandedFolders SHALL be reinitialized from database
   
   当应用程序重启时，expandedFolders 应从数据库重新初始化

### Phase 2: New Feature Requirements / 阶段 2：新功能需求

### Phase 2: New Feature Requirements / 阶段 2：新功能需求

### Requirement 4: Expand All Folders / 需求 4：展开所有文件夹

**User Story / 用户故事:** As a user, I want to expand all folders in the file tree with one click, so that I can quickly view the entire project structure.

作为用户，我希望通过一次点击展开文件树中的所有文件夹，以便快速查看整个项目结构。

#### Acceptance Criteria / 验收标准

1. WHEN the user clicks the "Expand All" button, THE File_Tree SHALL expand all Folder_Node items
   
   当用户点击"全部展开"按钮时，文件树应展开所有文件夹节点项

2. WHEN all folders are expanded, THE File_Tree SHALL display all nested children
   
   当所有文件夹展开时，文件树应显示所有嵌套的子节点

3. WHEN the expand operation completes, THE Sidebar_Store SHALL update the expandedFolders state
   
   当展开操作完成时，侧边栏存储应更新 expandedFolders 状态

4. THE operation SHALL NOT trigger database writes
   
   操作不应触发数据库写入

5. THE operation SHALL use functional programming style (no async/await)
   
   操作应使用函数式编程风格（无 async/await）

### Requirement 5: Collapse All Folders / 需求 5：折叠所有文件夹

**User Story / 用户故事:** As a user, I want to collapse all folders in the file tree with one click, so that I can quickly simplify the view and focus on top-level items.

作为用户，我希望通过一次点击折叠文件树中的所有文件夹，以便快速简化视图并专注于顶层项目。

#### Acceptance Criteria / 验收标准

1. WHEN the user clicks the "Collapse All" button, THE File_Tree SHALL collapse all Folder_Node items
   
   当用户点击"全部折叠"按钮时，文件树应折叠所有文件夹节点项

2. WHEN all folders are collapsed, THE File_Tree SHALL hide all nested children
   
   当所有文件夹折叠时，文件树应隐藏所有嵌套的子节点

3. WHEN the collapse operation completes, THE Sidebar_Store SHALL update the expandedFolders state
   
   当折叠操作完成时，侧边栏存储应更新 expandedFolders 状态

4. THE operation SHALL NOT trigger database writes
   
   操作不应触发数据库写入

5. THE operation SHALL use functional programming style (no async/await)
   
   操作应使用函数式编程风格（无 async/await）

### Requirement 6: Button Placement and Visibility / 需求 6：按钮位置和可见性

**User Story / 用户故事:** As a user, I want the expand/collapse buttons to be easily accessible, so that I can use them without searching.

作为用户，我希望展开/折叠按钮易于访问，这样我就可以使用它们而无需搜索。

#### Acceptance Criteria / 验收标准

1. THE Explorer_Header SHALL display the "Expand All" and "Collapse All" buttons
   
   资源管理器标题栏应显示"全部展开"和"全部折叠"按钮

2. THE buttons SHALL be positioned next to the existing "Create Folder" and "Create File" buttons
   
   这些按钮应位于现有的"创建文件夹"和"创建文件"按钮旁边

3. WHEN the user hovers over the Explorer_Header, THE buttons SHALL become visible
   
   当用户悬停在资源管理器标题栏上时，按钮应变为可见

4. THE buttons SHALL use appropriate icons to indicate their function
   
   按钮应使用适当的图标来指示其功能

### Requirement 7: Button State Management / 需求 7：按钮状态管理

**User Story / 用户故事:** As a user, I want the buttons to be disabled when not applicable, so that I understand when they can be used.

作为用户，我希望在不适用时禁用按钮，这样我就能理解何时可以使用它们。

#### Acceptance Criteria / 验收标准

1. WHEN there are no folder nodes in the workspace, THE buttons SHALL be disabled
   
   当工作区中没有文件夹节点时，按钮应被禁用

2. WHEN the file tree is empty, THE buttons SHALL be disabled
   
   当文件树为空时，按钮应被禁用

3. THE buttons SHALL remain enabled when at least one folder exists
   
   当至少存在一个文件夹时，按钮应保持启用状态

**User Story / 用户故事:** As a user, I want to expand all folders in the file tree with one click, so that I can quickly view the entire project structure.

作为用户，我希望通过一次点击展开文件树中的所有文件夹，以便快速查看整个项目结构。

#### Acceptance Criteria / 验收标准

1. WHEN the user clicks the "Expand All" button, THE File_Tree SHALL expand all Folder_Node items
   
   当用户点击"全部展开"按钮时，文件树应展开所有文件夹节点项

2. WHEN all folders are expanded, THE File_Tree SHALL display all nested children
   
   当所有文件夹展开时，文件树应显示所有嵌套的子节点

3. WHEN the expand operation completes, THE Sidebar_Store SHALL update the expandedFolders state
   
   当展开操作完成时，侧边栏存储应更新 expandedFolders 状态

4. THE File_Tree SHALL respond immediately without waiting for backend operations
   
   文件树应立即响应，无需等待后端操作

### Requirement 2: Collapse All Folders / 需求 2：折叠所有文件夹

**User Story / 用户故事:** As a user, I want to collapse all folders in the file tree with one click, so that I can quickly simplify the view and focus on top-level items.

作为用户，我希望通过一次点击折叠文件树中的所有文件夹，以便快速简化视图并专注于顶层项目。

#### Acceptance Criteria / 验收标准

1. WHEN the user clicks the "Collapse All" button, THE File_Tree SHALL collapse all Folder_Node items
   
   当用户点击"全部折叠"按钮时，文件树应折叠所有文件夹节点项

2. WHEN all folders are collapsed, THE File_Tree SHALL hide all nested children
   
   当所有文件夹折叠时，文件树应隐藏所有嵌套的子节点

3. WHEN the collapse operation completes, THE Sidebar_Store SHALL update the expandedFolders state
   
   当折叠操作完成时，侧边栏存储应更新 expandedFolders 状态

4. THE File_Tree SHALL respond immediately without waiting for backend operations
   
   文件树应立即响应，无需等待后端操作

### Requirement 3: Button Placement and Visibility / 需求 3：按钮位置和可见性

**User Story / 用户故事:** As a user, I want the expand/collapse buttons to be easily accessible, so that I can use them without searching.

作为用户，我希望展开/折叠按钮易于访问，这样我就可以使用它们而无需搜索。

#### Acceptance Criteria / 验收标准

1. THE Explorer_Header SHALL display the "Expand All" and "Collapse All" buttons
   
   资源管理器标题栏应显示"全部展开"和"全部折叠"按钮

2. THE buttons SHALL be positioned next to the existing "Create Folder" and "Create File" buttons
   
   这些按钮应位于现有的"创建文件夹"和"创建文件"按钮旁边

3. WHEN the user hovers over the Explorer_Header, THE buttons SHALL become visible
   
   当用户悬停在资源管理器标题栏上时，按钮应变为可见

4. THE buttons SHALL use appropriate icons to indicate their function
   
   按钮应使用适当的图标来指示其功能

### Requirement 7: Button State Management / 需求 7：按钮状态管理

**User Story / 用户故事:** As a user, I want the buttons to be disabled when not applicable, so that I understand when they can be used.

作为用户，我希望在不适用时禁用按钮，这样我就能理解何时可以使用它们。

#### Acceptance Criteria / 验收标准

1. WHEN there are no folder nodes in the workspace, THE buttons SHALL be disabled
   
   当工作区中没有文件夹节点时，按钮应被禁用

2. WHEN the file tree is empty, THE buttons SHALL be disabled
   
   当文件树为空时，按钮应被禁用

3. THE buttons SHALL remain enabled when at least one folder exists
   
   当至少存在一个文件夹时，按钮应保持启用状态

### Requirement 8: Performance and Responsiveness / 需求 8：性能和响应性

**User Story / 用户故事:** As a user, I want the expand/collapse operations to be fast, so that the UI remains responsive.

作为用户，我希望展开/折叠操作快速执行，以便 UI 保持响应。

#### Acceptance Criteria / 验收标准

1. WHEN the user triggers expand/collapse, THE UI SHALL update immediately
   
   当用户触发展开/折叠时，UI 应立即更新

2. THE operation SHALL only update the Sidebar_Store state
   
   操作应仅更新侧边栏存储状态

3. THE operation SHALL NOT trigger backend API calls
   
   操作不应触发后端 API 调用

4. THE operation SHALL NOT trigger database writes
   
   操作不应触发数据库写入
