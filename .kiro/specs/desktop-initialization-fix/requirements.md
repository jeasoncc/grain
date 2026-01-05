# Requirements Document

## Introduction

本规范解决 Desktop 应用中的关键问题：
1. TanStack Query DevTools 缺失
2. 删除数据后 SQLite 数据未被清除（事务问题）
3. 工作区重复创建问题
4. 首次使用时的默认用户和工作区创建逻辑

## Glossary

- **Query_Client**: TanStack Query 的核心实例，管理所有查询缓存
- **Initialization_State**: 应用初始化状态，标记是否已完成首次初始化
- **Workspace**: 工作区，用户数据的顶层容器
- **ActivityBar**: 侧边活动栏组件，负责工作区管理和文件创建
- **Transaction**: 数据库事务，确保多个操作的原子性

---

## 当前系统架构分析

### 前端数据层架构

```
┌─────────────────┐
│   Components    │  ← UI 组件，只负责渲染
└────────┬────────┘
         │ 调用
         ▼
┌─────────────────┐
│     Hooks       │  ← React 绑定层，连接 Query 和 Store
│  (use-xxx.ts)   │     例：useAllWorkspaces(), useNodesByWorkspace()
└────────┬────────┘
         │ 使用
         ▼
┌─────────────────┐
│    Queries      │  ← TanStack Query 层，管理缓存和数据获取
│ (xxx.queries.ts)│     例：useQuery({ queryFn: () => repo.getWorkspaces()() })
└────────┬────────┘
         │ 调用
         ▼
┌─────────────────┐
│     Actions     │  ← 业务操作层，组合多个 repo 调用
│ (xxx.action.ts) │     例：createWorkspace() 创建工作区 + 创建默认节点
└────────┬────────┘
         │ 调用
         ▼
┌─────────────────┐
│      Repo       │  ← 数据仓库层，封装 API 调用，返回 TaskEither
│ (xxx.repo.fn.ts)│     例：getWorkspaces(), createNode()
└────────┬────────┘
         │ 调用
         ▼
┌─────────────────┐
│   API Client    │  ← API 客户端，封装 Tauri invoke / HTTP fetch
│(api-client.fn.ts)│    例：invoke("get_workspaces")
└────────┬────────┘
         │ IPC/HTTP
         ▼
┌─────────────────┐
│  Rust Backend   │  ← Rust 后端，SQLite 操作
│  (Tauri/Warp)   │
└─────────────────┘
```

### 各层职责

| 层级 | 文件位置 | 职责 | 返回类型 |
|------|---------|------|---------|
| **Hooks** | `hooks/use-xxx.ts` | React 绑定，组合 Query 和 Store | React Hook |
| **Queries** | `queries/xxx.queries.ts` | 缓存管理，数据获取 | `useQuery` 结果 |
| **Actions** | `actions/xxx.action.ts` | 业务逻辑，组合多个操作 | `TaskEither` |
| **Repo** | `repo/xxx.repo.fn.ts` | 单一 API 调用封装 | `TaskEither` |
| **API Client** | `db/api-client.fn.ts` | 底层通信 | `TaskEither` |

### 当前应用启动流程

```
用户打开应用
    │
    ▼
main() 函数执行
    │
    ├── database.open()        ← 打开 Dexie (IndexedDB) 连接
    │
    ├── initDatabase()         ← 检查是否有用户，没有则创建默认用户
    │
    └── ReactDOM.render()      ← 渲染 React 应用
        │
        ▼
    ActivityBarContainer 挂载
        │
        ├── hasInitializedRef = useRef(false)  ← 组件级 ref
        │
        ├── useWorkspaces() 返回数据
        │
        └── if (workspaces.length === 0)
            │
            └── createWorkspace("My Workspace")  ← 自动创建工作区
```

### 当前删除数据流程

```
用户点击"删除所有数据"
    │
    ▼
handleDeleteAllData() 执行
    │
    ├── confirm() 确认对话框
    │
    ├── clearAllData()()       ← 调用 Rust 后端删除 SQLite 数据
    │   │
    │   └── invoke("clear_sqlite_data")
    │       └── Rust: clear_all_data() 使用事务删除
    │
    ├── setSelectedWorkspaceId(null)
    │
    ├── setSelectedNodeId(null)
    │
    ├── hasInitializedRef.current = false   ← 重置组件级 ref
    │
    └── setTimeout(() => window.location.reload(), 1000)
```

### 问题分析

**问题 1：数据未被删除**
- 用户报告点击删除后，SQLite 数据库中的 contents、workspaces、nodes 表数据仍然存在
- 需要验证 Rust 后端的事务是否正确执行

**问题 2：工作区重复创建**
- `hasInitializedRef` 是组件级 ref，组件重新挂载时重置为 false
- Query 缓存过期或加载中时返回空数组，触发重复创建

**问题 3：删除后自动重建**
- 即使数据被删除，刷新后 `initDatabase()` 会创建默认用户
- `ActivityBarContainer` 检测到无工作区会创建默认工作区

---

## Requirements

### Requirement 1: TanStack Query 依赖安装

**User Story:** As a developer, I want TanStack Query and DevTools properly installed, so that I can debug query states and ensure version consistency.

#### Acceptance Criteria

1. THE Package_Manager SHALL install `@tanstack/react-query` as an explicit dependency
2. THE Package_Manager SHALL install `@tanstack/react-query-devtools` as a dev dependency
3. WHEN the application starts in development mode, THE DevTools SHALL be available in the UI
4. THE DevTools SHALL be excluded from production builds

### Requirement 2: 删除数据事务保证

**User Story:** As a user, I want all data to be completely deleted when I click "Delete All Data", so that I can start fresh.

#### Acceptance Criteria

1. WHEN a user clicks "Delete All Data", THE System SHALL delete all records from contents table
2. WHEN a user clicks "Delete All Data", THE System SHALL delete all records from nodes table
3. WHEN a user clicks "Delete All Data", THE System SHALL delete all records from workspaces table
4. WHEN a user clicks "Delete All Data", THE System SHALL delete all records from users table
5. WHEN a user clicks "Delete All Data", THE System SHALL delete all records from tags table
6. WHEN a user clicks "Delete All Data", THE System SHALL delete all records from attachments table
7. THE System SHALL execute all deletions within a single database transaction
8. IF any deletion fails, THEN THE System SHALL rollback all changes
9. WHEN deletion completes, THE System SHALL clear all Query_Client caches
10. WHEN deletion completes, THE System SHALL reset all Zustand store states

### Requirement 3: 初始化状态持久化

**User Story:** As a user, I want the application to remember its initialization state, so that it doesn't create duplicate workspaces on each visit.

#### Acceptance Criteria

1. THE System SHALL persist Initialization_State using localStorage
2. WHEN the application starts and Initialization_State is initialized, THE System SHALL NOT create a default workspace
3. WHEN the application starts and Initialization_State is uninitialized AND no workspaces exist, THE System SHALL create one default workspace
4. WHEN a user deletes all data, THE System SHALL reset Initialization_State to uninitialized
5. THE Initialization_State SHALL survive component remounts and page refreshes

### Requirement 4: 防止工作区重复创建

**User Story:** As a user, I want to see only one default workspace when I first use the application, so that my workspace list stays clean.

#### Acceptance Criteria

1. WHEN the ActivityBar component mounts, THE System SHALL check Initialization_State before creating workspaces
2. IF Initialization_State is initialized, THEN THE System SHALL NOT create any workspace automatically
3. WHEN Query data is loading (undefined), THE System SHALL wait before making initialization decisions
4. THE System SHALL use atomic state updates to prevent race conditions
5. WHEN multiple components attempt initialization simultaneously, THE System SHALL ensure only one initialization occurs

### Requirement 5: 首次使用默认数据创建

**User Story:** As a new user, I want the application to create a default user and workspace with a friendly name, so that I can start using the app immediately.

#### Acceptance Criteria

1. WHEN a user opens the application for the first time, THE System SHALL create a default user with a random friendly name (e.g., "Clever Melon")
2. WHEN a default user is created, THE System SHALL also create a default workspace named "{username}'s Workspace"
3. THE default user and workspace creation SHALL be atomic (both succeed or both fail)
4. WHEN a user deletes all data and refreshes, THE System SHALL create new default user and workspace
5. THE System SHALL distinguish between "no data because first use" and "no data because deleted"

### Requirement 6: 删除后清除前端状态

**User Story:** As a user, I want all cached data to be cleared after deletion, so that I don't see stale data.

#### Acceptance Criteria

1. WHEN a user deletes all data, THE System SHALL call queryClient.clear() to clear all Query caches
2. WHEN a user deletes all data, THE System SHALL reset all Zustand stores to initial state
3. WHEN a user deletes all data, THE System SHALL clear localStorage (except essential app settings)
4. WHEN the page reloads after deletion, THE System SHALL treat it as a fresh start

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `apps/desktop/package.json` | 依赖配置 |
| `apps/desktop/src/main.tsx` | 应用入口 |
| `apps/desktop/src/db/init.db.fn.ts` | 数据库初始化 |
| `apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx` | ActivityBar 容器 |
| `apps/desktop/src/repo/clear-data.repo.fn.ts` | 清除数据仓库 |
| `apps/desktop/src/db/api-client.fn.ts` | API 客户端 |
| `apps/desktop/src/queries/workspace.queries.ts` | 工作区查询 |
| `packages/rust-core/src/db/clear_data_db_fn.rs` | Rust 清除数据实现 |
| `packages/rust-core/src/tauri/commands/clear_data_commands.rs` | Tauri 命令 |
