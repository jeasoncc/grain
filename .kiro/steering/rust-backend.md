---
inclusion: manual
---

# Rust 后端架构规范

本文档定义 Grain 项目 Rust 后端的架构设计，与前端 TypeScript 保持一致的函数式编程理念。

## 设计哲学

```
数据 = 不可变结构体（struct + #[derive]）
操作 = 纯函数（fn 接收数据，返回 Result）
流动 = 组合子链（map, and_then, map_err）
副作用 = 隔离在边界（Tauri Commands）
```

与 TypeScript 端的对应关系：

| TypeScript | Rust | 说明 |
|------------|------|------|
| `interface` | `struct` | 数据定义 |
| `Zod Schema` | `serde` + 自定义校验 | 运行时校验 |
| `fp-ts Either` | `Result<T, E>` | 错误处理 |
| `fp-ts TaskEither` | `async fn -> Result` | 异步错误处理 |
| `pipe()` | `.map().and_then()` | 管道组合 |
| `Option` | `Option<T>` | 可空值 |

## 数据流架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Rust 后端数据流架构                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   前端 (React)   │
                                    └────────┬────────┘
                                             │ invoke()
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         Tauri Commands              │
                          │        (副作用边界层)                │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │           Serde 反序列化            │
                          │          (运行时校验)               │
                          └──────────────────┬──────────────────┘
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                          ❌ 校验失败                   ✅ 校验通过
                               │                           │
                               ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────────────┐
                    │  AppError 返回   │         │    Domain Types         │
                    └─────────────────┘         │   (不可变结构体)         │
                                                └────────────┬────────────┘
                                                             │
                                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           Pure Function Pipeline (纯函数管道)                        │
│                                                                                    │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐             │
│    │  parse   │─────▶│ validate │─────▶│transform │─────▶│  format  │             │
│    │          │  ->  │          │  ->  │          │  ->  │          │             │
│    └──────────┘      └──────────┘      └──────────┘      └──────────┘             │
│                                                                                    │
│    使用 Result 链式调用：.map().and_then().map_err()                               │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────────────────┐
                    │                                        │                        │
                    ▼                                        ▼                        ▼
     ┌─────────────────────────┐          ┌─────────────────────────┐    ┌───────────────────┐
     │     DB Repository       │          │    Crypto Service       │    │  Export Service   │
     │   (SQLite + SQLCipher)  │          │     (加密/解密)          │    │    (导出)         │
     └────────────┬────────────┘          └─────────────────────────┘    └───────────────────┘
                  │
                  ▼
     ┌─────────────────────────┐
     │   SQLite (加密存储)      │
     │   SQLCipher / sqlx      │
     └─────────────────────────┘
```

## 目录结构

```
apps/desktop/src-tauri/src/
├── main.rs                    # 入口点
├── lib.rs                     # Tauri 应用配置
│
├── types/                     # 数据定义层
│   ├── mod.rs
│   ├── node.rs               # Node 结构体
│   ├── workspace.rs          # Workspace 结构体
│   ├── error.rs              # AppError 定义
│   └── config.rs             # 配置结构体
│
├── fn/                        # 纯函数层
│   ├── mod.rs
│   ├── node/
│   │   ├── mod.rs
│   │   ├── parse.rs          # 解析函数
│   │   ├── transform.rs      # 转换函数
│   │   └── validate.rs       # 校验函数
│   ├── crypto/
│   │   ├── mod.rs
│   │   └── encrypt.rs        # 加密函数
│   └── export/
│       ├── mod.rs
│       └── markdown.rs       # Markdown 导出
│
├── db/                        # 持久化层
│   ├── mod.rs
│   ├── connection.rs         # 数据库连接
│   ├── migrations/           # 数据库迁移
│   ├── node_repo.rs          # Node 仓库
│   └── workspace_repo.rs     # Workspace 仓库
│
├── services/                  # 服务层（组合纯函数）
│   ├── mod.rs
│   ├── node_service.rs
│   └── workspace_service.rs
│
└── commands/                  # Tauri Commands（副作用边界）
    ├── mod.rs
    ├── node_commands.rs
    ├── workspace_commands.rs
    └── file_commands.rs
```

## 文件命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 类型定义 | `{entity}.rs` | `node.rs`, `workspace.rs` |
| 纯函数 | `{action}.rs` | `parse.rs`, `transform.rs` |
| 数据库仓库 | `{entity}_repo.rs` | `node_repo.rs` |
| 服务 | `{entity}_service.rs` | `node_service.rs` |
| Tauri 命令 | `{entity}_commands.rs` | `node_commands.rs` |
| 测试 | `{module}_test.rs` 或内联 `#[cfg(test)]` | |

## 类型定义规范

### 不可变结构体

```rust
// types/node.rs
use serde::{Deserialize, Serialize};

/// 节点数据结构
/// 所有字段都是不可变的，更新时创建新实例
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Node {
    pub id: String,
    pub title: String,
    pub content: String,
    pub node_type: NodeType,
    pub parent_id: Option<String>,
    pub workspace_id: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub order: i32,
    pub collapsed: bool,
    pub tags: Vec<String>,
}

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

impl Node {
    /// 创建新节点（Builder 模式的简化版）
    pub fn new(
        title: impl Into<String>,
        node_type: NodeType,
        workspace_id: impl Into<String>,
    ) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title: title.into(),
            content: String::new(),
            node_type,
            parent_id: None,
            workspace_id: workspace_id.into(),
            created_at: now,
            updated_at: now,
            order: 0,
            collapsed: false,
            tags: Vec::new(),
        }
    }

    /// 不可变更新 - 返回新实例
    pub fn with_title(self, title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            updated_at: chrono::Utc::now().timestamp_millis(),
            ..self
        }
    }

    pub fn with_content(self, content: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            updated_at: chrono::Utc::now().timestamp_millis(),
            ..self
        }
    }

    pub fn with_parent(self, parent_id: Option<String>) -> Self {
        Self {
            parent_id,
            updated_at: chrono::Utc::now().timestamp_millis(),
            ..self
        }
    }
}
```

### 错误类型

```rust
// types/error.rs
use serde::Serialize;
use thiserror::Error;

/// 应用错误类型 - 对应 TypeScript 的 AppError
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
}

// 实现从其他错误类型的转换
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

/// Result 类型别名
pub type AppResult<T> = Result<T, AppError>;
```

## 纯函数规范

### 函数签名原则

```rust
// ✅ 推荐：纯函数，接收不可变引用，返回新值
fn transform_node(node: &Node, new_title: &str) -> Node {
    node.clone().with_title(new_title)
}

// ✅ 推荐：返回 Result 处理可能的错误
fn parse_node_content(content: &str) -> AppResult<ParsedContent> {
    serde_json::from_str(content)
        .map_err(|e| AppError::SerializationError(e.to_string()))
}

// ❌ 禁止：可变引用修改输入
fn bad_transform(node: &mut Node, new_title: &str) {
    node.title = new_title.to_string();
}
```

### 管道组合

```rust
// fn/node/transform.rs

/// 使用 Result 链式调用实现管道
pub fn process_node(raw_content: &str) -> AppResult<ProcessedNode> {
    parse_content(raw_content)
        .and_then(validate_content)
        .map(transform_to_node)
        .map(enrich_metadata)
}

/// 解析内容
fn parse_content(raw: &str) -> AppResult<RawContent> {
    serde_json::from_str(raw)
        .map_err(|e| AppError::SerializationError(e.to_string()))
}

/// 校验内容
fn validate_content(content: RawContent) -> AppResult<ValidatedContent> {
    if content.title.is_empty() {
        return Err(AppError::ValidationError("标题不能为空".into()));
    }
    Ok(ValidatedContent::from(content))
}

/// 转换为节点
fn transform_to_node(content: ValidatedContent) -> Node {
    Node::new(content.title, content.node_type, content.workspace_id)
}

/// 丰富元数据
fn enrich_metadata(node: Node) -> ProcessedNode {
    ProcessedNode {
        node,
        word_count: 0,
        // ...
    }
}
```

### Option 处理

```rust
// ✅ 推荐：使用组合子
fn get_parent_title(node: &Node, nodes: &[Node]) -> Option<String> {
    node.parent_id
        .as_ref()
        .and_then(|pid| nodes.iter().find(|n| &n.id == pid))
        .map(|parent| parent.title.clone())
}

// ✅ 推荐：使用 ? 操作符
fn get_parent_title_v2(node: &Node, nodes: &[Node]) -> Option<String> {
    let parent_id = node.parent_id.as_ref()?;
    let parent = nodes.iter().find(|n| &n.id == parent_id)?;
    Some(parent.title.clone())
}

// ❌ 避免：嵌套 if let
fn bad_get_parent_title(node: &Node, nodes: &[Node]) -> Option<String> {
    if let Some(ref parent_id) = node.parent_id {
        if let Some(parent) = nodes.iter().find(|n| &n.id == parent_id) {
            return Some(parent.title.clone());
        }
    }
    None
}
```

## 数据库层规范

### Repository 模式

```rust
// db/node_repo.rs
use sqlx::{Pool, Sqlite};
use crate::types::{AppResult, Node};

/// Node 仓库 - 封装所有数据库操作
pub struct NodeRepository {
    pool: Pool<Sqlite>,
}

impl NodeRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    /// 获取单个节点
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
            r#"SELECT * FROM nodes WHERE workspace_id = ? ORDER BY "order""#,
            workspace_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(Into::into)
    }

    /// 创建节点
    pub async fn create(&self, node: &Node) -> AppResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO nodes (id, title, content, node_type, parent_id, workspace_id, created_at, updated_at, "order", collapsed, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            node.id,
            node.title,
            node.content,
            node.node_type,
            node.parent_id,
            node.workspace_id,
            node.created_at,
            node.updated_at,
            node.order,
            node.collapsed,
            node.tags,
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(Into::into)
    }

    /// 更新节点
    pub async fn update(&self, node: &Node) -> AppResult<()> {
        sqlx::query!(
            r#"
            UPDATE nodes SET
                title = ?,
                content = ?,
                parent_id = ?,
                updated_at = ?,
                "order" = ?,
                collapsed = ?,
                tags = ?
            WHERE id = ?
            "#,
            node.title,
            node.content,
            node.parent_id,
            node.updated_at,
            node.order,
            node.collapsed,
            node.tags,
            node.id,
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(Into::into)
    }

    /// 删除节点
    pub async fn delete(&self, id: &str) -> AppResult<()> {
        sqlx::query!("DELETE FROM nodes WHERE id = ?", id)
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(Into::into)
    }
}
```

## Tauri Commands 规范

### 命令作为副作用边界

```rust
// commands/node_commands.rs
use tauri::State;
use crate::services::NodeService;
use crate::types::{AppResult, Node};

/// 获取节点 - Tauri Command
#[tauri::command]
pub async fn get_node(
    id: String,
    service: State<'_, NodeService>,
) -> Result<Option<Node>, String> {
    service
        .get_node(&id)
        .await
        .map_err(|e| e.to_string())
}

/// 创建节点 - Tauri Command
#[tauri::command]
pub async fn create_node(
    title: String,
    node_type: String,
    workspace_id: String,
    parent_id: Option<String>,
    service: State<'_, NodeService>,
) -> Result<Node, String> {
    service
        .create_node(&title, &node_type, &workspace_id, parent_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// 更新节点内容 - Tauri Command
#[tauri::command]
pub async fn update_node_content(
    id: String,
    content: String,
    service: State<'_, NodeService>,
) -> Result<Node, String> {
    service
        .update_content(&id, &content)
        .await
        .map_err(|e| e.to_string())
}

/// 删除节点 - Tauri Command
#[tauri::command]
pub async fn delete_node(
    id: String,
    service: State<'_, NodeService>,
) -> Result<(), String> {
    service
        .delete_node(&id)
        .await
        .map_err(|e| e.to_string())
}
```

### 注册命令

```rust
// lib.rs
mod commands;
mod db;
mod fn;
mod services;
mod types;

use commands::node_commands::*;
use services::NodeService;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 初始化数据库和服务
            let db_pool = db::init_database(app)?;
            let node_service = NodeService::new(db_pool.clone());
            
            app.manage(node_service);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_node,
            create_node,
            update_node_content,
            delete_node,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 加密存储规范

### SQLCipher 集成

```rust
// db/connection.rs
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;

/// 初始化加密数据库连接
pub async fn init_encrypted_database(
    db_path: &str,
    encryption_key: &str,
) -> AppResult<Pool<Sqlite>> {
    let options = SqliteConnectOptions::from_str(db_path)?
        .pragma("key", encryption_key)  // SQLCipher 加密密钥
        .pragma("cipher_page_size", "4096")
        .pragma("kdf_iter", "256000")
        .pragma("cipher_hmac_algorithm", "HMAC_SHA512")
        .pragma("cipher_kdf_algorithm", "PBKDF2_HMAC_SHA512")
        .create_if_missing(true);

    SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(Into::into)
}
```

### 密钥管理

```rust
// services/crypto_service.rs
use crate::types::AppResult;

/// 加密服务
pub struct CryptoService {
    // 使用系统密钥链存储主密钥
}

impl CryptoService {
    /// 获取或生成数据库加密密钥
    pub fn get_database_key(&self) -> AppResult<String> {
        // 1. 尝试从系统密钥链读取
        // 2. 如果不存在，生成新密钥并存储
        // 3. 返回密钥
        todo!()
    }

    /// 加密敏感数据
    pub fn encrypt(&self, plaintext: &[u8]) -> AppResult<Vec<u8>> {
        todo!()
    }

    /// 解密敏感数据
    pub fn decrypt(&self, ciphertext: &[u8]) -> AppResult<Vec<u8>> {
        todo!()
    }
}
```

## 日志规范

```rust
// 使用 tracing 进行结构化日志
use tracing::{info, warn, error, debug, instrument};

/// 使用 #[instrument] 自动记录函数调用
#[instrument(skip(content))]
pub async fn create_node(
    title: &str,
    content: &str,
    workspace_id: &str,
) -> AppResult<Node> {
    info!("[Node] 创建节点: {}", title);
    
    // ... 业务逻辑
    
    info!("[Node] 节点创建成功: {}", node.id);
    Ok(node)
}

// 错误日志
fn handle_error(err: AppError) {
    error!("[Error] 操作失败: {:?}", err);
}
```

## 测试规范

```rust
// 内联测试模块
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_creation() {
        let node = Node::new("测试标题", NodeType::File, "workspace-1");
        
        assert_eq!(node.title, "测试标题");
        assert_eq!(node.node_type, NodeType::File);
        assert!(!node.id.is_empty());
    }

    #[test]
    fn test_node_immutable_update() {
        let node = Node::new("原标题", NodeType::File, "workspace-1");
        let original_id = node.id.clone();
        
        let updated = node.with_title("新标题");
        
        assert_eq!(updated.id, original_id);  // ID 不变
        assert_eq!(updated.title, "新标题");
    }

    #[tokio::test]
    async fn test_parse_content() {
        let content = r#"{"title": "测试"}"#;
        let result = parse_content(content);
        
        assert!(result.is_ok());
    }
}
```

## 依赖规则

| 层级 | 可依赖 | 说明 |
|------|--------|------|
| `types/` | 无 | 最底层，纯数据定义 |
| `fn/` | `types/` | 纯函数，无副作用 |
| `db/` | `types/` | 数据库操作 |
| `services/` | `types/`, `fn/`, `db/` | 组合业务逻辑 |
| `commands/` | `services/`, `types/` | Tauri 命令，副作用边界 |

## 推荐依赖

```toml
[dependencies]
# Tauri
tauri = { version = "2", features = [] }

# 序列化
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# 数据库
sqlx = { version = "0.7", features = ["runtime-tokio", "sqlite"] }
# 或使用 rusqlite + sqlcipher
rusqlite = { version = "0.31", features = ["bundled-sqlcipher"] }

# 异步运行时
tokio = { version = "1", features = ["full"] }

# 错误处理
thiserror = "1"
anyhow = "1"

# 日志
tracing = "0.1"
tracing-subscriber = "0.3"

# 工具
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }

# 加密
ring = "0.17"  # 或 aes-gcm
```

## 与前端的对应关系

| 前端 (TypeScript) | 后端 (Rust) |
|-------------------|-------------|
| `types/node/node.interface.ts` | `types/node.rs` |
| `fn/node/node.parse.fn.ts` | `fn/node/parse.rs` |
| `db/node.db.fn.ts` | `db/node_repo.rs` |
| `actions/node/create-node.action.ts` | `services/node_service.rs` |
| Tauri `invoke()` | `commands/node_commands.rs` |

---

**使用场景**：开发 Rust 后端代码时，参考此规范确保与前端架构一致。
