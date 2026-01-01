# 设计文档

## 概述

本文档定义 Grain 项目 Rust 后端的技术栈选型和配置方案。基于需求文档中的 13 个需求，选择最适合项目的库和工具。

## 技术选型总览

| 领域 | 选型 | 版本 | 理由 |
|------|------|------|------|
| ORM | SeaORM | 1.1.x | 异步优先，类型安全，活跃维护 |
| 数据库加密 | SQLCipher (via sqlcipher) | 0.1.x | 透明加密，与 SeaORM 兼容 |
| 密钥管理 | keyring | 3.x | 跨平台，支持 Linux Secret Service |
| 异步运行时 | tokio | 1.x | 生态成熟，Tauri 默认使用 |
| 错误处理 | thiserror + anyhow | 2.x / 1.x | 自定义错误 + 错误链 |
| 日志 | tracing + tracing-subscriber | 0.1.x / 0.3.x | 结构化日志，异步友好 |
| 文件系统 | walkdir + notify + zip | - | 遍历 + 监听 + 压缩 |
| 测试 | proptest + fake | 1.x / 3.x | 属性测试 + 假数据 |
| 序列化 | serde + serde_json | 1.x | 行业标准 |
| UUID | uuid | 1.x | 标准实现 |
| 时间 | chrono | 0.4.x | 功能完整 |
| 随机数 | rand | 0.8.x | 安全随机 |

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tauri Commands                           │
│                    (副作用边界，前端入口)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Services                                │
│                    (业务逻辑组合层)                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Repository                               │
│                    (数据访问层，CRUD)                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SeaORM + SQLCipher                          │
│                    (ORM + 加密数据库)                            │
└─────────────────────────────────────────────────────────────────┘
```

### 目录结构

```
src-tauri/src/
├── main.rs                    # 入口点
├── lib.rs                     # Tauri 应用配置
│
├── types/                     # 数据定义层
│   ├── mod.rs
│   ├── error.rs              # AppError 定义
│   └── config.rs             # 配置结构体
│
├── entity/                    # SeaORM 实体定义
│   ├── mod.rs
│   ├── node.rs               # Node 实体
│   ├── content.rs            # Content 实体
│   └── workspace.rs          # Workspace 实体
│
├── migration/                 # 数据库迁移
│   ├── mod.rs
│   ├── m20240101_000001_create_workspace.rs
│   ├── m20240101_000002_create_node.rs
│   └── m20240101_000003_create_content.rs
│
├── repo/                      # 数据访问层
│   ├── mod.rs
│   ├── node_repo.rs
│   ├── content_repo.rs
│   └── workspace_repo.rs
│
├── services/                  # 服务层
│   ├── mod.rs
│   ├── node_service.rs
│   ├── crypto_service.rs     # 密钥管理
│   └── backup_service.rs     # 备份恢复
│
└── commands/                  # Tauri Commands
    ├── mod.rs
    ├── node_commands.rs
    ├── workspace_commands.rs
    └── file_commands.rs
```

## SeaORM 实体定义示例

### Node 实体

```rust
// entity/node.rs
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 节点类型枚举
#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
pub enum NodeType {
    #[sea_orm(string_value = "folder")]
    Folder,
    #[sea_orm(string_value = "file")]
    File,
    #[sea_orm(string_value = "diary")]
    Diary,
    #[sea_orm(string_value = "drawing")]
    Drawing,
    #[sea_orm(string_value = "canvas")]
    Canvas,
}

/// Node 实体定义
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "nodes")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,                    // UUID
    pub workspace_id: String,          // 所属工作区
    pub parent_id: Option<String>,     // 父节点 ID
    pub title: String,                 // 标题
    #[sea_orm(column_type = "Text")]
    pub node_type: NodeType,           // 节点类型
    pub is_collapsed: bool,            // 是否折叠
    pub sort_order: i32,               // 排序顺序
    pub created_at: i64,               // 创建时间戳
    pub updated_at: i64,               // 更新时间戳
}

/// 关系定义
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(belongs_to = "super::workspace::Entity", from = "Column::WorkspaceId", to = "super::workspace::Column::Id")]
    Workspace,
    #[sea_orm(has_one = "super::content::Entity")]
    Content,
    #[sea_orm(belongs_to = "Entity", from = "Column::ParentId", to = "Column::Id")]
    Parent,
}

impl ActiveModelBehavior for ActiveModel {}
```

### Content 实体

```rust
// entity/content.rs
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Content 实体定义（存储编辑器内容）
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "contents")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,                    // UUID
    pub node_id: String,               // 关联的节点 ID
    #[sea_orm(column_type = "Text")]
    pub content: String,               // JSON 格式的编辑器状态
    pub version: i32,                  // 版本号（乐观锁）
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(belongs_to = "super::node::Entity", from = "Column::NodeId", to = "super::node::Column::Id")]
    Node,
}

impl ActiveModelBehavior for ActiveModel {}
```

## 数据库迁移示例

```rust
// migration/m20240101_000002_create_node.rs
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Node::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Node::Id).string().not_null().primary_key())
                    .col(ColumnDef::new(Node::WorkspaceId).string().not_null())
                    .col(ColumnDef::new(Node::ParentId).string())
                    .col(ColumnDef::new(Node::Title).string().not_null())
                    .col(ColumnDef::new(Node::NodeType).string().not_null())
                    .col(ColumnDef::new(Node::IsCollapsed).boolean().not_null().default(false))
                    .col(ColumnDef::new(Node::SortOrder).integer().not_null().default(0))
                    .col(ColumnDef::new(Node::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Node::UpdatedAt).big_integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .from(Node::Table, Node::WorkspaceId)
                            .to(Workspace::Table, Workspace::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // 创建索引
        manager
            .create_index(
                Index::create()
                    .name("idx_node_workspace")
                    .table(Node::Table)
                    .col(Node::WorkspaceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_node_parent")
                    .table(Node::Table)
                    .col(Node::ParentId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Node::Table).to_owned()).await
    }
}

#[derive(Iden)]
enum Node {
    Table,
    Id,
    WorkspaceId,
    ParentId,
    Title,
    NodeType,
    IsCollapsed,
    SortOrder,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Workspace {
    Table,
    Id,
}
```

## 错误类型定义

```rust
// types/error.rs
use serde::Serialize;
use thiserror::Error;

/// 应用错误类型
#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("验证错误: {0}")]
    ValidationError(String),

    #[error("数据库错误: {0}")]
    DatabaseError(String),

    #[error("未找到: {entity} (id: {id})")]
    NotFound { entity: String, id: String },

    #[error("加密错误: {0}")]
    CryptoError(String),

    #[error("IO 错误: {0}")]
    IoError(String),

    #[error("序列化错误: {0}")]
    SerializationError(String),

    #[error("迁移错误: {0}")]
    MigrationError(String),

    #[error("密钥链错误: {0}")]
    KeyringError(String),
}

/// 从 SeaORM 错误转换
impl From<sea_orm::DbErr> for AppError {
    fn from(err: sea_orm::DbErr) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

/// 从 IO 错误转换
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

/// 从 serde_json 错误转换
impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::SerializationError(err.to_string())
    }
}

/// 从 keyring 错误转换
impl From<keyring::Error> for AppError {
    fn from(err: keyring::Error) -> Self {
        AppError::KeyringError(err.to_string())
    }
}

/// 结果类型别名
pub type AppResult<T> = Result<T, AppError>;
```

## 密钥管理服务

```rust
// services/crypto_service.rs
use crate::types::error::{AppError, AppResult};
use keyring::Entry;
use rand::Rng;

const SERVICE_NAME: &str = "grain-editor";
const KEY_NAME: &str = "database-key";

/// 密钥管理服务
/// 
/// 支持平台：
/// - macOS: Keychain
/// - Windows: Credential Manager  
/// - Linux: Secret Service (GNOME Keyring / KWallet)
pub struct CryptoService;

impl CryptoService {
    /// 获取或创建数据库加密密钥
    pub fn get_or_create_key() -> AppResult<String> {
        let entry = Entry::new(SERVICE_NAME, KEY_NAME)
            .map_err(|e| AppError::KeyringError(e.to_string()))?;

        // 尝试获取现有密钥
        match entry.get_password() {
            Ok(key) => {
                tracing::info!("从系统密钥链获取数据库密钥");
                Ok(key)
            }
            Err(keyring::Error::NoEntry) => {
                // 密钥不存在，生成新密钥
                tracing::info!("生成新的数据库加密密钥");
                let new_key = Self::generate_key();
                entry.set_password(&new_key)
                    .map_err(|e| AppError::KeyringError(e.to_string()))?;
                Ok(new_key)
            }
            Err(e) => Err(AppError::KeyringError(e.to_string())),
        }
    }

    /// 生成 256 位随机密钥（Base64 编码）
    fn generate_key() -> String {
        let mut rng = rand::thread_rng();
        let key: [u8; 32] = rng.gen();
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, key)
    }

    /// 删除密钥（用于重置）
    pub fn delete_key() -> AppResult<()> {
        let entry = Entry::new(SERVICE_NAME, KEY_NAME)
            .map_err(|e| AppError::KeyringError(e.to_string()))?;
        entry.delete_credential()
            .map_err(|e| AppError::KeyringError(e.to_string()))
    }
}
```

## 数据库连接配置

```rust
// db/connection.rs
use crate::services::crypto_service::CryptoService;
use crate::types::error::AppResult;
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use std::path::PathBuf;
use std::time::Duration;

/// 数据库连接管理
pub struct DbConnection;

impl DbConnection {
    /// 创建加密数据库连接
    pub async fn connect(db_path: &PathBuf) -> AppResult<DatabaseConnection> {
        // 从系统密钥链获取加密密钥
        let key = CryptoService::get_or_create_key()?;

        // 构建 SQLCipher 连接字符串
        // 格式: sqlite:/path/to/db?key=xxx&cipher_page_size=4096
        let db_url = format!(
            "sqlite:{}?mode=rwc&key={}&cipher_page_size=4096&kdf_iter=256000",
            db_path.display(),
            urlencoding::encode(&key)
        );

        // 配置连接选项
        let mut opt = ConnectOptions::new(db_url);
        opt.max_connections(5)
            .min_connections(1)
            .connect_timeout(Duration::from_secs(10))
            .acquire_timeout(Duration::from_secs(10))
            .idle_timeout(Duration::from_secs(300))
            .sqlx_logging(cfg!(debug_assertions)); // 仅开发环境记录 SQL

        tracing::info!("连接加密数据库: {:?}", db_path);
        let db = Database::connect(opt).await?;

        Ok(db)
    }

    /// 获取数据库文件路径
    pub fn get_db_path(app_data_dir: &PathBuf) -> PathBuf {
        app_data_dir.join("grain.db")
    }
}
```

## Repository 示例

```rust
// repo/node_repo.rs
use crate::entity::node::{self, Entity as Node};
use crate::types::error::{AppError, AppResult};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, 
    QueryFilter, QueryOrder, Set,
};

/// Node 数据访问层
pub struct NodeRepo;

impl NodeRepo {
    /// 根据 ID 查询节点
    pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> AppResult<Option<node::Model>> {
        let node = Node::find_by_id(id).one(db).await?;
        Ok(node)
    }

    /// 查询工作区下的所有节点
    pub async fn find_by_workspace(
        db: &DatabaseConnection,
        workspace_id: &str,
    ) -> AppResult<Vec<node::Model>> {
        let nodes = Node::find()
            .filter(node::Column::WorkspaceId.eq(workspace_id))
            .order_by_asc(node::Column::SortOrder)
            .all(db)
            .await?;
        Ok(nodes)
    }

    /// 查询子节点
    pub async fn find_children(
        db: &DatabaseConnection,
        parent_id: &str,
    ) -> AppResult<Vec<node::Model>> {
        let nodes = Node::find()
            .filter(node::Column::ParentId.eq(parent_id))
            .order_by_asc(node::Column::SortOrder)
            .all(db)
            .await?;
        Ok(nodes)
    }

    /// 创建节点
    pub async fn create(
        db: &DatabaseConnection,
        model: node::ActiveModel,
    ) -> AppResult<node::Model> {
        let node = model.insert(db).await?;
        tracing::info!("创建节点: {} ({})", node.title, node.id);
        Ok(node)
    }

    /// 更新节点
    pub async fn update(
        db: &DatabaseConnection,
        model: node::ActiveModel,
    ) -> AppResult<node::Model> {
        let node = model.update(db).await?;
        tracing::info!("更新节点: {} ({})", node.title, node.id);
        Ok(node)
    }

    /// 删除节点（级联删除子节点）
    pub async fn delete(db: &DatabaseConnection, id: &str) -> AppResult<()> {
        let result = Node::delete_by_id(id).exec(db).await?;
        if result.rows_affected == 0 {
            return Err(AppError::NotFound {
                entity: "Node".to_string(),
                id: id.to_string(),
            });
        }
        tracing::info!("删除节点: {}", id);
        Ok(())
    }
}
```

## Tauri Command 示例

```rust
// commands/node_commands.rs
use crate::entity::node;
use crate::repo::node_repo::NodeRepo;
use crate::types::error::AppError;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 创建节点请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeRequest {
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
}

/// 节点响应
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeResponse {
    pub id: String,
    pub workspace_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub node_type: String,
    pub is_collapsed: bool,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<node::Model> for NodeResponse {
    fn from(model: node::Model) -> Self {
        Self {
            id: model.id,
            workspace_id: model.workspace_id,
            parent_id: model.parent_id,
            title: model.title,
            node_type: model.node_type.to_string(),
            is_collapsed: model.is_collapsed,
            sort_order: model.sort_order,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

/// 获取工作区节点列表
#[tauri::command]
pub async fn get_nodes_by_workspace(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<Vec<NodeResponse>, String> {
    NodeRepo::find_by_workspace(&db, &workspace_id)
        .await
        .map(|nodes| nodes.into_iter().map(NodeResponse::from).collect())
        .map_err(|e| e.to_string())
}

/// 创建节点
#[tauri::command]
pub async fn create_node(
    db: State<'_, DatabaseConnection>,
    request: CreateNodeRequest,
) -> Result<NodeResponse, String> {
    use sea_orm::Set;
    
    let now = chrono::Utc::now().timestamp_millis();
    let id = uuid::Uuid::new_v4().to_string();

    let model = node::ActiveModel {
        id: Set(id),
        workspace_id: Set(request.workspace_id),
        parent_id: Set(request.parent_id),
        title: Set(request.title),
        node_type: Set(request.node_type.parse().unwrap_or(node::NodeType::File)),
        is_collapsed: Set(false),
        sort_order: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    };

    NodeRepo::create(&db, model)
        .await
        .map(NodeResponse::from)
        .map_err(|e| e.to_string())
}

/// 删除节点
#[tauri::command]
pub async fn delete_node(
    db: State<'_, DatabaseConnection>,
    id: String,
) -> Result<(), String> {
    NodeRepo::delete(&db, &id)
        .await
        .map_err(|e| e.to_string())
}
```

## Cargo.toml 依赖配置

```toml
# Cargo.toml

[package]
name = "grain-desktop"
version = "0.1.0"
edition = "2021"

[dependencies]
# ============================================
# Tauri 框架
# ============================================
tauri = { version = "2", features = ["devtools"] }
tauri-plugin-dialog = "2"           # 文件对话框
tauri-plugin-fs = "2"               # 文件系统访问
tauri-plugin-shell = "2"            # Shell 命令执行

# ============================================
# ORM 和数据库
# ============================================
sea-orm = { version = "1.1", features = [
    "sqlx-sqlite",                  # SQLite 驱动
    "runtime-tokio-rustls",         # Tokio 异步运行时
    "macros",                       # 派生宏支持
    "with-chrono",                  # chrono 时间类型支持
    "with-uuid",                    # UUID 类型支持
] }
sea-orm-migration = "1.1"           # 数据库迁移工具

# SQLCipher 加密支持（需要系统安装 SQLCipher）
# 注意：需要在系统上安装 sqlcipher 开发库
# Arch Linux: pacman -S sqlcipher
# macOS: brew install sqlcipher
# Ubuntu: apt install libsqlcipher-dev
sqlx = { version = "0.8", features = [
    "sqlite",
    "runtime-tokio",
] }

# ============================================
# 异步运行时
# ============================================
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"                 # 异步 trait 支持

# ============================================
# 序列化
# ============================================
serde = { version = "1", features = ["derive"] }
serde_json = "1"                    # JSON 序列化

# ============================================
# 错误处理
# ============================================
thiserror = "2"                     # 自定义错误类型派生
anyhow = "1"                        # 错误链和上下文

# ============================================
# 日志和追踪
# ============================================
tracing = "0.1"                     # 结构化日志
tracing-subscriber = { version = "0.3", features = [
    "env-filter",                   # 环境变量过滤
    "json",                         # JSON 格式输出
] }

# ============================================
# 密钥管理
# ============================================
keyring = { version = "3", features = [
    "linux-native",                 # Linux Secret Service 支持
] }

# ============================================
# 工具库
# ============================================
uuid = { version = "1", features = ["v4", "serde"] }  # UUID 生成
chrono = { version = "0.4", features = ["serde"] }    # 时间处理
rand = "0.8"                        # 随机数生成
base64 = "0.22"                     # Base64 编解码
urlencoding = "2"                   # URL 编码

# ============================================
# 文件系统
# ============================================
walkdir = "2"                       # 递归目录遍历
notify = "7"                        # 文件系统变更监听
zip = "2"                           # ZIP 压缩/解压
tempfile = "3"                      # 临时文件

[dev-dependencies]
# ============================================
# 测试框架
# ============================================
proptest = "1"                      # 属性测试
fake = { version = "3", features = ["derive"] }  # 假数据生成
tokio-test = "0.4"                  # 异步测试工具

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

## 前端调用示例

```typescript
// 前端 TypeScript 调用示例
// apps/desktop/src/db/node.db.fn.ts

import { invoke } from "@tauri-apps/api/core";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import type { Node } from "@/types/node";
import { AppError, createDatabaseError } from "@/lib/error.types";

interface CreateNodeRequest {
  workspaceId: string;
  parentId?: string;
  title: string;
  nodeType: string;
}

interface NodeResponse {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  nodeType: string;
  isCollapsed: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 获取工作区节点列表
 */
export const getNodesByWorkspace = (
  workspaceId: string
): TE.TaskEither<AppError, Node[]> =>
  TE.tryCatch(
    () => invoke<NodeResponse[]>("get_nodes_by_workspace", { workspaceId }),
    (error) => createDatabaseError(`获取节点失败: ${error}`)
  );

/**
 * 创建节点
 */
export const createNode = (
  request: CreateNodeRequest
): TE.TaskEither<AppError, Node> =>
  TE.tryCatch(
    () => invoke<NodeResponse>("create_node", { request }),
    (error) => createDatabaseError(`创建节点失败: ${error}`)
  );

/**
 * 删除节点
 */
export const deleteNode = (id: string): TE.TaskEither<AppError, void> =>
  TE.tryCatch(
    () => invoke<void>("delete_node", { id }),
    (error) => createDatabaseError(`删除节点失败: ${error}`)
  );
```

## 测试示例

```rust
// tests/node_repo_test.rs
use proptest::prelude::*;
use fake::{Fake, Faker};
use sea_orm::{Database, DatabaseConnection};

/// 属性测试：创建后查询应返回相同数据
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]
    
    #[test]
    fn test_create_and_find_node(
        title in "[a-zA-Z0-9 ]{1,100}",
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // 使用内存数据库
            let db = Database::connect("sqlite::memory:").await.unwrap();
            
            // 运行迁移
            // Migrator::up(&db, None).await.unwrap();
            
            // 创建节点
            let workspace_id = uuid::Uuid::new_v4().to_string();
            let node = create_test_node(&db, &workspace_id, &title).await;
            
            // 查询节点
            let found = NodeRepo::find_by_id(&db, &node.id).await.unwrap();
            
            // 验证
            prop_assert!(found.is_some());
            prop_assert_eq!(found.unwrap().title, title);
        });
    }
}

/// 测试：删除不存在的节点应返回 NotFound 错误
#[tokio::test]
async fn test_delete_nonexistent_node() {
    let db = Database::connect("sqlite::memory:").await.unwrap();
    
    let result = NodeRepo::delete(&db, "nonexistent-id").await;
    
    assert!(matches!(result, Err(AppError::NotFound { .. })));
}
```

## Linux Secret Service 配置

在 Arch Linux 上使用 GNOME Keyring：

```bash
# 安装 GNOME Keyring
pacman -S gnome-keyring libsecret

# 确保 D-Bus 会话正在运行
# 通常在 GNOME/KDE 桌面环境中自动启动

# 如果使用 i3/Sway 等窗口管理器，需要手动启动
eval $(gnome-keyring-daemon --start --components=secrets)
export SSH_AUTH_SOCK
```

## 下一步

1. 创建 `tasks.md` 定义实现任务
2. 按任务顺序实现各模块
3. 编写单元测试和集成测试
4. 与前端 TypeScript 代码集成
