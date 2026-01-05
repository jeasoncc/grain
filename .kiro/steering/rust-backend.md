---
inclusion: manual
---

# Rust 后端规范

## 设计哲学

```
数据 = 不可变结构体（struct + #[derive]）
操作 = 纯函数（fn 接收数据，返回 Result）
流动 = 组合子链（map, and_then, map_err）
副作用 = 隔离在边界（Tauri Commands）
```

## 目录结构

```
src-tauri/src/
├── types/           # 类型定义
│   ├── error.rs     # AppError
│   └── node/
│       ├── node_entity.rs     # SeaORM Entity
│       ├── node_interface.rs  # DTO
│       └── node_builder.rs    # Builder
├── fn/              # 纯函数（无副作用）
│   └── node/
│       ├── node_parse_fn.rs
│       ├── node_transform_fn.rs
│       └── node_validate_fn.rs
├── db/              # 数据库操作
│   ├── connection.rs
│   └── node_db_fn.rs
└── commands/        # Tauri Commands（副作用边界）
    └── node_commands.rs
```

## 文件命名

| 类型 | 命名格式 |
|------|---------|
| 纯函数 | `{domain}_{action}_fn.rs` |
| 数据库函数 | `{domain}_db_fn.rs` |
| Entity | `{domain}_entity.rs` |
| DTO | `{domain}_interface.rs` |
| Tauri 命令 | `{domain}_commands.rs` |

## 纯函数规范

```rust
// ✅ 纯函数：接收不可变引用，返回新值
fn transform_node(node: &Node, new_title: &str) -> Node {
    Node { title: new_title.to_string(), ..node.clone() }
}

// ✅ 返回 Result
fn parse_content(content: &str) -> AppResult<ParsedContent> {
    serde_json::from_str(content)
        .map_err(|e| AppError::serialization(e.to_string()))
}

// ❌ 禁止：可变引用
fn bad_transform(node: &mut Node, new_title: &str) {
    node.title = new_title.to_string();
}
```

## 数据库函数

```rust
// db/node_db_fn.rs
pub async fn find_node_by_id(
    db: &DatabaseConnection,
    id: &str,
) -> AppResult<Option<NodeDto>> {
    node_entity::Entity::find_by_id(id)
        .one(db)
        .await
        .map(|opt| opt.map(NodeDto::from))
        .map_err(|e| AppError::database(e.to_string()))
}
```

## Tauri Commands

```rust
#[tauri::command]
pub async fn create_node(
    request: CreateNodeRequest,
    db: State<'_, DatabaseConnection>,
) -> Result<NodeDto, String> {
    // 1. 校验（纯函数）
    node_validate_fn::validate(&request).map_err(|e| e.to_string())?;
    // 2. 保存到数据库
    node_db_fn::create(&db, request.into_active_model())
        .await
        .map_err(|e| e.to_string())
}
```

## 依赖规则

| 层级 | 可依赖 |
|------|--------|
| `types/` | 无 |
| `fn/` | `types/` |
| `db/` | `types/`, `fn/` |
| `commands/` | `types/`, `fn/`, `db/` |

## 错误处理

```rust
#[derive(Debug, Error, Serialize)]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
}

impl AppError {
    pub fn not_found(entity: &str, id: &str) -> Self {
        Self { code: ErrorCode::NotFound, message: format!("{} not found: {}", entity, id) }
    }
    pub fn validation(message: impl Into<String>) -> Self {
        Self { code: ErrorCode::ValidationError, message: message.into() }
    }
    pub fn database(message: impl Into<String>) -> Self {
        Self { code: ErrorCode::DatabaseError, message: message.into() }
    }
}
```

## 测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transform_title() {
        assert_eq!(transform_title("  hello  "), "hello");
    }

    #[tokio::test]
    async fn test_create_node() {
        let db = setup_test_db().await;
        let result = create_node(&db, "测试").await;
        assert!(result.is_ok());
    }
}
```
