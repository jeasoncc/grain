# Design Document: SQLite Migration

## Overview

本设计文档描述将 Grain 应用从 IndexedDB (Dexie) 迁移到 Rust 后端 SQLite (SQLCipher) 的技术方案。迁移后，所有数据将加密存储在本地 SQLite 数据库中，前端通过 Tauri Commands 与后端交互。

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              迁移后的数据流架构                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   React 前端    │
                                    └────────┬────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         API 适配层 (TypeScript)      │
                          │   api/node.api.ts, api/content.api.ts │
                          └──────────────────┬──────────────────┘
                                             │ invoke()
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         Tauri Commands (Rust)       │
                          │        commands/node_commands.rs     │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         Services (Rust)             │
                          │     services/node_service.rs        │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         Repositories (Rust)         │
                          │       db/node_repo.rs               │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │      SQLite + SQLCipher (加密)       │
                          │         grain.db (加密文件)          │
                          └─────────────────────────────────────┘
```

### 目录结构

```
apps/desktop/src-tauri/src/
├── main.rs                    # 入口点
├── lib.rs                     # Tauri 应用配置
│
├── types/                     # 数据定义层
│   ├── mod.rs
│   ├── node.rs               # Node 结构体
│   ├── content.rs            # Content 结构体
│   ├── workspace.rs          # Workspace 结构体
│   ├── user.rs               # User 结构体
│   ├── tag.rs                # Tag 结构体
│   ├── attachment.rs         # Attachment 结构体
│   └── error.rs              # AppError 定义
│
├── db/                        # 持久化层
│   ├── mod.rs
│   ├── connection.rs         # 数据库连接 (SQLCipher)
│   ├── migrations/           # SQL 迁移脚本
│   │   ├── mod.rs
│   │   └── v1_initial.sql
│   ├── node_repo.rs          # Node 仓库
│   ├── content_repo.rs       # Content 仓库
│   ├── workspace_repo.rs     # Workspace 仓库
│   ├── user_repo.rs          # User 仓库
│   ├── tag_repo.rs           # Tag 仓库
│   └── attachment_repo.rs    # Attachment 仓库
│
├── services/                  # 服务层
│   ├── mod.rs
│   ├── node_service.rs
│   ├── content_service.rs
│   ├── workspace_service.rs
│   ├── user_service.rs
│   ├── tag_service.rs
│   ├── attachment_service.rs
│   ├── migration_service.rs  # 数据迁移服务
│   ├── backup_service.rs     # 备份服务
│   └── crypto_service.rs     # 密钥管理服务
│
└── commands/                  # Tauri Commands
    ├── mod.rs
    ├── node_commands.rs
    ├── content_commands.rs
    ├── workspace_commands.rs
    ├── user_commands.rs
    ├── tag_commands.rs
    ├── attachment_commands.rs
    ├── migration_commands.rs
    └── backup_commands.rs

apps/desktop/src/
├── api/                       # 前端 API 适配层
│   ├── index.ts
│   ├── node.api.ts
│   ├── content.api.ts
│   ├── workspace.api.ts
│   ├── user.api.ts
│   ├── tag.api.ts
│   ├── attachment.api.ts
│   ├── migration.api.ts
│   └── backup.api.ts
```

## Components and Interfaces

### Rust 类型定义

#### Node 结构体

```rust
// types/node.rs
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    File,
    Folder,
    Diary,
    Drawing,
    Code,
    Diagram,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub id: String,
    pub workspace: String,
    pub parent: Option<String>,
    #[serde(rename = "type")]
    pub node_type: String,  // 存储为字符串，序列化时转换
    pub title: String,
    pub order: i32,
    pub collapsed: bool,
    pub create_date: String,  // ISO 8601
    pub last_edit: String,    // ISO 8601
    pub tags: Option<String>, // JSON 数组字符串
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeCreateInput {
    pub workspace: String,
    pub parent: Option<String>,
    #[serde(rename = "type")]
    pub node_type: Option<String>,
    pub title: String,
    pub order: Option<i32>,
    pub collapsed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeUpdateInput {
    pub parent: Option<String>,
    #[serde(rename = "type")]
    pub node_type: Option<String>,
    pub title: Option<String>,
    pub order: Option<i32>,
    pub collapsed: Option<bool>,
    pub tags: Option<Vec<String>>,
}
```

#### Content 结构体

```rust
// types/content.rs
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ContentType {
    Lexical,
    Excalidraw,
    Text,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Content {
    pub id: String,
    pub node_id: String,
    pub content: String,
    pub content_type: String,
    pub last_edit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentCreateInput {
    pub node_id: String,
    pub content: Option<String>,
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentUpdateInput {
    pub content: Option<String>,
    pub content_type: Option<String>,
}
```

#### AppError 定义

```rust
// types/error.rs
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("验证错误: {0}")]
    ValidationError(String),

    #[error("数据库错误: {0}")]
    DatabaseError(String),

    #[error("未找到: {0}")]
    NotFound(String),

    #[error("加密错误: {0}")]
    CryptoError(String),

    #[error("IO 错误: {0}")]
    IoError(String),

    #[error("序列化错误: {0}")]
    SerializationError(String),

    #[error("迁移错误: {0}")]
    MigrationError(String),
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::SerializationError(err.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
```

### 数据库连接

```rust
// db/connection.rs
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;
use crate::types::error::{AppError, AppResult};

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// 初始化加密数据库
    pub async fn new(db_path: &PathBuf, encryption_key: &str) -> AppResult<Self> {
        let options = SqliteConnectOptions::new()
            .filename(db_path)
            .pragma("key", encryption_key)
            .pragma("cipher_page_size", "4096")
            .pragma("kdf_iter", "256000")
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let db = Self { pool };
        db.run_migrations().await?;
        Ok(db)
    }

    /// 执行数据库迁移
    async fn run_migrations(&self) -> AppResult<()> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| AppError::MigrationError(e.to_string()))
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
```

### Repository 示例

```rust
// db/node_repo.rs
use sqlx::SqlitePool;
use crate::types::{
    error::{AppError, AppResult},
    node::{Node, NodeCreateInput, NodeUpdateInput},
};

pub struct NodeRepository {
    pool: SqlitePool,
}

impl NodeRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// 创建节点
    pub async fn create(&self, input: NodeCreateInput) -> AppResult<Node> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let node_type = input.node_type.unwrap_or_else(|| "file".to_string());
        let order = input.order.unwrap_or(0);
        let collapsed = input.collapsed.unwrap_or(false);

        sqlx::query!(
            r#"
            INSERT INTO nodes (id, workspace, parent, node_type, title, "order", collapsed, create_date, last_edit, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            id,
            input.workspace,
            input.parent,
            node_type,
            input.title,
            order,
            collapsed,
            now,
            now,
            "[]"
        )
        .execute(&self.pool)
        .await?;

        self.get_by_id(&id).await?.ok_or_else(|| AppError::NotFound("Node not found after creation".into()))
    }

    /// 根据 ID 获取节点
    pub async fn get_by_id(&self, id: &str) -> AppResult<Option<Node>> {
        sqlx::query_as!(
            Node,
            r#"SELECT * FROM nodes WHERE id = ?"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(Into::into)
    }

    /// 获取工作区下所有节点
    pub async fn get_by_workspace(&self, workspace_id: &str) -> AppResult<Vec<Node>> {
        sqlx::query_as!(
            Node,
            r#"SELECT * FROM nodes WHERE workspace = ? ORDER BY "order""#,
            workspace_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(Into::into)
    }

    /// 更新节点
    pub async fn update(&self, id: &str, input: NodeUpdateInput) -> AppResult<Node> {
        let now = chrono::Utc::now().to_rfc3339();
        let tags_json = input.tags.map(|t| serde_json::to_string(&t).unwrap_or_default());

        // 动态构建更新语句
        let mut updates = vec!["last_edit = ?".to_string()];
        let mut values: Vec<String> = vec![now.clone()];

        if let Some(ref parent) = input.parent {
            updates.push("parent = ?".to_string());
            values.push(parent.clone());
        }
        if let Some(ref title) = input.title {
            updates.push("title = ?".to_string());
            values.push(title.clone());
        }
        if let Some(order) = input.order {
            updates.push("\"order\" = ?".to_string());
            values.push(order.to_string());
        }
        if let Some(collapsed) = input.collapsed {
            updates.push("collapsed = ?".to_string());
            values.push(collapsed.to_string());
        }
        if let Some(ref tags) = tags_json {
            updates.push("tags = ?".to_string());
            values.push(tags.clone());
        }

        let query = format!(
            "UPDATE nodes SET {} WHERE id = ?",
            updates.join(", ")
        );

        sqlx::query(&query)
            .execute(&self.pool)
            .await?;

        self.get_by_id(id).await?.ok_or_else(|| AppError::NotFound("Node not found".into()))
    }

    /// 删除节点及其所有子节点
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        // 递归删除所有子节点
        let children = sqlx::query_as!(
            Node,
            "SELECT * FROM nodes WHERE parent = ?",
            id
        )
        .fetch_all(&self.pool)
        .await?;

        for child in children {
            Box::pin(self.delete(&child.id)).await?;
        }

        // 删除关联的内容
        sqlx::query!("DELETE FROM contents WHERE node_id = ?", id)
            .execute(&self.pool)
            .await?;

        // 删除节点本身
        sqlx::query!("DELETE FROM nodes WHERE id = ?", id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
```

### Tauri Commands

```rust
// commands/node_commands.rs
use tauri::State;
use crate::services::NodeService;
use crate::types::node::{Node, NodeCreateInput, NodeUpdateInput};

#[tauri::command]
pub async fn create_node(
    input: NodeCreateInput,
    service: State<'_, NodeService>,
) -> Result<Node, String> {
    service.create(input).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_node(
    id: String,
    service: State<'_, NodeService>,
) -> Result<Option<Node>, String> {
    service.get_by_id(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_nodes_by_workspace(
    workspace_id: String,
    service: State<'_, NodeService>,
) -> Result<Vec<Node>, String> {
    service.get_by_workspace(&workspace_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_node(
    id: String,
    input: NodeUpdateInput,
    service: State<'_, NodeService>,
) -> Result<Node, String> {
    service.update(&id, input).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_node(
    id: String,
    service: State<'_, NodeService>,
) -> Result<(), String> {
    service.delete(&id).await.map_err(|e| e.to_string())
}
```

### 前端 API 适配层

```typescript
// api/node.api.ts
import { invoke } from "@tauri-apps/api/core";
import type { NodeInterface, NodeCreateInput, NodeUpdateInput } from "@/types/node";
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";

/**
 * 将 Tauri 错误转换为 AppError
 */
const toAppError = (error: unknown): AppError => ({
  type: "DATABASE_ERROR",
  message: String(error),
});

/**
 * 创建节点
 */
export const createNode = (
  input: NodeCreateInput
): TE.TaskEither<AppError, NodeInterface> =>
  TE.tryCatch(
    () => invoke<NodeInterface>("create_node", { input }),
    toAppError
  );

/**
 * 获取节点
 */
export const getNode = (
  id: string
): TE.TaskEither<AppError, NodeInterface | null> =>
  TE.tryCatch(
    () => invoke<NodeInterface | null>("get_node", { id }),
    toAppError
  );

/**
 * 获取工作区下所有节点
 */
export const getNodesByWorkspace = (
  workspaceId: string
): TE.TaskEither<AppError, NodeInterface[]> =>
  TE.tryCatch(
    () => invoke<NodeInterface[]>("get_nodes_by_workspace", { workspaceId }),
    toAppError
  );

/**
 * 更新节点
 */
export const updateNode = (
  id: string,
  input: NodeUpdateInput
): TE.TaskEither<AppError, NodeInterface> =>
  TE.tryCatch(
    () => invoke<NodeInterface>("update_node", { id, input }),
    toAppError
  );

/**
 * 删除节点
 */
export const deleteNode = (id: string): TE.TaskEither<AppError, void> =>
  TE.tryCatch(
    () => invoke<void>("delete_node", { id }),
    toAppError
  );
```

## Data Models

### 数据库 Schema

```sql
-- migrations/v1_initial.sql

-- 节点表
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY NOT NULL,
    workspace TEXT NOT NULL,
    parent TEXT,
    node_type TEXT NOT NULL DEFAULT 'file',
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    collapsed INTEGER NOT NULL DEFAULT 0,
    create_date TEXT NOT NULL,
    last_edit TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    FOREIGN KEY (workspace) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (parent) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX idx_nodes_workspace ON nodes(workspace);
CREATE INDEX idx_nodes_parent ON nodes(parent);
CREATE INDEX idx_nodes_type ON nodes(node_type);

-- 内容表
CREATE TABLE IF NOT EXISTS contents (
    id TEXT PRIMARY KEY NOT NULL,
    node_id TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    content_type TEXT NOT NULL DEFAULT 'lexical',
    last_edit TEXT NOT NULL,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX idx_contents_node_id ON contents(node_id);

-- 工作区表
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    publisher TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'zh',
    last_open TEXT NOT NULL,
    create_date TEXT NOT NULL,
    members TEXT DEFAULT '[]',
    owner TEXT
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    avatar TEXT,
    email TEXT,
    last_login TEXT NOT NULL,
    create_date TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    plan_start_date TEXT,
    plan_expires_at TEXT,
    trial_expires_at TEXT,
    token TEXT,
    token_status TEXT DEFAULT 'unchecked',
    last_token_check TEXT,
    server_message TEXT,
    features TEXT DEFAULT '{}',
    state TEXT DEFAULT '{}',
    settings TEXT DEFAULT '{}'
);

-- 标签表（聚合缓存）
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    workspace TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    last_used TEXT NOT NULL,
    create_date TEXT NOT NULL,
    FOREIGN KEY (workspace) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_tags_workspace ON tags(workspace);
CREATE INDEX idx_tags_name ON tags(name);

-- 附件表
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY NOT NULL,
    project TEXT,
    attachment_type TEXT NOT NULL DEFAULT 'file',
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    size INTEGER,
    mime_type TEXT,
    FOREIGN KEY (project) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_attachments_project ON attachments(project);

-- 数据库版本表
CREATE TABLE IF NOT EXISTS db_versions (
    id TEXT PRIMARY KEY NOT NULL,
    version TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    migration_notes TEXT
);

-- 迁移状态表
CREATE TABLE IF NOT EXISTS migration_status (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    error_message TEXT,
    items_migrated INTEGER DEFAULT 0
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Struct Serialization Round-Trip

*For any* valid Rust struct (Node, Content, Workspace, User, Tag, Attachment), serializing to JSON and deserializing back SHALL produce an equivalent struct.

**Validates: Requirements 2.7**

### Property 2: Node Create-Read Consistency

*For any* valid NodeCreateInput, creating a node and then reading it by ID SHALL return a node with matching fields (workspace, parent, title, type).

**Validates: Requirements 3.1, 3.2**

### Property 3: Node Not Found Returns None

*For any* randomly generated UUID that was never used to create a node, get_node SHALL return None.

**Validates: Requirements 3.3**

### Property 4: Nodes Ordered by Order Field

*For any* workspace with multiple nodes, get_nodes_by_workspace SHALL return nodes sorted by the order field in ascending order.

**Validates: Requirements 3.4**

### Property 5: Node Update Preserves ID and Updates Timestamp

*For any* existing node and valid update input, updating the node SHALL preserve the ID and update the last_edit timestamp to a value greater than or equal to the original.

**Validates: Requirements 3.5**

### Property 6: Node Delete Cascades to Children

*For any* node with child nodes, deleting the parent SHALL also delete all descendants (no orphaned nodes remain).

**Validates: Requirements 3.6**

### Property 7: Content Linked to Node

*For any* content created with a node_id, get_content_by_node SHALL return that content.

**Validates: Requirements 4.1, 4.2**

### Property 8: Content Deleted with Node

*For any* node with associated content, deleting the node SHALL also delete the content (no orphaned content remains).

**Validates: Requirements 4.4**

### Property 9: Tag Count Accuracy

*For any* workspace, the count field in each tag SHALL equal the number of nodes in that workspace that contain that tag in their tags array.

**Validates: Requirements 6.1, 6.2**

### Property 10: Migration Data Equivalence

*For any* data migrated from IndexedDB to SQLite, the data in SQLite SHALL be semantically equivalent to the original data (same IDs, same relationships, same content).

**Validates: Requirements 9.7**

### Property 11: Backup-Restore Round-Trip

*For any* database state, creating a backup and then restoring from that backup SHALL result in a database state equivalent to the original.

**Validates: Requirements 12.1, 12.2**

## Error Handling

### 错误类型层级

```
AppError
├── ValidationError    # 输入校验失败
├── DatabaseError      # 数据库操作失败
├── NotFound           # 资源不存在
├── CryptoError        # 加密/解密失败
├── IoError            # 文件系统操作失败
├── SerializationError # JSON 序列化/反序列化失败
└── MigrationError     # 数据迁移失败
```

### 错误处理策略

| 场景 | 处理方式 |
|------|----------|
| 数据库连接失败 | 显示错误对话框，提示用户检查权限 |
| 加密密钥获取失败 | 尝试生成新密钥，失败则显示错误 |
| 迁移失败 | 回滚所有更改，保留原 IndexedDB 数据 |
| CRUD 操作失败 | 返回结构化错误，前端显示 toast |

## Testing Strategy

### 单元测试

- 每个 Repository 方法的基本功能测试
- 错误处理路径测试
- 边界条件测试（空输入、超长字符串等）

### 属性测试

使用 `proptest` 或 `quickcheck` 进行属性测试：

```rust
#[cfg(test)]
mod tests {
    use proptest::prelude::*;

    proptest! {
        /// Property 1: 序列化往返
        #[test]
        fn test_node_serialization_roundtrip(node in arb_node()) {
            let json = serde_json::to_string(&node).unwrap();
            let deserialized: Node = serde_json::from_str(&json).unwrap();
            prop_assert_eq!(node, deserialized);
        }

        /// Property 2: 创建-读取一致性
        #[test]
        fn test_node_create_read_consistency(input in arb_node_create_input()) {
            // 创建节点
            let created = repo.create(input.clone()).await.unwrap();
            // 读取节点
            let read = repo.get_by_id(&created.id).await.unwrap().unwrap();
            // 验证字段匹配
            prop_assert_eq!(created.workspace, input.workspace);
            prop_assert_eq!(created.title, input.title);
        }
    }
}
```

### 集成测试

- 完整的 CRUD 流程测试
- 迁移工具端到端测试
- 备份/恢复流程测试

### 测试配置

- 属性测试最少运行 100 次迭代
- 使用内存数据库进行快速测试
- 使用临时文件进行文件系统相关测试
