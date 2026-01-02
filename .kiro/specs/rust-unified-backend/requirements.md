# Requirements Document

## Introduction

本功能将 Rust 后端逻辑抽取为独立的共享 crate（`packages/rust-core`），并创建 Warp HTTP 服务器（`apps/api-rust`），使前端能够在 Tauri Desktop 和 Web 环境下使用统一的 API 接口。Warp 使用函数式 Filter 组合子模式，完美契合项目的函数式水流哲学。通过高阶函数模式，前端只需在启动时判断一次运行环境，后续所有 API 调用逻辑完全一致。

## Glossary

- **Rust_Core**: 共享 Rust crate，包含所有业务逻辑、类型定义和数据库操作
- **Tauri_Commands**: Tauri 框架的前端可调用命令，薄层封装调用 Rust_Core
- **Warp_Server**: 基于 Warp 框架的 HTTP REST API 服务器，使用 Filter 组合子模式，薄层封装调用 Rust_Core
- **API_Client**: 前端统一 API 客户端，根据环境选择 invoke 或 fetch
- **TaskEither**: fp-ts 的异步错误处理类型，表示可能失败的异步操作
- **High_Order_Function**: 高阶函数，返回函数的函数，用于创建统一 API 客户端

## Requirements

### Requirement 1: 创建共享 Rust Core Crate

**User Story:** As a developer, I want to have a shared Rust crate containing all business logic, so that both Tauri and Axum can reuse the same code without duplication.

#### Acceptance Criteria

1. THE Rust_Core SHALL be located at `packages/rust-core/` directory
2. THE Rust_Core SHALL contain all types from current `src-tauri/src/types/` directory
3. THE Rust_Core SHALL contain all database functions from current `src-tauri/src/db/` directory
4. THE Rust_Core SHALL contain all pure functions from current `src-tauri/src/fn/` directory
5. THE Rust_Core SHALL expose a public API through `lib.rs` for external crates to consume
6. THE Rust_Core SHALL use the same directory structure as current `src-tauri/src/`:
   - `types/` - 类型定义（Interface + Builder + Entity）
   - `db/` - 数据库操作函数
   - `fn/` - 纯函数
7. THE Rust_Core SHALL NOT depend on Tauri or Axum specific code

### Requirement 2: 重构 Tauri Commands 为薄层

**User Story:** As a developer, I want Tauri commands to be thin wrappers that only call Rust_Core, so that the codebase is maintainable and DRY.

#### Acceptance Criteria

1. WHEN Tauri_Commands receive a request, THE Tauri_Commands SHALL delegate to Rust_Core functions
2. THE Tauri_Commands SHALL only handle Tauri-specific concerns (State injection, error conversion)
3. THE Tauri_Commands SHALL maintain the same command names and signatures as current implementation
4. THE `src-tauri/Cargo.toml` SHALL depend on `rust-core` crate
5. THE Tauri_Commands SHALL NOT contain any business logic

### Requirement 3: 创建 Warp HTTP 服务器

**User Story:** As a developer, I want a Warp HTTP server that exposes the same API as Tauri commands using functional Filter composition, so that the web application can use the same backend logic with a functional programming style.

#### Acceptance Criteria

1. THE Warp_Server SHALL be located at `apps/api-rust/` directory
2. THE Warp_Server SHALL use Filter 组合子模式构建路由：
   - `warp::path("workspaces").and(warp::get())` → `get_workspaces`
   - `warp::path!("workspaces" / String).and(warp::get())` → `get_workspace`
   - `warp::path("workspaces").and(warp::post())` → `create_workspace`
   - `warp::path!("workspaces" / String).and(warp::put())` → `update_workspace`
   - `warp::path!("workspaces" / String).and(warp::delete())` → `delete_workspace`
   - (同样模式适用于 nodes, content, tags, users, attachments, backups)
3. THE Warp_Server SHALL use `and()`, `or()`, `map()` 组合子构建路由树
4. THE Warp_Server SHALL use JSON request/response format matching Tauri's serialization
5. THE Warp_Server SHALL delegate all business logic to Rust_Core
6. THE Warp_Server SHALL support CORS for local development via `warp::cors()`
7. THE Warp_Server SHALL use the same database connection configuration as Tauri
8. WHEN an error occurs, THE Warp_Server SHALL use Rejection 模式返回适当的 HTTP 状态码

### Requirement 4: 创建前端统一 API 客户端

**User Story:** As a frontend developer, I want a unified API client that works in both Tauri and Web environments, so that I can write code once and run it anywhere.

#### Acceptance Criteria

1. THE API_Client SHALL be implemented as a high-order function that returns the API interface
2. THE API_Client SHALL detect environment once at initialization:
   - Tauri environment: `"__TAURI__" in window`
   - Web environment: otherwise
3. THE API_Client SHALL return TaskEither for all operations (fp-ts pattern)
4. THE API_Client SHALL have identical function signatures regardless of environment
5. WHEN in Tauri environment, THE API_Client SHALL use `invoke()` to call commands
6. WHEN in Web environment, THE API_Client SHALL use `fetch()` to call HTTP endpoints
7. THE API_Client SHALL be located at `apps/desktop/src/db/api-client.fn.ts`
8. THE API_Client SHALL replace current `rust-api.fn.ts` implementation

### Requirement 5: 统一错误处理

**User Story:** As a developer, I want consistent error handling across Tauri and HTTP, so that the frontend can handle errors uniformly.

#### Acceptance Criteria

1. THE Rust_Core SHALL define a unified `AppError` type
2. WHEN Tauri_Commands encounter an error, THE Tauri_Commands SHALL convert AppError to String for Tauri
3. WHEN Warp_Server encounters an error, THE Warp_Server SHALL convert AppError to Rejection with HTTP status code
4. THE API_Client SHALL convert both error formats to frontend `AppError` type
5. THE error conversion SHALL preserve error messages and context

### Requirement 6: 数据库连接管理

**User Story:** As a developer, I want both Tauri and Warp to use the same database configuration, so that data is consistent across environments.

#### Acceptance Criteria

1. THE Rust_Core SHALL provide database connection factory functions
2. THE Rust_Core SHALL support configurable database path
3. WHEN running in Tauri, THE database path SHALL default to user's app data directory
4. WHEN running in Warp_Server, THE database path SHALL be configurable via environment variable
5. THE Rust_Core SHALL support SQLite with the same schema for both environments

### Requirement 7: 开发体验优化

**User Story:** As a developer, I want fast iteration during development, so that I can quickly test changes in the web environment.

#### Acceptance Criteria

1. THE Warp_Server SHALL support hot-reload via `cargo watch`
2. THE Warp_Server SHALL log all requests and responses in development mode using `warp::log()`
3. THE Warp_Server SHALL run on configurable port (default: 3001)
4. THE monorepo SHALL have scripts to start Warp_Server alongside web dev server
5. WHEN `bun run api-rust:dev` is executed, THE Warp_Server SHALL start in development mode

### Requirement 8: 类型一致性

**User Story:** As a developer, I want TypeScript types to match Rust types exactly, so that there are no runtime type mismatches.

#### Acceptance Criteria

1. THE Rust_Core types SHALL use `#[serde(rename_all = "camelCase")]` for JSON serialization
2. THE TypeScript types in `rust-api.ts` SHALL match Rust_Core DTO types exactly
3. THE Warp_Server SHALL use the same serde configuration as Tauri_Commands
4. WHEN a type is added or modified in Rust_Core, THE corresponding TypeScript type SHALL be updated

