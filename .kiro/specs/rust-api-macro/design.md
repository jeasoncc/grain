# Design Document: Rust API Macro

## Overview

本设计将 Rust 后端重构为基于 trait 和宏的统一架构。核心思想是：

1. 定义 `ApiEndpoint` trait 作为所有 API 端点的统一抽象
2. 在 `rust-core` 中实现所有端点的业务逻辑
3. 使用声明式宏自动生成 Warp handlers 和 Tauri commands
4. 两端共享同一套代码，消除重复，确保行为一致

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           rust-core crate                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        api/ (端点定义)                               │   │
│  │                                                                     │   │
│  │  pub trait ApiEndpoint {                                            │   │
│  │      type Input: DeserializeOwned + Send;                           │   │
│  │      type Output: Serialize + Send;                                 │   │
│  │      async fn execute(db, input) -> AppResult<Output>;              │   │
│  │  }                                                                  │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ workspace/   │  │   node/      │  │  content/    │              │   │
│  │  │ GetWorkspaces│  │ GetNodes     │  │ GetContent   │              │   │
│  │  │ CreateWs...  │  │ CreateNode   │  │ SaveContent  │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      macros/ (代码生成)                              │   │
│  │                                                                     │   │
│  │  warp_routes! { ... }     tauri_commands! { ... }                   │   │
│  │         │                          │                                │   │
│  └─────────┼──────────────────────────┼────────────────────────────────┘   │
│            │                          │                                     │
└────────────┼──────────────────────────┼─────────────────────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────┐  ┌────────────────────────┐
│     apps/api-rust      │  │  apps/desktop/src-tauri │
│                        │  │                        │
│  fn main() {           │  │  fn main() {           │
│    let routes =        │  │    tauri::Builder      │
│      warp_routes!(...);│  │      .invoke_handler(  │
│    warp::serve(routes);│  │        tauri_commands! │
│  }                     │  │      )                 │
│                        │  │  }                     │
└────────────────────────┘  └────────────────────────┘
```

## Components and Interfaces

### ApiEndpoint Trait

```rust
// rust-core/src/api/mod.rs

use sea_orm::DatabaseConnection;
use serde::{de::DeserializeOwned, Serialize};
use std::future::Future;

use crate::AppResult;

/// API 端点 trait - 所有端点的统一抽象
/// 
/// 设计原则：
/// - Input/Output 是纯数据类型
/// - execute 是纯函数，只依赖 db 和 input
/// - 所有副作用（HTTP/IPC）由宏在边界处理
pub trait ApiEndpoint: Send + Sync + 'static {
    /// 请求输入类型
    type Input: DeserializeOwned + Send + 'static;
    
    /// 响应输出类型
    type Output: Serialize + Send + 'static;
    
    /// 端点名称（用于日志和调试）
    const NAME: &'static str;
    
    /// 执行端点逻辑
    fn execute(
        db: &DatabaseConnection,
        input: Self::Input,
    ) -> impl Future<Output = AppResult<Self::Output>> + Send;
}

/// 无输入参数的端点辅助类型
pub type NoInput = ();

/// 无输出的端点辅助类型（用于删除操作）
pub type NoOutput = ();
```

### Workspace Endpoints

```rust
// rust-core/src/api/workspace.rs

use super::{ApiEndpoint, NoInput};
use crate::{
    db::workspace_db_fn,
    types::{CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse},
    AppResult,
};
use sea_orm::DatabaseConnection;

/// 获取所有工作区
pub struct GetWorkspaces;

impl ApiEndpoint for GetWorkspaces {
    type Input = NoInput;
    type Output = Vec<WorkspaceResponse>;
    const NAME: &'static str = "get_workspaces";

    async fn execute(db: &DatabaseConnection, _: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::find_all(db)
            .await
            .map(|v| v.into_iter().map(Into::into).collect())
    }
}

/// 获取单个工作区
pub struct GetWorkspace;

#[derive(Debug, Clone, serde::Deserialize)]
pub struct GetWorkspaceInput {
    pub id: String,
}

impl ApiEndpoint for GetWorkspace {
    type Input = GetWorkspaceInput;
    type Output = Option<WorkspaceResponse>;
    const NAME: &'static str = "get_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::find_by_id(db, &input.id)
            .await
            .map(|opt| opt.map(Into::into))
    }
}

/// 创建工作区
pub struct CreateWorkspace;

impl ApiEndpoint for CreateWorkspace {
    type Input = CreateWorkspaceRequest;
    type Output = WorkspaceResponse;
    const NAME: &'static str = "create_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::create(db, &input)
            .await
            .map(Into::into)
    }
}

/// 更新工作区
pub struct UpdateWorkspace;

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateWorkspaceInput {
    pub id: String,
    #[serde(flatten)]
    pub request: UpdateWorkspaceRequest,
}

impl ApiEndpoint for UpdateWorkspace {
    type Input = UpdateWorkspaceInput;
    type Output = WorkspaceResponse;
    const NAME: &'static str = "update_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::update(db, &input.id, &input.request)
            .await
            .map(Into::into)
    }
}

/// 删除工作区
pub struct DeleteWorkspace;

#[derive(Debug, Clone, serde::Deserialize)]
pub struct DeleteWorkspaceInput {
    pub id: String,
}

impl ApiEndpoint for DeleteWorkspace {
    type Input = DeleteWorkspaceInput;
    type Output = ();
    const NAME: &'static str = "delete_workspace";

    async fn execute(db: &DatabaseConnection, input: Self::Input) -> AppResult<Self::Output> {
        workspace_db_fn::delete(db, &input.id).await
    }
}
```

### Warp Routes Macro

```rust
// rust-core/src/macros/warp_macro.rs

/// 生成 Warp 路由
/// 
/// 用法：
/// ```rust
/// let routes = warp_routes!(db,
///     GetWorkspaces => GET "/api/workspaces",
///     GetWorkspace => GET "/api/workspaces/{id}",
///     CreateWorkspace => POST "/api/workspaces",
/// );
/// ```
#[macro_export]
macro_rules! warp_routes {
    ($db:expr, $($endpoint:ty => $method:ident $path:literal),* $(,)?) => {{
        use warp::Filter;
        use $crate::api::ApiEndpoint;
        
        let db = std::sync::Arc::new($db);
        
        // 生成每个路由
        let routes = warp::any().and(warp::path::end()).map(|| "API Root");
        
        $(
            let db_clone = db.clone();
            let route = warp::path!($path)
                .and(warp::$method())
                .and($crate::macros::with_db(db_clone))
                .and($crate::macros::extract_input::<$endpoint>())
                .and_then(|db: std::sync::Arc<sea_orm::DatabaseConnection>, input| async move {
                    <$endpoint>::execute(&db, input)
                        .await
                        .map(|output| warp::reply::json(&output))
                        .map_err(|e| warp::reject::custom($crate::macros::AppRejection(e)))
                });
            let routes = routes.or(route);
        )*
        
        routes.recover($crate::macros::handle_rejection)
    }};
}

/// 注入数据库连接的 Filter
pub fn with_db(
    db: std::sync::Arc<sea_orm::DatabaseConnection>,
) -> impl Filter<Extract = (std::sync::Arc<sea_orm::DatabaseConnection>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || db.clone())
}

/// 提取输入参数的 Filter
pub fn extract_input<E: ApiEndpoint>() -> impl Filter<Extract = (E::Input,), Error = warp::Rejection> + Clone {
    // 对于 NoInput，不需要 body
    // 对于其他类型，从 JSON body 或 query 提取
    warp::body::json()
        .or(warp::any().map(|| serde_json::from_str("{}").unwrap()))
        .unify()
}
```

### Tauri Commands Macro

```rust
// rust-core/src/macros/tauri_macro.rs

/// 生成 Tauri commands
/// 
/// 用法：
/// ```rust
/// tauri_commands!(
///     GetWorkspaces => get_workspaces,
///     GetWorkspace => get_workspace,
///     CreateWorkspace => create_workspace,
/// );
/// ```
#[macro_export]
macro_rules! tauri_commands {
    ($($endpoint:ty => $name:ident),* $(,)?) => {
        $(
            #[tauri::command]
            pub async fn $name(
                db: tauri::State<'_, sea_orm::DatabaseConnection>,
                input: <$endpoint as $crate::api::ApiEndpoint>::Input,
            ) -> Result<<$endpoint as $crate::api::ApiEndpoint>::Output, String> {
                <$endpoint as $crate::api::ApiEndpoint>::execute(&db, input)
                    .await
                    .map_err(|e| e.to_string())
            }
        )*
        
        /// 生成 invoke_handler
        #[macro_export]
        macro_rules! tauri_invoke_handler {
            () => {
                tauri::generate_handler![$($name),*]
            };
        }
    };
}
```

## Data Models

### Input Types

```rust
// 无参数输入
pub type NoInput = ();

// 带 ID 的输入
#[derive(Debug, Clone, Deserialize)]
pub struct IdInput {
    pub id: String,
}

// 带 ID 和请求体的输入
#[derive(Debug, Clone, Deserialize)]
pub struct IdWithBody<T> {
    pub id: String,
    #[serde(flatten)]
    pub body: T,
}

// 工作区 ID 输入
#[derive(Debug, Clone, Deserialize)]
pub struct WorkspaceIdInput {
    pub workspace_id: String,
}

// 父节点 ID 输入
#[derive(Debug, Clone, Deserialize)]
pub struct ParentIdInput {
    pub parent_id: String,
}
```

### Output Types

所有输出类型复用现有的 Response 类型：
- `WorkspaceResponse`
- `NodeResponse`
- `ContentResponse`
- `TagResponse`
- `UserResponse`
- `AttachmentResponse`
- `BackupInfo`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CRUD Round-Trip Consistency

*For any* entity (Workspace, Node, Content), creating it and then retrieving it by ID should return an equivalent entity.

**Validates: Requirements 2.1-2.5, 3.1-3.8, 4.1-4.3**

### Property 2: Transaction Atomicity

*For any* CreateNodeWithContent operation, either both node and content exist after success, or neither exists after failure.

**Validates: Requirements 5.1, 5.2, 5.4**

### Property 3: Warp Handler Correctness

*For any* ApiEndpoint, the generated Warp handler should:
- Accept the correct HTTP method
- Parse Input from request body/query
- Serialize Output to JSON response
- Map AppError to correct HTTP status code

**Validates: Requirements 6.2-6.6**

### Property 4: Tauri Command Correctness

*For any* ApiEndpoint, the generated Tauri command should:
- Deserialize Input from IPC arguments
- Serialize Output to IPC response
- Convert AppError to descriptive string

**Validates: Requirements 7.3-7.5**

### Property 5: Error Handling Consistency

*For any* AppError, the error response format should be identical between Warp and Tauri (same error code and message structure).

**Validates: Requirements 9.1-9.4**

### Property 6: JSON Serialization Format

*For any* Response type, JSON serialization should use camelCase for field names.

**Validates: Requirements 10.3**

## Error Handling

### AppError Mapping

| AppError Variant | HTTP Status | Tauri String |
|-----------------|-------------|--------------|
| NotFound | 404 | "Not found: {message}" |
| ValidationError | 400 | "Validation error: {message}" |
| DatabaseError | 500 | "Database error: {message}" |
| Unauthorized | 401 | "Unauthorized: {message}" |
| InternalError | 500 | "Internal error: {message}" |

### Warp Rejection Handler

```rust
pub async fn handle_rejection(err: warp::Rejection) -> Result<impl warp::Reply, Infallible> {
    let (code, message) = if let Some(AppRejection(e)) = err.find::<AppRejection>() {
        (e.status_code(), e.to_string())
    } else if err.is_not_found() {
        (StatusCode::NOT_FOUND, "Not found".to_string())
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".to_string())
    };

    Ok(warp::reply::with_status(
        warp::reply::json(&ErrorResponse { error: message }),
        code,
    ))
}
```

## Testing Strategy

### Unit Tests

- 测试每个 ApiEndpoint 的 execute 方法
- 使用内存数据库进行隔离测试
- 测试边界条件（空输入、无效 ID 等）

### Property-Based Tests

- 使用 proptest 生成随机输入
- 验证 CRUD 往返一致性
- 验证事务原子性
- 验证 JSON 序列化格式

### Integration Tests

- 测试 Warp 路由的 HTTP 行为
- 测试 Tauri 命令的 IPC 行为
- 验证错误处理一致性

### Test Configuration

- 使用 proptest 进行属性测试
- 每个属性测试至少运行 100 次迭代
- 测试标签格式：`Feature: rust-api-macro, Property N: {property_text}`
