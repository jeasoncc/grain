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
| `interface` | `struct` (DTO) | 数据定义 |
| `Builder` | `XxxBuilder` | 构建复杂对象 |
| `Zod Schema` | `serde` + `validator` | 运行时校验 |
| `fp-ts Either` | `Result<T, E>` | 错误处理 |
| `fp-ts TaskEither` | `async fn -> Result` | 异步错误处理 |
| `pipe()` | `.map().and_then()` | 管道组合 |
| `Option` | `Option<T>` | 可空值 |

## 测试优先原则（TDD）

**Rust 后端必须遵循测试优先开发**：

### 开发流程

```
1. 先写测试 → 2. 运行测试（失败）→ 3. 写实现 → 4. 运行测试（通过）→ 5. 重构
```

### 测试规范

| 类型 | 位置 | 命名 |
|------|------|------|
| 单元测试 | 同文件 `#[cfg(test)]` 模块 | `test_xxx` |
| 集成测试 | `tests/` 目录 | `xxx_test.rs` |
| 属性测试 | 同文件或 `tests/` | 使用 `proptest` 或 `quickcheck` |

### 测试示例

```rust
// fn/node/transform_fn.rs

/// 转换节点标题
pub fn transform_title(title: &str) -> String {
    title.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ✅ 先写测试
    #[test]
    fn test_transform_title_trims_whitespace() {
        assert_eq!(transform_title("  hello  "), "hello");
    }

    #[test]
    fn test_transform_title_empty_string() {
        assert_eq!(transform_title(""), "");
    }

    #[test]
    fn test_transform_title_preserves_inner_spaces() {
        assert_eq!(transform_title("  hello world  "), "hello world");
    }
}
```

### 异步测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_node() {
        // 准备测试数据
        let db = setup_test_db().await;
        
        // 执行
        let result = create_node(&db, "测试节点").await;
        
        // 断言
        assert!(result.is_ok());
        let node = result.unwrap();
        assert_eq!(node.title, "测试节点");
    }
}
```

### 测试覆盖要求

| 文件类型 | 测试要求 |
|---------|---------|
| `*_fn.rs` | **必须** 有单元测试 |
| `*_db_fn.rs` | **必须** 有集成测试 |
| `types/*.rs` | 建议有 Builder 测试 |
| `commands/*.rs` | 可选（通过 E2E 测试覆盖）|

## 文件命名规范

### 纯函数后缀 `_fn`

**与前端 `.fn.ts` 对应，Rust 使用 `_fn.rs` 后缀标识纯函数文件**：

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 纯函数 | `{domain}_{action}_fn.rs` | `node_transform_fn.rs` |
| 数据库函数 | `{domain}_db_fn.rs` | `node_db_fn.rs` |
| 类型定义 | `{domain}_interface.rs` | `node_interface.rs` |
| Entity | `{domain}_entity.rs` | `node_entity.rs` |
| Builder | `{domain}_builder.rs` | `node_builder.rs` |
| Tauri 命令 | `{domain}_commands.rs` | `node_commands.rs` |

### 前后端命名对照

| 前端 (TypeScript) | 后端 (Rust) |
|-------------------|-------------|
| `node.interface.ts` | `node_interface.rs` |
| `node.schema.ts` | `node_interface.rs` (serde) |
| `node.builder.ts` | `node_builder.rs` |
| `node.parse.fn.ts` | `node_parse_fn.rs` |
| `node.transform.fn.ts` | `node_transform_fn.rs` |
| `node.db.fn.ts` | `node_db_fn.rs` |

### 纯函数文件要求

`*_fn.rs` 文件必须满足：

1. **无副作用** - 不直接操作 IO、数据库、文件系统
2. **确定性** - 相同输入总是产生相同输出
3. **不可变** - 不修改输入参数，返回新值
4. **可测试** - 必须有对应的单元测试

```rust
// ✅ node_transform_fn.rs - 纯函数
pub fn transform_node_title(title: &str) -> String {
    title.trim().to_string()
}

// ❌ 不应该在 _fn.rs 中
pub async fn save_node(db: &Database, node: &Node) -> Result<()> {
    // 这是副作用操作，应该放在 _db_fn.rs 或 commands 中
}
```

## 目录结构

```
apps/desktop/src-tauri/src/
├── main.rs                    # 入口点
├── lib.rs                     # Tauri 应用配置
│
├── types/                     # 【类型定义层】
│   ├── mod.rs
│   ├── error.rs              # AppError 定义
│   ├── config.rs             # 配置结构体
│   ├── node/
│   │   ├── mod.rs
│   │   ├── node_entity.rs    # SeaORM Entity
│   │   ├── node_interface.rs # DTO 定义
│   │   └── node_builder.rs   # Builder 模式
│   ├── workspace/
│   └── content/
│
├── fn/                        # 【纯函数层】
│   ├── mod.rs
│   ├── node/
│   │   ├── mod.rs
│   │   ├── node_parse_fn.rs      # 解析函数
│   │   ├── node_transform_fn.rs  # 转换函数
│   │   └── node_validate_fn.rs   # 校验函数
│   ├── crypto/
│   │   ├── mod.rs
│   │   └── encrypt_fn.rs         # 加密函数
│   └── export/
│       ├── mod.rs
│       └── markdown_fn.rs        # Markdown 导出
│
├── db/                        # 【数据库层】
│   ├── mod.rs
│   ├── connection.rs         # 数据库连接
│   ├── node_db_fn.rs         # Node 数据库操作
│   ├── workspace_db_fn.rs    # Workspace 数据库操作
│   └── content_db_fn.rs      # Content 数据库操作
│
└── commands/                  # 【Tauri Commands - 副作用边界】
    ├── mod.rs
    ├── node_commands.rs
    ├── workspace_commands.rs
    └── content_commands.rs
```

## 类型分层原则

```
┌─────────────────────────────────────────────────────────────────┐
│                        类型分层架构                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Entity 层     │     │    DTO 层       │     │   Builder 层    │
│  (数据库实体)    │     │  (数据传输对象)  │     │  (对象构建器)    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ node_entity.rs  │────▶│node_interface.rs│◀────│ node_builder.rs │
│ Model (SeaORM)  │     │ NodeDto         │     │ NodeBuilder     │
│                 │     │ CreateNodeReq   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   数据库存储              API 边界                 复杂对象构建
```

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
│    │  _fn.rs  │  ->  │  _fn.rs  │  ->  │  _fn.rs  │  ->  │  _fn.rs  │             │
│    └──────────┘      └──────────┘      └──────────┘      └──────────┘             │
│                                                                                    │
│    使用 Result 链式调用：.map().and_then().map_err()                               │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────────────────┐
                    │                                        │                        │
                    ▼                                        ▼                        ▼
     ┌─────────────────────────┐          ┌─────────────────────────┐    ┌───────────────────┐
     │     DB Functions        │          │    Crypto Functions     │    │ Export Functions  │
     │   node_db_fn.rs         │          │    encrypt_fn.rs        │    │  markdown_fn.rs   │
     └────────────┬────────────┘          └─────────────────────────┘    └───────────────────┘
                  │
                  ▼
     ┌─────────────────────────┐
     │   SQLite (加密存储)      │
     └─────────────────────────┘
```

## 纯函数规范

### 函数签名原则

```rust
// ✅ 推荐：纯函数，接收不可变引用，返回新值
fn transform_node(node: &Node, new_title: &str) -> Node {
    Node {
        title: new_title.to_string(),
        ..node.clone()
    }
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
// fn/node/node_transform_fn.rs

/// 使用 Result 链式调用实现管道
pub fn process_node(raw_content: &str) -> AppResult<ProcessedNode> {
    parse_content(raw_content)
        .and_then(validate_content)
        .map(transform_to_node)
        .map(enrich_metadata)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_node_valid_content() {
        let content = r#"{"title": "测试", "type": "file"}"#;
        let result = process_node(content);
        assert!(result.is_ok());
    }

    #[test]
    fn test_process_node_invalid_json() {
        let content = "invalid json";
        let result = process_node(content);
        assert!(result.is_err());
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

## 数据库函数规范

数据库操作放在 `*_db_fn.rs` 文件中，虽然有副作用，但保持函数式风格：

```rust
// db/node_db_fn.rs
use sea_orm::{DatabaseConnection, EntityTrait};
use crate::types::{AppResult, NodeDto};
use crate::types::node::node_entity;

/// 根据 ID 查找节点
pub async fn find_node_by_id(
    db: &DatabaseConnection,
    id: &str,
) -> AppResult<Option<NodeDto>> {
    node_entity::Entity::find_by_id(id)
        .one(db)
        .await
        .map(|opt| opt.map(NodeDto::from))
        .map_err(|e| AppError::DatabaseError(e.to_string()))
}

/// 查找工作区下所有节点
pub async fn find_nodes_by_workspace(
    db: &DatabaseConnection,
    workspace_id: &str,
) -> AppResult<Vec<NodeDto>> {
    node_entity::Entity::find()
        .filter(node_entity::Column::WorkspaceId.eq(workspace_id))
        .all(db)
        .await
        .map(|nodes| nodes.into_iter().map(NodeDto::from).collect())
        .map_err(|e| AppError::DatabaseError(e.to_string()))
}

/// 创建节点
pub async fn create_node(
    db: &DatabaseConnection,
    node: node_entity::ActiveModel,
) -> AppResult<NodeDto> {
    node_entity::Entity::insert(node)
        .exec_with_returning(db)
        .await
        .map(NodeDto::from)
        .map_err(|e| AppError::DatabaseError(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;

    #[tokio::test]
    async fn test_find_node_by_id_not_found() {
        let db = setup_test_db().await;
        let result = find_node_by_id(&db, "non-existent").await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_create_and_find_node() {
        let db = setup_test_db().await;
        
        // 创建节点
        let node = create_test_node_model("test-1", "测试节点");
        let created = create_node(&db, node).await.unwrap();
        
        // 查找节点
        let found = find_node_by_id(&db, "test-1").await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().title, "测试节点");
    }
}
```

## Tauri Commands 规范

Commands 是副作用边界，组合纯函数和数据库函数：

```rust
// commands/node_commands.rs
use tauri::State;
use sea_orm::DatabaseConnection;
use crate::db::node_db_fn;
use crate::fn::node::node_validate_fn;
use crate::types::{AppResult, NodeDto, CreateNodeRequest};

/// 获取节点 - Tauri Command
#[tauri::command]
pub async fn get_node(
    id: String,
    db: State<'_, DatabaseConnection>,
) -> Result<Option<NodeDto>, String> {
    node_db_fn::find_node_by_id(&db, &id)
        .await
        .map_err(|e| e.to_string())
}

/// 创建节点 - Tauri Command
#[tauri::command]
pub async fn create_node(
    request: CreateNodeRequest,
    db: State<'_, DatabaseConnection>,
) -> Result<NodeDto, String> {
    // 1. 校验（纯函数）
    node_validate_fn::validate_create_request(&request)
        .map_err(|e| e.to_string())?;
    
    // 2. 转换为 ActiveModel
    let model = request.into_active_model();
    
    // 3. 保存到数据库
    node_db_fn::create_node(&db, model)
        .await
        .map_err(|e| e.to_string())
}
```

## 依赖规则

| 层级 | 可依赖 | 说明 |
|------|--------|------|
| `types/` | 无 | 最底层，纯数据定义 |
| `fn/` | `types/` | 纯函数，无副作用 |
| `db/` | `types/`, `fn/` | 数据库操作 |
| `commands/` | `types/`, `fn/`, `db/` | Tauri 命令，副作用边界 |

## 日志规范

```rust
use tracing::{info, warn, error, debug, instrument};

/// 使用 #[instrument] 自动记录函数调用
#[instrument(skip(db))]
pub async fn create_node(
    db: &DatabaseConnection,
    title: &str,
) -> AppResult<NodeDto> {
    info!("[Node] 创建节点: {}", title);
    
    // ... 业务逻辑
    
    info!("[Node] 节点创建成功: {}", node.id);
    Ok(node)
}
```

## 推荐依赖

```toml
[dependencies]
# Tauri
tauri = { version = "2", features = [] }

# 序列化
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# 数据库
sea-orm = { version = "1", features = ["sqlx-sqlite", "runtime-tokio-native-tls"] }

# 异步运行时
tokio = { version = "1", features = ["full"] }

# 错误处理
thiserror = "2"

# 日志
tracing = "0.1"
tracing-subscriber = "0.3"

# 工具
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }

[dev-dependencies]
# 测试
tokio-test = "0.4"
tempfile = "3"
```

## 与前端的对应关系

| 前端 (TypeScript) | 后端 (Rust) |
|-------------------|-------------|
| `types/node/node.interface.ts` | `types/node/node_interface.rs` |
| `types/node/node.builder.ts` | `types/node/node_builder.rs` |
| `fn/node/node.parse.fn.ts` | `fn/node/node_parse_fn.rs` |
| `fn/node/node.transform.fn.ts` | `fn/node/node_transform_fn.rs` |
| `db/node.db.fn.ts` | `db/node_db_fn.rs` |
| Tauri `invoke()` | `commands/node_commands.rs` |

---

**使用场景**：开发 Rust 后端代码时，参考此规范确保与前端架构一致。

---

## 错误处理统一规范

### 后端 AppError 定义

```rust
// rust-core/src/types/error.rs
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// 错误码枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    // 通用错误
    InternalError,
    ValidationError,
    NotFound,
    AlreadyExists,
    Unauthorized,
    Forbidden,
    
    // 数据库错误
    DatabaseError,
    ConnectionError,
    TransactionError,
    
    // 业务错误
    InvalidNodeType,
    InvalidWorkspace,
    CircularReference,
    
    // 序列化错误
    SerializationError,
    DeserializationError,
}

/// 统一错误类型
#[derive(Debug, Error, Serialize, Deserialize)]
pub struct AppError {
    /// 错误码
    pub code: ErrorCode,
    /// 错误消息
    pub message: String,
    /// 详细信息（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{:?}] {}", self.code, self.message)
    }
}

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details: None,
        }
    }
    
    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }
    
    // 便捷构造函数
    pub fn not_found(entity: &str, id: &str) -> Self {
        Self::new(ErrorCode::NotFound, format!("{} not found: {}", entity, id))
    }
    
    pub fn validation(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::ValidationError, message)
    }
    
    pub fn database(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::DatabaseError, message)
    }
}

/// Result 类型别名
pub type AppResult<T> = Result<T, AppError>;
```

### JSON 序列化格式

后端错误序列化为 JSON 时的格式：

```json
// 成功响应
{
  "success": true,
  "data": { ... }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Node not found: abc-123",
    "details": null
  }
}
```

### 前端 AppError 定义

```typescript
// lib/error.types.ts
import * as E from "fp-ts/Either";

// 错误码枚举（与后端对应）
export type ErrorCode =
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "DATABASE_ERROR"
  | "CONNECTION_ERROR"
  | "TRANSACTION_ERROR"
  | "INVALID_NODE_TYPE"
  | "INVALID_WORKSPACE"
  | "CIRCULAR_REFERENCE"
  | "SERIALIZATION_ERROR"
  | "DESERIALIZATION_ERROR";

// 统一错误类型
export interface AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: string;
}

// 错误构造函数
export const AppError = {
  create: (code: ErrorCode, message: string, details?: string): AppError => ({
    code,
    message,
    details,
  }),
  
  notFound: (entity: string, id: string): AppError => ({
    code: "NOT_FOUND",
    message: `${entity} not found: ${id}`,
  }),
  
  validation: (message: string): AppError => ({
    code: "VALIDATION_ERROR",
    message,
  }),
  
  // 从未知错误转换
  fromUnknown: (error: unknown): AppError => {
    if (isAppError(error)) return error;
    if (error instanceof Error) {
      return { code: "INTERNAL_ERROR", message: error.message };
    }
    return { code: "INTERNAL_ERROR", message: String(error) };
  },
  
  // 从后端响应解析
  fromResponse: (response: unknown): AppError => {
    if (typeof response === "object" && response !== null) {
      const r = response as Record<string, unknown>;
      if (r.error && typeof r.error === "object") {
        const e = r.error as Record<string, unknown>;
        return {
          code: (e.code as ErrorCode) || "INTERNAL_ERROR",
          message: (e.message as string) || "Unknown error",
          details: e.details as string | undefined,
        };
      }
    }
    return { code: "INTERNAL_ERROR", message: "Unknown error" };
  },
};

// 类型守卫
export const isAppError = (error: unknown): error is AppError =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  "message" in error;
```

### 错误码对应表

| 后端 (Rust) | 前端 (TypeScript) | 说明 |
|------------|------------------|------|
| `ErrorCode::InternalError` | `"INTERNAL_ERROR"` | 内部错误 |
| `ErrorCode::ValidationError` | `"VALIDATION_ERROR"` | 校验失败 |
| `ErrorCode::NotFound` | `"NOT_FOUND"` | 资源不存在 |
| `ErrorCode::AlreadyExists` | `"ALREADY_EXISTS"` | 资源已存在 |
| `ErrorCode::Unauthorized` | `"UNAUTHORIZED"` | 未授权 |
| `ErrorCode::Forbidden` | `"FORBIDDEN"` | 禁止访问 |
| `ErrorCode::DatabaseError` | `"DATABASE_ERROR"` | 数据库错误 |
| `ErrorCode::ConnectionError` | `"CONNECTION_ERROR"` | 连接错误 |
| `ErrorCode::TransactionError` | `"TRANSACTION_ERROR"` | 事务错误 |

### Tauri Command 错误处理

```rust
// commands/node_commands.rs
#[tauri::command]
pub async fn get_node(
    id: String,
    db: State<'_, DatabaseConnection>,
) -> Result<Option<NodeResponse>, AppError> {
    // 直接返回 AppError，Tauri 会自动序列化为 JSON
    node_db_fn::find_by_id(&db, &id).await
}

#[tauri::command]
pub async fn create_node(
    request: CreateNodeRequest,
    db: State<'_, DatabaseConnection>,
) -> Result<NodeResponse, AppError> {
    // 校验
    validate_fn::validate_create_request(&request)?;
    
    // 创建
    node_db_fn::create(&db, &request).await
}
```

### 前端错误处理

```typescript
// repo/node.repo.fn.ts
import { invoke } from "@tauri-apps/api/core";
import * as TE from "fp-ts/TaskEither";
import { AppError } from "@/lib/error.types";

export const getNode = (id: string): TE.TaskEither<AppError, Node | null> =>
  TE.tryCatch(
    () => invoke<Node | null>("get_node", { id }),
    (error) => AppError.fromUnknown(error)
  );

// actions/node/get-node.action.ts
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import { getNode } from "@/repo/node.repo.fn";

export const getNodeAction = (id: string) =>
  pipe(
    getNode(id),
    TE.fold(
      (error) => T.of({ success: false as const, error }),
      (node) => T.of({ success: true as const, data: node })
    )
  );

// 在组件中使用
const handleGetNode = async (id: string) => {
  const result = await getNodeAction(id)();
  
  if (result.success) {
    // 处理成功
    console.log("Node:", result.data);
  } else {
    // 处理错误
    switch (result.error.code) {
      case "NOT_FOUND":
        showToast("节点不存在");
        break;
      case "DATABASE_ERROR":
        showToast("数据库错误，请重试");
        break;
      default:
        showToast(result.error.message);
    }
  }
};
```

### Warp 错误处理

```rust
// rust-core/src/macros/rejection.rs
use warp::{reject::Reject, Reply};
use crate::types::AppError;

impl Reject for AppError {}

/// Warp rejection 处理
pub async fn handle_rejection(err: warp::Rejection) -> Result<impl Reply, warp::Rejection> {
    if let Some(app_error) = err.find::<AppError>() {
        let json = warp::reply::json(&serde_json::json!({
            "success": false,
            "error": app_error
        }));
        
        let status = match app_error.code {
            ErrorCode::NotFound => warp::http::StatusCode::NOT_FOUND,
            ErrorCode::ValidationError => warp::http::StatusCode::BAD_REQUEST,
            ErrorCode::Unauthorized => warp::http::StatusCode::UNAUTHORIZED,
            ErrorCode::Forbidden => warp::http::StatusCode::FORBIDDEN,
            _ => warp::http::StatusCode::INTERNAL_SERVER_ERROR,
        };
        
        Ok(warp::reply::with_status(json, status))
    } else {
        Err(err)
    }
}
```
