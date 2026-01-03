# Design Document: Dexie to Rust Migration

## Overview

本设计文档描述将前端 Dexie (IndexedDB) 数据层迁移到 Rust 后端 (SQLite) 的技术方案。迁移后，前端将通过 Repo 层统一访问 Rust 后端，只保留日志专用的 IndexedDB。

### 设计目标

1. **单一数据源** - SQLite 是唯一的业务数据持久化存储
2. **统一数据流** - 所有数据操作通过 Repo → API Client → Rust Backend
3. **类型安全** - 通过 Codec 层确保前后端类型解耦
4. **渐进式迁移** - 分阶段迁移，确保每个阶段可独立验证

## Architecture

### 迁移后的数据流架构

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              迁移后的数据流架构                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   React 组件    │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
           │    Hooks      │        │   Actions     │        │   Stores      │
           │ (use-*.ts)    │        │ (*.action.ts) │        │ (*.store.ts)  │
           └───────┬───────┘        └───────┬───────┘        └───────────────┘
                   │                        │
                   └────────────────────────┤
                                            │
                                            ▼
                          ┌─────────────────────────────────────┐
                          │           Repo Layer                │
                          │      (repo/*.repo.fn.ts)            │
                          │                                     │
                          │  - node.repo.fn.ts                  │
                          │  - content.repo.fn.ts               │
                          │  - workspace.repo.fn.ts             │
                          │  - user.repo.fn.ts      ← 新增      │
                          │  - tag.repo.fn.ts       ← 新增      │
                          │  - attachment.repo.fn.ts ← 新增     │
                          │  - backup.repo.fn.ts    ← 新增      │
                          │  - clear-data.repo.fn.ts ← 新增     │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │          Codec Layer                │
                          │     (types/codec/*.codec.ts)        │
                          │                                     │
                          │  前端类型 ←→ Rust API 类型           │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         API Client                  │
                          │     (db/api-client.fn.ts)           │
                          │                                     │
                          │  Tauri: invoke()                    │
                          │  Web: fetch()                       │
                          └──────────────────┬──────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
           │ Tauri Runtime │        │  Warp Server  │        │   Log DB      │
           │   (IPC)       │        │   (HTTP)      │        │  (IndexedDB)  │
           └───────┬───────┘        └───────┬───────┘        └───────────────┘
                   │                        │                        │
                   └────────────────────────┤                        │
                                            │                        │
                                            ▼                        │
                          ┌─────────────────────────────────────┐    │
                          │          rust-core                  │    │
                          │                                     │    │
                          │  types/ → fn/ → db/                 │    │
                          └──────────────────┬──────────────────┘    │
                                             │                       │
                                             ▼                       │
                          ┌─────────────────────────────────────┐    │
                          │           SQLite                    │    │
                          │    ~/.local/share/grain/grain.db    │    │
                          └─────────────────────────────────────┘    │
                                                                     │
                          ┌─────────────────────────────────────┐    │
                          │         IndexedDB (日志)             │◀───┘
                          │       NovelEditorLogsDB             │
                          └─────────────────────────────────────┘
```

### 迁移阶段

```
Phase 1: 统一已迁移模块
├── 更新 Node/Content/Workspace 调用路径
├── 删除对应的 db/*.db.fn.ts 文件
└── 验证功能正常

Phase 2: 创建 Backup/ClearData Repo
├── 创建 backup.repo.fn.ts
├── 创建 clear-data.repo.fn.ts
└── 更新调用方

Phase 3: 实现 User Rust 后端
├── rust-core: types/user/
├── rust-core: db/user_db_fn.rs
├── rust-core: tauri/commands/user_commands.rs
├── 前端: repo/user.repo.fn.ts
└── 前端: 更新 hooks/use-user.ts

Phase 4: 实现 Tag Rust 后端
├── rust-core: types/tag/
├── rust-core: db/tag_db_fn.rs
├── rust-core: tauri/commands/tag_commands.rs
├── 前端: repo/tag.repo.fn.ts
└── 前端: 更新 hooks/use-tag.ts

Phase 5: 实现 Attachment Rust 后端
├── rust-core: types/attachment/
├── rust-core: db/attachment_db_fn.rs
├── rust-core: tauri/commands/attachment_commands.rs
├── 前端: repo/attachment.repo.fn.ts
└── 前端: 更新 hooks/use-attachment.ts

Phase 6: 清理和数据迁移
├── 更新 db/database.ts (只保留日志)
├── 更新 db/index.ts
├── 实现数据迁移工具
└── 移除 dexie-react-hooks 依赖
```

## Components and Interfaces

### Repo Layer 接口设计

#### user.repo.fn.ts

```typescript
// repo/user.repo.fn.ts
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import type { UserInterface, UserCreateInput, UserUpdateInput } from "@/types/user";

// 查询操作
export const getUsers: () => TE.TaskEither<AppError, UserInterface[]>;
export const getUser: (id: string) => TE.TaskEither<AppError, UserInterface | null>;
export const getUserByEmail: (email: string) => TE.TaskEither<AppError, UserInterface | null>;
export const getUserByUsername: (username: string) => TE.TaskEither<AppError, UserInterface | null>;
export const getCurrentUser: () => TE.TaskEither<AppError, UserInterface | null>;

// 写入操作
export const createUser: (input: UserCreateInput) => TE.TaskEither<AppError, UserInterface>;
export const updateUser: (id: string, input: UserUpdateInput) => TE.TaskEither<AppError, UserInterface>;
export const deleteUser: (id: string) => TE.TaskEither<AppError, void>;
```

#### tag.repo.fn.ts

```typescript
// repo/tag.repo.fn.ts
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import type { TagInterface, TagCreateInput, TagUpdateInput } from "@/types/tag";

// 查询操作
export const getTagsByWorkspace: (workspaceId: string) => TE.TaskEither<AppError, TagInterface[]>;
export const getTag: (id: string) => TE.TaskEither<AppError, TagInterface | null>;
export const searchTags: (workspaceId: string, query: string) => TE.TaskEither<AppError, TagInterface[]>;
export const getNodesByTag: (workspaceId: string, tagName: string) => TE.TaskEither<AppError, string[]>;
export const getTagGraphData: (workspaceId: string) => TE.TaskEither<AppError, TagGraphData>;

// 写入操作
export const createTag: (input: TagCreateInput) => TE.TaskEither<AppError, TagInterface>;
export const updateTag: (id: string, input: TagUpdateInput) => TE.TaskEither<AppError, TagInterface>;
export const deleteTag: (id: string) => TE.TaskEither<AppError, void>;

// 同步操作
export const syncTagCache: (workspaceId: string) => TE.TaskEither<AppError, void>;
export const rebuildTagCache: (workspaceId: string) => TE.TaskEither<AppError, void>;
export const recalculateTagCounts: (workspaceId: string) => TE.TaskEither<AppError, void>;
```

#### attachment.repo.fn.ts

```typescript
// repo/attachment.repo.fn.ts
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import type { AttachmentInterface, AttachmentCreateInput, AttachmentUpdateInput } from "@/types/attachment";

// 查询操作
export const getAttachments: () => TE.TaskEither<AppError, AttachmentInterface[]>;
export const getAttachment: (id: string) => TE.TaskEither<AppError, AttachmentInterface | null>;
export const getAttachmentsByProject: (projectId: string) => TE.TaskEither<AppError, AttachmentInterface[]>;
export const getAttachmentsByType: (type: string) => TE.TaskEither<AppError, AttachmentInterface[]>;
export const getImagesByProject: (projectId: string) => TE.TaskEither<AppError, AttachmentInterface[]>;
export const getAudioFilesByProject: (projectId: string) => TE.TaskEither<AppError, AttachmentInterface[]>;

// 写入操作
export const createAttachment: (input: AttachmentCreateInput) => TE.TaskEither<AppError, AttachmentInterface>;
export const updateAttachment: (id: string, input: AttachmentUpdateInput) => TE.TaskEither<AppError, AttachmentInterface>;
export const deleteAttachment: (id: string) => TE.TaskEither<AppError, void>;
export const deleteAttachmentsByProject: (projectId: string) => TE.TaskEither<AppError, void>;
```

#### backup.repo.fn.ts

```typescript
// repo/backup.repo.fn.ts
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import type { BackupInfo } from "@/types/rust-api";

export const createBackup: () => TE.TaskEither<AppError, BackupInfo>;
export const restoreBackup: (backupPath: string) => TE.TaskEither<AppError, void>;
export const listBackups: () => TE.TaskEither<AppError, BackupInfo[]>;
export const deleteBackup: (backupPath: string) => TE.TaskEither<AppError, void>;
export const cleanupOldBackups: (keepCount: number) => TE.TaskEither<AppError, number>;
```

#### clear-data.repo.fn.ts

```typescript
// repo/clear-data.repo.fn.ts
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import type { ClearDataResult } from "@/types/rust-api";

// SQLite 数据清理（通过 Rust 后端）
export const clearSqliteData: () => TE.TaskEither<AppError, ClearDataResult>;
export const clearSqliteDataKeepUsers: () => TE.TaskEither<AppError, ClearDataResult>;

// IndexedDB 日志清理（本地）
export const clearLogs: () => TE.TaskEither<AppError, void>;

// 组合清理
export const clearAllData: () => TE.TaskEither<AppError, ClearDataResult>;
```

### Rust Backend 接口设计

#### User Commands

```rust
// rust-core/src/tauri/commands/user_commands.rs

#[tauri::command]
pub async fn get_users(db: State<'_, DbPool>) -> Result<Vec<UserResponse>, AppError>;

#[tauri::command]
pub async fn get_user(db: State<'_, DbPool>, id: String) -> Result<Option<UserResponse>, AppError>;

#[tauri::command]
pub async fn get_user_by_email(db: State<'_, DbPool>, email: String) -> Result<Option<UserResponse>, AppError>;

#[tauri::command]
pub async fn get_user_by_username(db: State<'_, DbPool>, username: String) -> Result<Option<UserResponse>, AppError>;

#[tauri::command]
pub async fn get_current_user(db: State<'_, DbPool>) -> Result<Option<UserResponse>, AppError>;

#[tauri::command]
pub async fn create_user(db: State<'_, DbPool>, request: CreateUserRequest) -> Result<UserResponse, AppError>;

#[tauri::command]
pub async fn update_user(db: State<'_, DbPool>, id: String, request: UpdateUserRequest) -> Result<UserResponse, AppError>;

#[tauri::command]
pub async fn delete_user(db: State<'_, DbPool>, id: String) -> Result<(), AppError>;
```

#### Tag Commands

```rust
// rust-core/src/tauri/commands/tag_commands.rs

#[tauri::command]
pub async fn get_tags_by_workspace(db: State<'_, DbPool>, workspace_id: String) -> Result<Vec<TagResponse>, AppError>;

#[tauri::command]
pub async fn get_tag(db: State<'_, DbPool>, id: String) -> Result<Option<TagResponse>, AppError>;

#[tauri::command]
pub async fn search_tags(db: State<'_, DbPool>, workspace_id: String, query: String) -> Result<Vec<TagResponse>, AppError>;

#[tauri::command]
pub async fn get_nodes_by_tag(db: State<'_, DbPool>, workspace_id: String, tag_name: String) -> Result<Vec<String>, AppError>;

#[tauri::command]
pub async fn get_tag_graph_data(db: State<'_, DbPool>, workspace_id: String) -> Result<TagGraphData, AppError>;

#[tauri::command]
pub async fn create_tag(db: State<'_, DbPool>, request: CreateTagRequest) -> Result<TagResponse, AppError>;

#[tauri::command]
pub async fn update_tag(db: State<'_, DbPool>, id: String, request: UpdateTagRequest) -> Result<TagResponse, AppError>;

#[tauri::command]
pub async fn delete_tag(db: State<'_, DbPool>, id: String) -> Result<(), AppError>;

#[tauri::command]
pub async fn sync_tag_cache(db: State<'_, DbPool>, workspace_id: String) -> Result<(), AppError>;

#[tauri::command]
pub async fn rebuild_tag_cache(db: State<'_, DbPool>, workspace_id: String) -> Result<(), AppError>;

#[tauri::command]
pub async fn recalculate_tag_counts(db: State<'_, DbPool>, workspace_id: String) -> Result<(), AppError>;
```

#### Attachment Commands

```rust
// rust-core/src/tauri/commands/attachment_commands.rs

#[tauri::command]
pub async fn get_attachments(db: State<'_, DbPool>) -> Result<Vec<AttachmentResponse>, AppError>;

#[tauri::command]
pub async fn get_attachment(db: State<'_, DbPool>, id: String) -> Result<Option<AttachmentResponse>, AppError>;

#[tauri::command]
pub async fn get_attachments_by_project(db: State<'_, DbPool>, project_id: String) -> Result<Vec<AttachmentResponse>, AppError>;

#[tauri::command]
pub async fn get_attachments_by_type(db: State<'_, DbPool>, attachment_type: String) -> Result<Vec<AttachmentResponse>, AppError>;

#[tauri::command]
pub async fn get_images_by_project(db: State<'_, DbPool>, project_id: String) -> Result<Vec<AttachmentResponse>, AppError>;

#[tauri::command]
pub async fn get_audio_files_by_project(db: State<'_, DbPool>, project_id: String) -> Result<Vec<AttachmentResponse>, AppError>;

#[tauri::command]
pub async fn create_attachment(db: State<'_, DbPool>, request: CreateAttachmentRequest) -> Result<AttachmentResponse, AppError>;

#[tauri::command]
pub async fn update_attachment(db: State<'_, DbPool>, id: String, request: UpdateAttachmentRequest) -> Result<AttachmentResponse, AppError>;

#[tauri::command]
pub async fn delete_attachment(db: State<'_, DbPool>, id: String) -> Result<(), AppError>;

#[tauri::command]
pub async fn delete_attachments_by_project(db: State<'_, DbPool>, project_id: String) -> Result<(), AppError>;
```

## Data Models

### User Entity (Rust)

```rust
// rust-core/src/types/user/user_interface.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserEntity {
    pub id: String,
    pub username: String,
    pub email: Option<String>,
    pub plan: String,           // "free" | "pro" | "team"
    pub settings: String,       // JSON string
    pub features: String,       // JSON string
    pub state: String,          // JSON string
    pub token: Option<String>,
    pub created_at: String,     // ISO 8601
    pub updated_at: String,     // ISO 8601
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub username: String,
    pub email: Option<String>,
    pub plan: Option<String>,
    pub settings: Option<String>,
    pub features: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub plan: Option<String>,
    pub settings: Option<String>,
    pub features: Option<String>,
    pub state: Option<String>,
    pub token: Option<String>,
}
```

### Tag Entity (Rust)

```rust
// rust-core/src/types/tag/tag_interface.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagEntity {
    pub id: String,
    pub workspace: String,
    pub name: String,
    pub count: i32,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagRequest {
    pub workspace: String,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagRequest {
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagGraphData {
    pub nodes: Vec<TagGraphNode>,
    pub edges: Vec<TagGraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagGraphNode {
    pub id: String,
    pub name: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagGraphEdge {
    pub source: String,
    pub target: String,
    pub weight: i32,
}
```

### Attachment Entity (Rust)

```rust
// rust-core/src/types/attachment/attachment_interface.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentEntity {
    pub id: String,
    pub project: String,        // workspace_id
    pub name: String,
    pub attachment_type: String, // "image" | "audio" | "video" | "document" | "other"
    pub size: i64,
    pub path: String,
    pub mime_type: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAttachmentRequest {
    pub project: String,
    pub name: String,
    pub attachment_type: String,
    pub size: i64,
    pub path: String,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAttachmentRequest {
    pub name: Option<String>,
    pub path: Option<String>,
}
```

### SQLite Schema Updates

```sql
-- 新增 users 表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    settings TEXT NOT NULL DEFAULT '{}',
    features TEXT NOT NULL DEFAULT '{}',
    state TEXT NOT NULL DEFAULT '{}',
    token TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 新增 tags 表
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    workspace TEXT NOT NULL,
    name TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags(workspace);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_workspace_name ON tags(workspace, name);

-- 新增 attachments 表
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    project TEXT NOT NULL,
    name TEXT NOT NULL,
    attachment_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    mime_type TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_project ON attachments(project);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON attachments(attachment_type);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Repo Layer Delegation

*For any* data operation (Node, Content, Workspace, User, Tag, Attachment), the repo layer should correctly delegate to the API client and return properly decoded results.

**Validates: Requirements 1.1, 1.2, 1.3, 4.6, 5.7, 6.6**

### Property 2: User CRUD Round Trip

*For any* valid user data, creating a user then retrieving it by ID should return an equivalent user object.

**Validates: Requirements 4.2, 4.3**

### Property 3: Tag CRUD Round Trip

*For any* valid tag data, creating a tag then retrieving it by ID should return an equivalent tag object.

**Validates: Requirements 5.2**

### Property 4: Tag Count Consistency

*For any* workspace, after calling `recalculateTagCounts`, each tag's count should equal the number of nodes that have that tag.

**Validates: Requirements 5.4**

### Property 5: Attachment CRUD Round Trip

*For any* valid attachment data, creating an attachment then retrieving it by ID should return an equivalent attachment object.

**Validates: Requirements 6.2**

### Property 6: Backup Round Trip

*For any* database state, creating a backup then restoring it should result in an equivalent database state.

**Validates: Requirements 2.2, 2.3**

### Property 7: Clear Data Isolation

*For any* clear data operation on SQLite, the IndexedDB logs should remain unchanged.

**Validates: Requirements 3.2, 3.3, 3.4, 9.3, 9.4**

### Property 8: Migration Data Preservation

*For any* Dexie data, after successful migration, all data should be retrievable from SQLite with equivalent values.

**Validates: Requirements 10.2, 10.3, 10.4**

### Property 9: Migration Rollback

*For any* migration failure, the original Dexie data should remain intact and accessible.

**Validates: Requirements 10.5**

## Error Handling

### Error Types

```typescript
// lib/error.types.ts 扩展

export type MigrationErrorCode =
  | "MIGRATION_READ_ERROR"      // 读取 Dexie 数据失败
  | "MIGRATION_WRITE_ERROR"     // 写入 SQLite 失败
  | "MIGRATION_ROLLBACK_ERROR"  // 回滚失败
  | "MIGRATION_VERIFY_ERROR";   // 验证失败

export interface MigrationError extends AppError {
  code: MigrationErrorCode;
  phase: "read" | "write" | "verify" | "rollback";
  table?: string;
  recordCount?: number;
}
```

### Error Handling Strategy

1. **Repo Layer**: 所有错误转换为 `AppError`，通过 `TaskEither` 传递
2. **Migration**: 使用事务确保原子性，失败时自动回滚
3. **Hooks**: 使用 `useQuery` 的 error 状态处理错误

## Testing Strategy

### Unit Tests

- **Repo Layer**: Mock API Client，测试类型转换和错误处理
- **Codec Layer**: 测试前后端类型转换的正确性
- **Rust Commands**: 使用内存数据库测试 CRUD 操作

### Property-Based Tests

使用 `fast-check` 进行属性测试：

1. **Round Trip Properties**: 测试 CRUD 操作的数据一致性
2. **Tag Count Consistency**: 测试标签计数的正确性
3. **Migration Preservation**: 测试数据迁移的完整性

### Integration Tests

- **End-to-End Flow**: 测试从 React 组件到 SQLite 的完整数据流
- **Migration Flow**: 测试 Dexie 到 SQLite 的迁移流程

### Test Configuration

- 最少 100 次迭代（属性测试）
- 使用 `vitest` 作为测试框架
- 使用 `fast-check` 作为属性测试库
