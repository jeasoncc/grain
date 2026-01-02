# Requirements Document

## Introduction

本规范定义了将前端数据访问层从 Dexie (IndexedDB) 迁移到 Rust 后端 (SQLite) 的要求。当前代码库存在两套数据访问层并存的问题，导致数据不一致和外键约束失败。

## Glossary

- **Dexie**: 前端 IndexedDB 封装库，位于 `@/db` 目录
- **Rust_Backend**: Tauri Rust 后端，使用 SQLite + SeaORM
- **Repository_Layer**: 前端 Repository 层，位于 `@/repo` 目录，封装 Rust API 调用
- **Action_Layer**: 业务操作层，位于 `@/actions` 目录
- **TaskEither**: fp-ts 的异步错误处理类型

## Requirements

### Requirement 1: 统一数据访问层

**User Story:** As a developer, I want all data operations to use a single data source, so that data consistency is guaranteed.

#### Acceptance Criteria

1. WHEN a component needs to create a workspace THEN THE Component SHALL use `@/actions/workspace/create-workspace.action` instead of `@/db/workspace.db.fn`
2. WHEN a component needs to update workspace lastOpen THEN THE Component SHALL use `@/actions/workspace/update-workspace.action` instead of `@/db/workspace.db.fn`
3. WHEN a component needs to query workspaces THEN THE Component SHALL use `@/hooks/use-workspace` which uses Repository_Layer
4. WHEN a component needs to create nodes THEN THE Component SHALL use `@/actions/node` or `@/actions/file` which use Repository_Layer

### Requirement 2: 移除 Dexie 依赖

**User Story:** As a developer, I want to remove unused Dexie code, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN all components are migrated THEN THE System SHALL have no imports from `@/db/workspace.db.fn` for workspace CRUD operations
2. WHEN all components are migrated THEN THE System SHALL have no imports from `@/db/node.db.fn` for node CRUD operations
3. IF a Dexie function is still needed for legacy features THEN THE System SHALL document the reason in the code

### Requirement 3: 代码规范审查

**User Story:** As a developer, I want the migrated code to follow project coding standards, so that the codebase remains consistent.

#### Acceptance Criteria

1. THE Migrated_Code SHALL use TaskEither for error handling
2. THE Migrated_Code SHALL use fp-ts pipe for function composition
3. THE Migrated_Code SHALL follow the import order: external libs → @/ aliases → relative imports
4. THE Migrated_Code SHALL have Chinese comments for documentation
5. THE Migrated_Code SHALL use logger instead of console.log for logging

### Requirement 4: 已修改文件审核

**User Story:** As a developer, I want the already modified files to be reviewed and fixed, so that they comply with coding standards.

#### Acceptance Criteria

1. THE `activity-bar.container.fn.tsx` SHALL import workspace actions from `@/actions/workspace`
2. THE `activity-bar.container.fn.tsx` SHALL not import `addWorkspace` or `touchWorkspace` from `@/db`
3. THE `update-workspace.action.ts` SHALL export `touchWorkspace` function
4. THE `Cargo.toml` SHALL have `default-run = "grain"` to resolve multiple binary conflict
5. THE `.cargo/config.toml` SHALL have sccache disabled to avoid conflict with incremental compilation
