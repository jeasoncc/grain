# Requirements Document

## Introduction

重构编辑器标签页（Editor Tabs）的数据流架构，解决当前存在的双数据源冲突问题。当前 tabs 被持久化到 localStorage，而 content 存储在 IndexedDB，导致页面刷新后出现 tabs 存在但内容为空的问题。

本次重构将：
1. 移除 tabs 的 localStorage 持久化，使其成为纯内存状态
2. 引入文件操作队列（p-queue），确保文件打开/创建操作的有序执行
3. 建立单一数据源架构：IndexedDB → Store → Components
4. 统一文件创建和打开的入口，所有操作通过队列执行

详细设计模式参见：#[[file:.kiro/steering/design-patterns.md]]

## Glossary

- **Editor_Tabs_Store**: 管理编辑器标签页状态的 Zustand store，纯内存状态
- **File_Operation_Queue**: 基于 p-queue 的文件操作队列，模块级单例，确保操作串行执行
- **Content_DB**: IndexedDB 中存储文件内容的数据库表（contents 表）
- **Node_DB**: IndexedDB 中存储节点元数据的数据库表（nodes 表）
- **Editor_Instance**: 单个 Lexical 编辑器实例
- **Multi_Editor_Container**: 管理多个编辑器实例的容器组件
- **Open_File_Action**: 打开文件的统一 action，通过队列执行
- **Create_File_Action**: 创建文件的统一 action，通过队列执行

## Requirements

### Requirement 1: 移除 Tabs 持久化

**User Story:** As a developer, I want tabs to be pure memory state, so that there is only one source of truth (IndexedDB) for content data.

#### Acceptance Criteria

1. WHEN the application starts, THE Editor_Tabs_Store SHALL initialize with empty tabs array
2. WHEN the page is refreshed, THE Editor_Tabs_Store SHALL reset to empty state
3. WHEN a user opens a file, THE System SHALL load content from Content_DB before creating the tab
4. THE Editor_Tabs_Store SHALL NOT use any persistence middleware (localStorage, sessionStorage)

### Requirement 2: 文件操作队列

**User Story:** As a user, I want file operations to execute in order, so that rapid clicking does not cause race conditions or data corruption.

#### Acceptance Criteria

1. THE File_Operation_Queue SHALL be a module-level singleton instance
2. THE File_Operation_Queue SHALL execute operations with concurrency of 1 (serial execution)
3. WHEN a user opens a file, THE System SHALL enqueue the operation to File_Operation_Queue
4. WHEN a user creates a new file, THE System SHALL enqueue the operation to File_Operation_Queue
5. THE File_Operation_Queue SHALL NOT be stored in any Zustand store
6. WHEN an operation is enqueued, THE System SHALL return a Promise that resolves when the operation completes

### Requirement 3: 单一数据源数据流

**User Story:** As a developer, I want a clear single-source-of-truth data flow, so that the application state is predictable and debuggable.

#### Acceptance Criteria

1. WHEN opening a file, THE System SHALL first load content from Content_DB
2. WHEN content is loaded from Content_DB, THE System SHALL then update Editor_Tabs_Store
3. WHEN Editor_Tabs_Store is updated, THE Multi_Editor_Container SHALL render the Editor_Instance
4. THE Editor_Instance SHALL NOT render until content is loaded from Content_DB
5. IF Content_DB returns no content for a node, THE System SHALL create the tab with empty content

### Requirement 4: 编辑器实例生命周期

**User Story:** As a user, I want editors to only exist when I have files open, so that the application uses memory efficiently.

#### Acceptance Criteria

1. WHEN no tabs are open, THE Multi_Editor_Container SHALL display an empty state
2. WHEN a tab is closed, THE System SHALL remove the corresponding Editor_Instance from memory
3. WHEN all tabs are closed, THE Editor_Tabs_Store SHALL have empty tabs array and empty editorStates
4. THE System SHALL NOT persist any editor state across page refreshes

### Requirement 5: 打开文件操作重构

**User Story:** As a user, I want to open files reliably, so that I always see the correct content.

#### Acceptance Criteria

1. WHEN a user clicks a file in the file tree, THE System SHALL enqueue an open-file operation
2. THE open-file operation SHALL load content from Content_DB
3. THE open-file operation SHALL create a new tab with the loaded content
4. THE open-file operation SHALL set the new tab as active
5. IF the file is already open, THE System SHALL switch to the existing tab without reloading content
6. WHEN the open-file operation completes, THE Editor_Instance SHALL display the loaded content

### Requirement 6: 架构约束

**User Story:** As a developer, I want clear architectural boundaries, so that the codebase remains maintainable.

#### Acceptance Criteria

1. THE File_Operation_Queue SHALL be located in `lib/` directory
2. THE Open_File_Action and Create_File_Action SHALL be located in `actions/file/` directory
3. THE Editor_Tabs_Store SHALL only contain pure data (no class instances, no queue references)
4. THE System SHALL follow the existing dependency rules defined in architecture.md
5. WHEN a component needs to open or create a file, THE component SHALL call the corresponding action function

### Requirement 7: 统一文件创建流程

**User Story:** As a developer, I want all file creation to go through a single unified flow, so that the codebase is consistent and maintainable.

#### Acceptance Criteria

1. THE Create_File_Action SHALL be the single entry point for all file creation operations
2. WHEN creating a file, THE Create_File_Action SHALL first create content in Content_DB
3. WHEN content is created successfully, THE Create_File_Action SHALL then create node in Node_DB
4. WHEN node is created successfully, THE Create_File_Action SHALL update Editor_Tabs_Store
5. THE Create_File_Action SHALL be enqueued to File_Operation_Queue
6. ALL template file creators (Diary, Wiki, Ledger, etc.) SHALL use Create_File_Action internally
7. THE ActivityBar and FileTree SHALL both call the same Create_File_Action

### Requirement 8: 统一文件打开流程

**User Story:** As a developer, I want all file opening to go through a single unified flow, so that content is always loaded before rendering.

#### Acceptance Criteria

1. THE Open_File_Action SHALL be the single entry point for all file opening operations
2. WHEN opening a file, THE Open_File_Action SHALL first load content from Content_DB
3. WHEN content is loaded, THE Open_File_Action SHALL then update Editor_Tabs_Store with both tab and content
4. THE Open_File_Action SHALL be enqueued to File_Operation_Queue
5. THE FileTree, CommandPalette, and any other component SHALL all call the same Open_File_Action
6. IF the file is already open in a tab, THE Open_File_Action SHALL only switch to that tab without reloading

### Requirement 9: 高阶函数模板创建

**User Story:** As a developer, I want template file creation to use a high-order function pattern, so that adding new template types is easy and consistent.

#### Acceptance Criteria

1. THE System SHALL provide a `createTemplatedFile` high-order function
2. THE `createTemplatedFile` function SHALL accept a template configuration and return a file creator function
3. ALL template creators (Diary, Wiki, Ledger, Todo, Note, etc.) SHALL be instances of `createTemplatedFile`
4. THE template configuration SHALL include: rootFolder, fileType, tag, generateTemplate, generateFolderPath, generateTitle
5. WHEN a template creator is called, THE System SHALL use Create_File_Action internally
