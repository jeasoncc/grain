# Rust 后端开发指南

本文档介绍 Grain Desktop 应用的 Rust 后端架构和开发流程。

## 技术栈

| 领域 | 选型 | 说明 |
|------|------|------|
| ORM | SeaORM 1.1 | 异步优先，类型安全 |
| 数据库 | SQLite | 轻量级嵌入式数据库 |
| 异步运行时 | Tokio | Tauri 默认使用 |
| 错误处理 | thiserror | 自定义错误类型 |
| 日志 | tracing | 结构化日志 |
| 密钥管理 | keyring | 跨平台系统密钥链 |

## 目录结构

```
src-tauri/src/
├── main.rs                    # 入口点
├── lib.rs                     # Tauri 应用配置
│
├── types/                     # 类型定义层
│   ├── mod.rs
│   ├── error.rs              # AppError 定义
│   └── config.rs             # 配置结构体
│
├── entity/                    # SeaORM 实体
│   ├── mod.rs
│   ├── workspace.rs          # 工作区实体
│   ├── node.rs               # 节点实体
│   └── content.rs            # 内容实体
│
├── migration/                 # 数据库迁移
│   ├── mod.rs
│   └── m20240101_*.rs        # 迁移脚本
│
├── repo/                      # 数据访问层
│   ├── mod.rs
│   ├── workspace_repo.rs
│   ├── node_repo.rs
│   └── content_repo.rs
│
├── services/                  # 服务层
│   ├── mod.rs
│   ├── crypto_service.rs     # 密钥管理
│   ├── node_service.rs       # 节点业务逻辑
│   └── backup_service.rs     # 备份恢复
│
└── commands/                  # Tauri Commands
    ├── mod.rs
    ├── workspace_commands.rs
    ├── node_commands.rs
    ├── content_commands.rs
    ├── backup_commands.rs
    └── file_commands.rs
```

## 分层架构

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
│                     SeaORM + SQLite                             │
│                    (ORM + 数据库)                                │
└─────────────────────────────────────────────────────────────────┘
```

## 开发流程

### 1. 添加新实体

```rust
// entity/new_entity.rs
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "new_entities")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
```

### 2. 添加迁移

```rust
// migration/m20240102_000001_create_new_entity.rs
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(NewEntity::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(NewEntity::Id).string().not_null().primary_key())
                    .col(ColumnDef::new(NewEntity::Name).string().not_null())
                    .col(ColumnDef::new(NewEntity::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(NewEntity::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(NewEntity::Table).to_owned()).await
    }
}

#[derive(Iden)]
enum NewEntity {
    Table,
    Id,
    Name,
    CreatedAt,
    UpdatedAt,
}
```

### 3. 添加 Repository

```rust
// repo/new_entity_repo.rs
use crate::entity::new_entity::{self, Entity as NewEntity};
use crate::types::error::{AppError, AppResult};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set};

pub struct NewEntityRepo;

impl NewEntityRepo {
    pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> AppResult<Option<new_entity::Model>> {
        let entity = NewEntity::find_by_id(id).one(db).await?;
        Ok(entity)
    }

    pub async fn create(db: &DatabaseConnection, id: String, name: String) -> AppResult<new_entity::Model> {
        let now = chrono::Utc::now().timestamp_millis();
        let model = new_entity::ActiveModel {
            id: Set(id),
            name: Set(name),
            created_at: Set(now),
            updated_at: Set(now),
        };
        let entity = model.insert(db).await?;
        Ok(entity)
    }
}
```

### 4. 添加 Tauri Command

```rust
// commands/new_entity_commands.rs
use crate::repo::NewEntityRepo;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNewEntityRequest {
    pub name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewEntityResponse {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub async fn create_new_entity(
    db: State<'_, DatabaseConnection>,
    request: CreateNewEntityRequest,
) -> Result<NewEntityResponse, String> {
    let id = uuid::Uuid::new_v4().to_string();
    NewEntityRepo::create(&db, id, request.name)
        .await
        .map(|e| NewEntityResponse {
            id: e.id,
            name: e.name,
            created_at: e.created_at,
            updated_at: e.updated_at,
        })
        .map_err(|e| e.to_string())
}
```

### 5. 注册 Command

在 `lib.rs` 中注册新命令：

```rust
.invoke_handler(tauri::generate_handler![
    // ... 其他命令
    commands::create_new_entity,
])
```

## 前端调用

### TypeScript 类型

```typescript
// types/rust-api.ts
export interface CreateNewEntityRequest {
  name: string;
}

export interface NewEntityResponse {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
```

### API 封装

```typescript
// db/rust-api.fn.ts
import { invoke } from "@tauri-apps/api/core";
import * as TE from "fp-ts/TaskEither";

export const createNewEntity = (
  request: CreateNewEntityRequest
): TE.TaskEither<AppError, NewEntityResponse> =>
  TE.tryCatch(
    () => invoke("create_new_entity", { request }),
    (error) => createDatabaseError(`创建失败: ${error}`)
  );
```

## 常用命令

```bash
# 检查编译
cargo check

# 运行测试
cargo test

# 构建开发版
cargo build

# 构建发布版
cargo build --release

# 运行 Tauri 开发服务器
bun run tauri dev
```

## 错误处理

所有错误都通过 `AppError` 枚举统一处理：

```rust
pub enum AppError {
    ValidationError(String),
    DatabaseError(String),
    NotFound { entity: String, id: String },
    CryptoError(String),
    IoError(String),
    SerializationError(String),
    MigrationError(String),
    KeyringError(String),
    BackupError(String),
    InternalError(String),
}
```

## 日志

使用 `tracing` 进行结构化日志：

```rust
use tracing::{info, warn, error};

info!("创建节点: {} ({})", node.title, node.id);
warn!("版本冲突: 期望 {}, 实际 {}", expected, actual);
error!("数据库连接失败: {}", e);
```

日志级别通过环境变量 `RUST_LOG` 控制：

```bash
RUST_LOG=debug cargo run
RUST_LOG=grain=debug,sea_orm=warn cargo run
```

## 数据库位置

- Linux: `~/.local/share/grain/grain.db`
- macOS: `~/Library/Application Support/grain/grain.db`
- Windows: `C:\Users\<User>\AppData\Roaming\grain\grain.db`

## 备份位置

- Linux: `~/.local/share/grain/backups/`
- macOS: `~/Library/Application Support/grain/backups/`
- Windows: `C:\Users\<User>\AppData\Roaming\grain\backups\`
