# Requirements Document

## Introduction

本文档定义了将前端 Dexie (IndexedDB) 数据层迁移到 Rust 后端 (SQLite) 的需求规范。目标是统一数据源，消除双数据源冲突，保留日志专用的 IndexedDB 存储。

## Glossary

- **Dexie**: 前端 IndexedDB 的封装库，当前用于本地数据持久化
- **Rust_Backend**: 基于 Tauri 的 Rust 后端，使用 SQLite 作为持久化存储
- **Repo_Layer**: 前端数据仓库层，封装 Tauri invoke 调用，返回 TaskEither
- **DB_Layer**: 当前的 Dexie 数据库操作层 (`db/*.db.fn.ts`)
- **API_Client**: 统一的 API 客户端 (`db/api-client.fn.ts`)，支持 Tauri 和 HTTP 两种模式
- **Codec_Layer**: 类型转换层，负责前后端类型的编解码
- **Log_DB**: 日志专用的 IndexedDB 数据库，保留不迁移

## Current State Analysis

### 已迁移到 Rust 后端的模块

| 模块 | Dexie (db/*.db.fn.ts) | Repo (repo/*.repo.fn.ts) | Rust Commands | 状态 |
|------|----------------------|--------------------------|---------------|------|
| Node | ✅ node.db.fn.ts | ✅ node.repo.fn.ts | ✅ 完整 | 需要统一调用 |
| Content | ✅ content.db.fn.ts | ✅ content.repo.fn.ts | ✅ 完整 | 需要统一调用 |
| Workspace | ✅ workspace.db.fn.ts | ✅ workspace.repo.fn.ts | ✅ 完整 | 需要统一调用 |
| Backup | ✅ backup.db.fn.ts | ❌ 无 | ✅ 部分 | 需要创建 repo |
| Clear Data | ✅ clear-data.db.fn.ts | ❌ 无 | ✅ 完整 | 需要创建 repo |

### 需要迁移到 Rust 后端的模块

| 模块 | Dexie (db/*.db.fn.ts) | Rust Commands | 状态 |
|------|----------------------|---------------|------|
| User | ✅ user.db.fn.ts | ❌ 无 | 需要实现 Rust 后端 |
| Tag | ✅ tag.db.fn.ts | ❌ 无 | 需要实现 Rust 后端 |
| Attachment | ✅ attachment.db.fn.ts | ❌ 无 | 需要实现 Rust 后端 |

### 保留的 Dexie 模块

| 模块 | 文件 | 原因 |
|------|------|------|
| Log | log-db.ts | 日志高频写入，走 IPC 有性能开销；生命周期短，不需要持久化到主数据库 |

## Requirements

### Requirement 1: 统一已迁移模块的调用路径

**User Story:** As a developer, I want all data operations to go through the Repo layer, so that there is a single source of truth and consistent data flow.

#### Acceptance Criteria

1. WHEN a component or action needs Node data, THE System SHALL call functions from `repo/node.repo.fn.ts` instead of `db/node.db.fn.ts`
2. WHEN a component or action needs Content data, THE System SHALL call functions from `repo/content.repo.fn.ts` instead of `db/content.db.fn.ts`
3. WHEN a component or action needs Workspace data, THE System SHALL call functions from `repo/workspace.repo.fn.ts` instead of `db/workspace.db.fn.ts`
4. WHEN all references to Dexie Node/Content/Workspace functions are removed, THE System SHALL delete the corresponding `db/*.db.fn.ts` files

### Requirement 2: 创建 Backup Repo 层

**User Story:** As a developer, I want backup operations to use the Rust backend, so that backup data is consistent with the main database.

#### Acceptance Criteria

1. THE System SHALL create `repo/backup.repo.fn.ts` that wraps Rust backup commands
2. WHEN a backup is created, THE System SHALL call `api.createBackup()` through the repo layer
3. WHEN a backup is restored, THE System SHALL call `api.restoreBackup()` through the repo layer
4. WHEN backups are listed, THE System SHALL call `api.listBackups()` through the repo layer
5. WHEN a backup is deleted, THE System SHALL call `api.deleteBackup()` through the repo layer
6. WHEN old backups are cleaned up, THE System SHALL call `api.cleanupOldBackups()` through the repo layer

### Requirement 3: 创建 Clear Data Repo 层

**User Story:** As a developer, I want clear data operations to use the Rust backend, so that SQLite data is properly cleared.

#### Acceptance Criteria

1. THE System SHALL create `repo/clear-data.repo.fn.ts` that wraps Rust clear data commands
2. WHEN SQLite data is cleared, THE System SHALL call `api.clearSqliteData()` through the repo layer
3. WHEN SQLite data is cleared but users are kept, THE System SHALL call `api.clearSqliteDataKeepUsers()` through the repo layer
4. WHEN IndexedDB (logs) needs to be cleared, THE System SHALL call the local `log-db.ts` directly

### Requirement 4: 实现 User Rust 后端

**User Story:** As a developer, I want user data to be stored in SQLite, so that user information is consistent with other data.

#### Acceptance Criteria

1. THE Rust_Backend SHALL implement User entity with fields: id, username, email, plan, settings, features, state, token, createdAt, updatedAt
2. THE Rust_Backend SHALL implement CRUD commands: get_users, get_user, create_user, update_user, delete_user
3. THE Rust_Backend SHALL implement query commands: get_user_by_email, get_user_by_username, get_current_user
4. THE System SHALL create `repo/user.repo.fn.ts` that wraps Rust user commands
5. THE API_Client SHALL add user-related API methods
6. WHEN user data is accessed, THE System SHALL call functions from `repo/user.repo.fn.ts`

### Requirement 5: 实现 Tag Rust 后端

**User Story:** As a developer, I want tag data to be stored in SQLite, so that tag information is consistent with node data.

#### Acceptance Criteria

1. THE Rust_Backend SHALL implement Tag entity with fields: id, workspace, name, count, color, createdAt, updatedAt
2. THE Rust_Backend SHALL implement CRUD commands: get_tags_by_workspace, get_tag, create_tag, update_tag, delete_tag
3. THE Rust_Backend SHALL implement query commands: search_tags, get_nodes_by_tag, get_tag_graph_data
4. THE Rust_Backend SHALL implement sync commands: sync_tag_cache, rebuild_tag_cache, recalculate_tag_counts
5. THE System SHALL create `repo/tag.repo.fn.ts` that wraps Rust tag commands
6. THE API_Client SHALL add tag-related API methods
7. WHEN tag data is accessed, THE System SHALL call functions from `repo/tag.repo.fn.ts`

### Requirement 6: 实现 Attachment Rust 后端

**User Story:** As a developer, I want attachment data to be stored in SQLite, so that attachment metadata is consistent with other data.

#### Acceptance Criteria

1. THE Rust_Backend SHALL implement Attachment entity with fields: id, project, name, type, size, path, mimeType, createdAt
2. THE Rust_Backend SHALL implement CRUD commands: get_attachments, get_attachment, create_attachment, update_attachment, delete_attachment
3. THE Rust_Backend SHALL implement query commands: get_attachments_by_project, get_attachments_by_type, get_images_by_project, get_audio_files_by_project
4. THE System SHALL create `repo/attachment.repo.fn.ts` that wraps Rust attachment commands
5. THE API_Client SHALL add attachment-related API methods
6. WHEN attachment data is accessed, THE System SHALL call functions from `repo/attachment.repo.fn.ts`

### Requirement 7: 清理 Dexie 数据库定义

**User Story:** As a developer, I want to remove unused Dexie tables, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN all modules are migrated, THE System SHALL update `db/database.ts` to only contain the logs table definition
2. THE System SHALL remove unused table definitions: nodes, contents, workspaces, users, attachments, tags, dbVersions
3. THE System SHALL rename `GrainDatabase` to `LogDatabase` to reflect its purpose
4. THE System SHALL update `db/index.ts` to only export log-related functions and repo layer re-exports

### Requirement 8: 更新 Hooks 层

**User Story:** As a developer, I want React hooks to use the Repo layer, so that components get data from the correct source.

#### Acceptance Criteria

1. WHEN `use-user.ts` accesses user data, THE Hook SHALL call `repo/user.repo.fn.ts` instead of using `useLiveQuery` with Dexie
2. WHEN `use-tag.ts` accesses tag data, THE Hook SHALL call `repo/tag.repo.fn.ts` instead of using `useLiveQuery` with Dexie
3. WHEN `use-attachment.ts` accesses attachment data, THE Hook SHALL call `repo/attachment.repo.fn.ts` instead of using `useLiveQuery` with Dexie
4. THE System SHALL remove `dexie-react-hooks` dependency after all hooks are migrated

### Requirement 9: 保留日志 IndexedDB

**User Story:** As a developer, I want logs to remain in IndexedDB, so that high-frequency log writes don't impact performance.

#### Acceptance Criteria

1. THE System SHALL keep `log-db.ts` unchanged
2. THE System SHALL keep the `LogDB` class and `logDB` instance
3. WHEN logs are written, THE System SHALL use the local IndexedDB directly
4. WHEN logs are cleared, THE System SHALL clear the local IndexedDB logs table

### Requirement 10: 数据迁移策略

**User Story:** As a user, I want my existing Dexie data to be migrated to SQLite, so that I don't lose any data.

#### Acceptance Criteria

1. WHEN the application starts and detects existing Dexie data, THE System SHALL prompt the user to migrate
2. WHEN migration is initiated, THE System SHALL read all data from Dexie tables
3. WHEN migration is initiated, THE System SHALL write all data to SQLite through Rust backend
4. WHEN migration is complete, THE System SHALL mark Dexie data as migrated
5. IF migration fails, THEN THE System SHALL rollback and preserve Dexie data
6. WHEN migration is successful, THE System SHALL optionally clear migrated Dexie data

### Requirement 11: 初始化流程重构

**User Story:** As a developer, I want the database initialization to use Rust backend, so that the startup flow is consistent.

#### Acceptance Criteria

1. WHEN the application starts, THE System SHALL initialize SQLite database through Rust backend
2. WHEN checking if database is initialized, THE System SHALL call Rust backend instead of Dexie
3. WHEN creating default user, THE System SHALL call Rust backend instead of Dexie
4. THE System SHALL update `db/init.db.fn.ts` to use repo layer functions
