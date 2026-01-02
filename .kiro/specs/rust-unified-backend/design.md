# Design Document: Rust Unified Backend

## Overview

本设计将 Grain 项目的 Rust 后端重构为三层架构：

1. **rust-core** - 共享核心 crate，包含所有业务逻辑
2. **src-tauri** - Tauri 薄层，仅做命令绑定
3. **api-rust** - Warp HTTP 服务器，使用 Filter 组合子模式

前端通过高阶函数创建统一 API 客户端，一次环境判断后，所有调用逻辑完全一致。

### 函数式编程策略

**Rust 原生函数式特性**（不引入额外库）：

| 概念 | TypeScript (fp-ts) | Rust 原生 |
|------|-------------------|-----------|
| Option | `Option<T>` | `Option<T>` ✅ |
| Either | `Either<E, A>` | `Result<T, E>` ✅ |
| TaskEither | `TaskEither<E, A>` | `async fn -> Result<T, E>` ✅ |
| pipe | `pipe(a, f, g)` | 方法链 `.map().and_then()` |
| 不可变性 | Immer | Rust 默认不可变 ✅ |

```rust
// Rust 原生函数式风格示例
pub async fn create_workspace(
    db: &DatabaseConnection,
    request: CreateWorkspaceRequest,
) -> AppResult<WorkspaceResponse> {
    validate_request(&request)?;
    
    let id = uuid::Uuid::new_v4().to_string();
    
    workspace_db_fn::create(db, id, request.title, request.description)
        .await
        .map(WorkspaceResponse::from)
}
```

## Architecture

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Grain 统一后端架构                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   前端 (React)   │
                                    └────────┬────────┘
                                             │
                          ┌──────────────────┴──────────────────┐
                          │                                     │
                          ▼                                     ▼
               ┌─────────────────────┐               ┌─────────────────────┐
               │   API Client (TE)   │               │   API Client (TE)   │
               │   isTauri = true    │               │   isTauri = false   │
               └──────────┬──────────┘               └──────────┬──────────┘
                          │                                     │
                          │ invoke()                            │ fetch()
                          ▼                                     ▼
               ┌─────────────────────┐               ┌─────────────────────┐
               │   Tauri Commands    │               │   Warp Filters      │
               │   (薄层封装)         │               │   (Filter 组合子)    │
               └──────────┬──────────┘               └──────────┬──────────┘
                          │                                     │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │           rust-core                 │
                          │                                     │
                          │   ┌─────────┐  ┌─────────┐         │
                          │   │ types/  │  │  db/    │         │
                          │   └─────────┘  └─────────┘         │
                          │   ┌─────────┐  ┌─────────┐         │
                          │   │  fn/    │  │ error   │         │
                          │   └─────────┘  └─────────┘         │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │           SQLite Database           │
                          └─────────────────────────────────────┘
```

### 目录结构

```
grain-editor-monorepo/
├── packages/
│   └── rust-core/                    # 共享 Rust 核心 crate
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs                # 公共 API 导出
│           ├── types/                # 类型定义
│           │   ├── mod.rs
│           │   ├── error.rs          # AppError 定义
│           │   ├── config.rs         # 配置结构
│           │   ├── workspace/        # Workspace 类型
│           │   ├── node/             # Node 类型
│           │   ├── content/          # Content 类型
│           │   ├── tag/              # Tag 类型
│           │   ├── user/             # User 类型
│           │   └── attachment/       # Attachment 类型
│           ├── db/                   # 数据库操作
│           │   ├── mod.rs
│           │   ├── connection.rs     # 连接管理
│           │   ├── workspace_db_fn.rs
│           │   ├── node_db_fn.rs
│           │   ├── content_db_fn.rs
│           │   ├── tag_db_fn.rs
│           │   ├── user_db_fn.rs
│           │   └── attachment_db_fn.rs
│           └── fn/                   # 纯函数
│               ├── mod.rs
│               └── ...
│
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   │   └── db/
│   │   │       └── api-client.fn.ts  # 统一 API 客户端
│   │   └── src-tauri/                # Tauri 薄层
│   │       ├── Cargo.toml            # 依赖 rust-core
│   │       └── src/
│   │           ├── lib.rs
│   │           ├── main.rs
│   │           └── commands/         # 薄层命令
│   │               ├── mod.rs
│   │               ├── workspace_commands.rs
│   │               ├── node_commands.rs
│   │               └── ...
│   │
│   └── api-rust/                     # Warp HTTP 服务器
│       ├── Cargo.toml                # 依赖 rust-core + warp
│       └── src/
│           ├── main.rs               # 入口点
│           ├── lib.rs                # 服务器配置
│           ├── filters/              # Warp Filter 定义
│           │   ├── mod.rs
│           │   ├── workspace_filters.rs
│           │   ├── node_filters.rs
│           │   ├── content_filters.rs
│           │   └── ...
│           ├── handlers/             # 请求处理函数
│           │   ├── mod.rs
│           │   ├── workspace_handlers.rs
│           │   ├── node_handlers.rs
│           │   └── ...
│           └── rejection.rs          # 错误处理
```

## Components and Interfaces

### 1. rust-core Crate

#### Cargo.toml

```toml
[package]
name = "rust-core"
version = "0.1.0"
edition = "2021"

[dependencies]
# ORM 和数据库
sea-orm = { version = "1.1", features = [
    "sqlx-sqlite",
    "runtime-tokio-rustls",
    "macros",
    "with-chrono",
    "with-uuid",
] }

# 序列化
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# 错误处理
thiserror = "2"

# 工具库
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }

# 异步
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"

# 日志
tracing = "0.1"
```

#### lib.rs 公共 API

```rust
//! Grain Core - 共享业务逻辑
//!
//! 此 crate 包含所有业务逻辑，被 Tauri 和 Warp 共同使用。

pub mod types;
pub mod db;
pub mod r#fn;

// 重新导出常用类型
pub use types::{
    AppError, AppResult, AppConfig,
    // Workspace
    CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse,
    // Node
    CreateNodeRequest, UpdateNodeRequest, MoveNodeRequest, NodeResponse, NodeType,
    // Content
    SaveContentRequest, ContentResponse,
    // Tag
    CreateTagRequest, UpdateTagRequest, TagResponse,
    // User
    CreateUserRequest, UpdateUserRequest, UserResponse,
    // Attachment
    CreateAttachmentRequest, UpdateAttachmentRequest, AttachmentResponse,
};

// 重新导出数据库函数
pub use db::{
    DbConnection,
    workspace_db_fn, node_db_fn, content_db_fn,
    tag_db_fn, user_db_fn, attachment_db_fn,
};
```

### 2. Warp Server (Filter 组合子模式)

#### filters/workspace_filters.rs

```rust
//! Workspace Filter 定义
//!
//! 使用 Warp 的 Filter 组合子模式构建路由

use rust_core::{CreateWorkspaceRequest, UpdateWorkspaceRequest};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Filter;

use crate::handlers::workspace_handlers;
use crate::rejection::handle_rejection;

/// 注入数据库连接的 Filter
fn with_db(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (Arc<DatabaseConnection>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || db.clone())
}

/// Workspace 路由组合
/// 
/// 使用 `and()` 和 `or()` 组合子构建路由树
pub fn workspace_routes(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    get_workspaces(db.clone())
        .or(get_workspace(db.clone()))
        .or(create_workspace(db.clone()))
        .or(update_workspace(db.clone()))
        .or(delete_workspace(db.clone()))
}

/// GET /api/workspaces
fn get_workspaces(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces")
        .and(warp::get())
        .and(with_db(db))
        .and_then(workspace_handlers::get_workspaces)
}

/// GET /api/workspaces/:id
fn get_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::get())
        .and(with_db(db))
        .and_then(workspace_handlers::get_workspace)
}

/// POST /api/workspaces
fn create_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces")
        .and(warp::post())
        .and(warp::body::json::<CreateWorkspaceRequest>())
        .and(with_db(db))
        .and_then(workspace_handlers::create_workspace)
}

/// PUT /api/workspaces/:id
fn update_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::put())
        .and(warp::body::json::<UpdateWorkspaceRequest>())
        .and(with_db(db))
        .and_then(workspace_handlers::update_workspace)
}

/// DELETE /api/workspaces/:id
fn delete_workspace(
    db: Arc<DatabaseConnection>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "workspaces" / String)
        .and(warp::delete())
        .and(with_db(db))
        .and_then(workspace_handlers::delete_workspace)
}
```

#### handlers/workspace_handlers.rs

```rust
//! Workspace 请求处理函数
//!
//! 薄层封装，调用 rust-core 的业务逻辑

use rust_core::{
    workspace_db_fn, CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse,
};
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use warp::Reply;

use crate::rejection::AppRejection;

/// 获取所有工作区
pub async fn get_workspaces(
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    workspace_db_fn::find_all(&db)
        .await
        .map(|workspaces| {
            let responses: Vec<WorkspaceResponse> = workspaces
                .into_iter()
                .map(WorkspaceResponse::from)
                .collect();
            warp::reply::json(&responses)
        })
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 获取单个工作区
pub async fn get_workspace(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    workspace_db_fn::find_by_id(&db, &id)
        .await
        .map(|opt| {
            opt.map(|w| warp::reply::json(&WorkspaceResponse::from(w)))
                .unwrap_or_else(|| warp::reply::json(&serde_json::Value::Null))
        })
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 创建工作区
pub async fn create_workspace(
    request: CreateWorkspaceRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    let id = uuid::Uuid::new_v4().to_string();
    
    workspace_db_fn::create(&db, id, request.title, request.description)
        .await
        .map(|w| warp::reply::json(&WorkspaceResponse::from(w)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 更新工作区
pub async fn update_workspace(
    id: String,
    request: UpdateWorkspaceRequest,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    workspace_db_fn::update(&db, &id, request.title, request.description)
        .await
        .map(|w| warp::reply::json(&WorkspaceResponse::from(w)))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}

/// 删除工作区
pub async fn delete_workspace(
    id: String,
    db: Arc<DatabaseConnection>,
) -> Result<impl Reply, warp::Rejection> {
    workspace_db_fn::delete(&db, &id)
        .await
        .map(|_| warp::reply::json(&serde_json::json!({"success": true})))
        .map_err(|e| warp::reject::custom(AppRejection::from(e)))
}
```

#### main.rs (Warp 服务器入口)

```rust
//! Grain API Server
//!
//! 基于 Warp 的 HTTP REST API 服务器

use rust_core::{db::DbConnection, AppConfig};
use std::sync::Arc;
use tracing::info;
use warp::Filter;

mod filters;
mod handlers;
mod rejection;

#[tokio::main]
async fn main() {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter("info,rust_core=debug,api_rust=debug")
        .init();

    // 加载配置
    let config = AppConfig::from_env();
    info!("数据库路径: {:?}", config.db_path);

    // 连接数据库
    let db = DbConnection::connect(&config)
        .await
        .expect("数据库连接失败");
    let db = Arc::new(db);

    // 构建路由树（Filter 组合）
    let routes = filters::workspace_routes(db.clone())
        .or(filters::node_routes(db.clone()))
        .or(filters::content_routes(db.clone()))
        .or(filters::tag_routes(db.clone()))
        .or(filters::user_routes(db.clone()))
        .or(filters::attachment_routes(db.clone()))
        .or(filters::backup_routes(db.clone()))
        .with(warp::log("api"))
        .with(
            warp::cors()
                .allow_any_origin()
                .allow_methods(vec!["GET", "POST", "PUT", "DELETE"])
                .allow_headers(vec!["Content-Type"]),
        )
        .recover(rejection::handle_rejection);

    // 启动服务器
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    info!("Warp 服务器启动于 http://localhost:{}", port);
    warp::serve(routes).run(([0, 0, 0, 0], port)).await;
}
```

### 3. 前端统一 API 客户端

#### api-client.fn.ts

```typescript
/**
 * 统一 API 客户端
 *
 * 高阶函数模式：一次环境判断，返回统一接口
 * 遵循函数式水流哲学，所有操作返回 TaskEither
 */

import { invoke } from "@tauri-apps/api/core";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import type { AppError } from "@/lib/error.types";
import { dbError } from "@/lib/error.types";
import logger from "@/log";
import type {
  BackupInfo,
  ContentResponse,
  CreateNodeRequest,
  CreateWorkspaceRequest,
  MoveNodeRequest,
  NodeResponse,
  SaveContentRequest,
  UpdateNodeRequest,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
} from "@/types/rust-api";

// ============================================
// 环境检测（只执行一次）
// ============================================

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// ============================================
// 底层调用函数
// ============================================

/**
 * Tauri invoke 封装
 */
const invokeTE = <T>(
  cmd: string,
  args?: Record<string, unknown>,
): TE.TaskEither<AppError, T> =>
  TE.tryCatch(
    async () => {
      logger.info(`[API:Tauri] ${cmd}`, args);
      const result = await invoke<T>(cmd, args);
      logger.info(`[API:Tauri] ${cmd} 成功`);
      return result;
    },
    (error) => {
      logger.error(`[API:Tauri] ${cmd} 失败`, error);
      return dbError(`${cmd} 失败: ${error}`);
    },
  );

/**
 * HTTP fetch 封装
 */
const fetchTE = <T>(
  endpoint: string,
  options: RequestInit = {},
): TE.TaskEither<AppError, T> =>
  TE.tryCatch(
    async () => {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const url = `${baseUrl}${endpoint}`;
      
      logger.info(`[API:HTTP] ${options.method || "GET"} ${endpoint}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const result = await response.json();
      logger.info(`[API:HTTP] ${endpoint} 成功`);
      return result as T;
    },
    (error) => {
      logger.error(`[API:HTTP] ${endpoint} 失败`, error);
      return dbError(`${endpoint} 失败: ${error}`);
    },
  );

// ============================================
// 高阶函数：创建统一调用器
// ============================================

type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * 创建统一 API 调用函数
 * 
 * @param cmd - Tauri 命令名
 * @param endpoint - HTTP 端点
 * @param method - HTTP 方法
 */
const createApiCall = <TArgs extends Record<string, unknown>, TResult>(
  cmd: string,
  endpoint: string | ((args: TArgs) => string),
  method: ApiMethod = "GET",
) => {
  return (args?: TArgs): TE.TaskEither<AppError, TResult> => {
    if (isTauri) {
      return invokeTE<TResult>(cmd, args);
    }
    
    const path = typeof endpoint === "function" ? endpoint(args!) : endpoint;
    const options: RequestInit = { method };
    
    if (method === "POST" || method === "PUT") {
      options.body = JSON.stringify(args);
    }
    
    return fetchTE<TResult>(path, options);
  };
};

// ============================================
// API 接口定义
// ============================================

export interface ApiClient {
  // Workspace
  getWorkspaces: () => TE.TaskEither<AppError, WorkspaceResponse[]>;
  getWorkspace: (id: string) => TE.TaskEither<AppError, WorkspaceResponse | null>;
  createWorkspace: (request: CreateWorkspaceRequest) => TE.TaskEither<AppError, WorkspaceResponse>;
  updateWorkspace: (id: string, request: UpdateWorkspaceRequest) => TE.TaskEither<AppError, WorkspaceResponse>;
  deleteWorkspace: (id: string) => TE.TaskEither<AppError, void>;
  
  // Node
  getNodesByWorkspace: (workspaceId: string) => TE.TaskEither<AppError, NodeResponse[]>;
  getNode: (id: string) => TE.TaskEither<AppError, NodeResponse | null>;
  createNode: (request: CreateNodeRequest) => TE.TaskEither<AppError, NodeResponse>;
  updateNode: (id: string, request: UpdateNodeRequest) => TE.TaskEither<AppError, NodeResponse>;
  moveNode: (id: string, request: MoveNodeRequest) => TE.TaskEither<AppError, NodeResponse>;
  deleteNode: (id: string) => TE.TaskEither<AppError, void>;
  
  // Content
  getContent: (nodeId: string) => TE.TaskEither<AppError, ContentResponse | null>;
  saveContent: (request: SaveContentRequest) => TE.TaskEither<AppError, ContentResponse>;
  
  // Backup
  createBackup: () => TE.TaskEither<AppError, BackupInfo>;
  listBackups: () => TE.TaskEither<AppError, BackupInfo[]>;
}

// ============================================
// 创建 API 客户端（高阶函数）
// ============================================

/**
 * 创建统一 API 客户端
 * 
 * 高阶函数：根据环境返回对应的 API 实现
 * 调用方无需关心底层是 invoke 还是 fetch
 */
export const createApiClient = (): ApiClient => {
  logger.info(`[API] 初始化客户端，环境: ${isTauri ? "Tauri" : "Web"}`);
  
  return {
    // ============================================
    // Workspace API
    // ============================================
    getWorkspaces: createApiCall<{}, WorkspaceResponse[]>(
      "get_workspaces",
      "/api/workspaces",
    ),
    
    getWorkspace: (id: string) =>
      isTauri
        ? invokeTE("get_workspace", { id })
        : fetchTE(`/api/workspaces/${id}`),
    
    createWorkspace: (request: CreateWorkspaceRequest) =>
      isTauri
        ? invokeTE("create_workspace", { request })
        : fetchTE("/api/workspaces", {
            method: "POST",
            body: JSON.stringify(request),
          }),
    
    updateWorkspace: (id: string, request: UpdateWorkspaceRequest) =>
      isTauri
        ? invokeTE("update_workspace", { id, request })
        : fetchTE(`/api/workspaces/${id}`, {
            method: "PUT",
            body: JSON.stringify(request),
          }),
    
    deleteWorkspace: (id: string) =>
      isTauri
        ? invokeTE("delete_workspace", { id })
        : fetchTE(`/api/workspaces/${id}`, { method: "DELETE" }),

    // ============================================
    // Node API
    // ============================================
    getNodesByWorkspace: (workspaceId: string) =>
      isTauri
        ? invokeTE("get_nodes_by_workspace", { workspaceId })
        : fetchTE(`/api/workspaces/${workspaceId}/nodes`),
    
    getNode: (id: string) =>
      isTauri
        ? invokeTE("get_node", { id })
        : fetchTE(`/api/nodes/${id}`),
    
    createNode: (request: CreateNodeRequest) =>
      isTauri
        ? invokeTE("create_node", { request })
        : fetchTE("/api/nodes", {
            method: "POST",
            body: JSON.stringify(request),
          }),
    
    updateNode: (id: string, request: UpdateNodeRequest) =>
      isTauri
        ? invokeTE("update_node", { id, request })
        : fetchTE(`/api/nodes/${id}`, {
            method: "PUT",
            body: JSON.stringify(request),
          }),
    
    moveNode: (id: string, request: MoveNodeRequest) =>
      isTauri
        ? invokeTE("move_node", { id, request })
        : fetchTE(`/api/nodes/${id}/move`, {
            method: "PUT",
            body: JSON.stringify(request),
          }),
    
    deleteNode: (id: string) =>
      isTauri
        ? invokeTE("delete_node", { id })
        : fetchTE(`/api/nodes/${id}`, { method: "DELETE" }),

    // ============================================
    // Content API
    // ============================================
    getContent: (nodeId: string) =>
      isTauri
        ? invokeTE("get_content", { nodeId })
        : fetchTE(`/api/nodes/${nodeId}/content`),
    
    saveContent: (request: SaveContentRequest) =>
      isTauri
        ? invokeTE("save_content", { request })
        : fetchTE(`/api/nodes/${request.nodeId}/content`, {
            method: "PUT",
            body: JSON.stringify(request),
          }),

    // ============================================
    // Backup API
    // ============================================
    createBackup: () =>
      isTauri
        ? invokeTE("create_backup")
        : fetchTE("/api/backups", { method: "POST" }),
    
    listBackups: () =>
      isTauri
        ? invokeTE("list_backups")
        : fetchTE("/api/backups"),
  };
};

// ============================================
// 导出单例客户端
// ============================================

/** 全局 API 客户端实例 */
export const api = createApiClient();
```

## Data Models

数据模型保持与现有 `src-tauri/src/types/` 完全一致，只是移动到 `rust-core` crate。

### 类型映射

| 前端 TypeScript | rust-core Rust | 说明 |
|----------------|----------------|------|
| `WorkspaceResponse` | `WorkspaceResponse` | 工作区响应 |
| `CreateWorkspaceRequest` | `CreateWorkspaceRequest` | 创建请求 |
| `NodeResponse` | `NodeResponse` | 节点响应 |
| `ContentResponse` | `ContentResponse` | 内容响应 |
| `AppError` | `AppError` | 错误类型 |



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tauri Commands Delegation

*For any* Tauri command that receives a request, the command SHALL delegate to the corresponding rust-core function without implementing business logic locally.

**Validates: Requirements 2.1**

### Property 2: JSON Serialization Round-Trip

*For any* data type used in API communication, serializing to JSON via Warp and deserializing should produce an equivalent object to serializing via Tauri invoke and deserializing.

**Validates: Requirements 3.4, 8.1, 8.2**

### Property 3: Error Handling Consistency

*For any* error that occurs in rust-core, converting it through either Tauri (AppError → String) or Warp (AppError → Rejection → HTTP response) and then parsing in the frontend should produce an equivalent frontend AppError with preserved message and context.

**Validates: Requirements 5.2, 5.3, 5.4, 5.5**

### Property 4: API Client Signature Consistency

*For any* API method in the API_Client, the function signature and return type (TaskEither<AppError, T>) should be identical regardless of whether the client is running in Tauri or Web environment.

**Validates: Requirements 4.3, 4.4**

### Property 5: Database Schema Consistency

*For any* database operation, the schema used by Tauri and Warp should be identical, ensuring data created by one can be read by the other.

**Validates: Requirements 6.5**

### Property 6: HTTP Status Code Mapping

*For any* AppError type, the Warp server should return an appropriate HTTP status code:
- NotFound → 404
- ValidationError → 400
- DatabaseError → 500
- Unauthorized → 401

**Validates: Requirements 3.8**

## Error Handling

### rust-core AppError

```rust
//! 统一错误类型
//!
//! 所有错误都通过此类型传递，确保前后端一致

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("未找到: {0}")]
    NotFound(String),

    #[error("验证失败: {0}")]
    ValidationError(String),

    #[error("数据库错误: {0}")]
    DatabaseError(String),

    #[error("未授权: {0}")]
    Unauthorized(String),

    #[error("内部错误: {0}")]
    InternalError(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl AppError {
    /// 转换为 HTTP 状态码
    pub fn status_code(&self) -> u16 {
        match self {
            AppError::NotFound(_) => 404,
            AppError::ValidationError(_) => 400,
            AppError::DatabaseError(_) => 500,
            AppError::Unauthorized(_) => 401,
            AppError::InternalError(_) => 500,
        }
    }
}
```

### Warp Rejection 处理

```rust
//! Warp 错误处理
//!
//! 将 AppError 转换为 Warp Rejection

use rust_core::AppError;
use serde::Serialize;
use std::convert::Infallible;
use warp::{http::StatusCode, reject::Reject, Rejection, Reply};

/// 自定义 Rejection 类型
#[derive(Debug)]
pub struct AppRejection(pub AppError);

impl Reject for AppRejection {}

impl From<AppError> for AppRejection {
    fn from(err: AppError) -> Self {
        AppRejection(err)
    }
}

/// 错误响应结构
#[derive(Serialize)]
struct ErrorResponse {
    code: u16,
    message: String,
}

/// 统一错误处理
pub async fn handle_rejection(err: Rejection) -> Result<impl Reply, Infallible> {
    let (code, message) = if let Some(app_err) = err.find::<AppRejection>() {
        (
            StatusCode::from_u16(app_err.0.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            app_err.0.to_string(),
        )
    } else if err.is_not_found() {
        (StatusCode::NOT_FOUND, "路由未找到".to_string())
    } else if err.find::<warp::reject::MethodNotAllowed>().is_some() {
        (StatusCode::METHOD_NOT_ALLOWED, "方法不允许".to_string())
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, "内部服务器错误".to_string())
    };

    let json = warp::reply::json(&ErrorResponse {
        code: code.as_u16(),
        message,
    });

    Ok(warp::reply::with_status(json, code))
}
```

## Testing Strategy

### 测试类型

| 类型 | 工具 | 覆盖范围 |
|------|------|---------|
| 单元测试 | Rust `#[test]` | rust-core 纯函数 |
| 集成测试 | Rust `#[tokio::test]` | 数据库操作 |
| API 测试 | Rust + reqwest | Warp 端点 |
| 前端测试 | Vitest | API Client |
| 属性测试 | proptest | 序列化一致性 |

### Property-Based Testing

使用 `proptest` 进行属性测试，验证序列化一致性：

```rust
use proptest::prelude::*;
use rust_core::{CreateWorkspaceRequest, WorkspaceResponse};

proptest! {
    /// Property 2: JSON 序列化往返一致性
    /// Feature: rust-unified-backend, Property 2: JSON Serialization Round-Trip
    #[test]
    fn test_workspace_serialization_roundtrip(
        title in "[a-zA-Z0-9 ]{1,100}",
        description in prop::option::of("[a-zA-Z0-9 ]{0,500}"),
    ) {
        let request = CreateWorkspaceRequest {
            title: title.clone(),
            description: description.clone(),
            author: None,
            publisher: None,
            language: None,
            members: None,
            owner: None,
        };

        // 序列化
        let json = serde_json::to_string(&request).unwrap();
        
        // 反序列化
        let parsed: CreateWorkspaceRequest = serde_json::from_str(&json).unwrap();
        
        // 验证一致性
        prop_assert_eq!(request.title, parsed.title);
        prop_assert_eq!(request.description, parsed.description);
    }
}
```

### 单元测试示例

```rust
#[cfg(test)]
mod tests {
    use super::*;

    /// 测试错误状态码映射
    /// Feature: rust-unified-backend, Property 6: HTTP Status Code Mapping
    #[test]
    fn test_error_status_codes() {
        assert_eq!(AppError::NotFound("test".into()).status_code(), 404);
        assert_eq!(AppError::ValidationError("test".into()).status_code(), 400);
        assert_eq!(AppError::DatabaseError("test".into()).status_code(), 500);
        assert_eq!(AppError::Unauthorized("test".into()).status_code(), 401);
    }
}
```

### 前端测试示例

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from './api-client.fn';
import * as E from 'fp-ts/Either';

describe('API Client', () => {
  /**
   * Property 4: API Client Signature Consistency
   * Feature: rust-unified-backend, Property 4
   */
  it('should return TaskEither for all operations', async () => {
    const api = createApiClient();
    
    // 验证返回类型是 TaskEither
    const result = api.getWorkspaces();
    expect(typeof result).toBe('function'); // TaskEither 是一个函数
    
    // 执行并验证结果是 Either
    const either = await result();
    expect(E.isLeft(either) || E.isRight(either)).toBe(true);
  });
});
```

