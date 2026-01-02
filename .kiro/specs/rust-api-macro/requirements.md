# Requirements Document

## Introduction

本功能将 Rust 后端重构为基于宏的统一架构。通过定义 `ApiEndpoint` trait 和声明式宏，实现 Warp HTTP 服务器和 Tauri 桌面应用共享同一套 API 定义，消除代码重复，确保两端行为完全一致。

## Glossary

- **ApiEndpoint**: API 端点 trait，定义输入类型、输出类型和执行逻辑
- **rust-core**: 共享业务逻辑 crate，包含所有纯函数和类型定义
- **Warp**: Rust 函数式 HTTP 框架，使用 Filter 组合子模式
- **Tauri**: Rust 桌面应用框架，通过 IPC 与前端通信
- **声明式宏**: Rust `macro_rules!` 宏，用于代码生成

## Requirements

### Requirement 1: ApiEndpoint Trait 定义

**User Story:** As a developer, I want a unified trait for all API endpoints, so that I can define business logic once and use it in both Warp and Tauri.

#### Acceptance Criteria

1. THE ApiEndpoint trait SHALL define associated types `Input` and `Output`
2. THE ApiEndpoint trait SHALL define an async `execute` method that takes `DatabaseConnection` and `Input`
3. THE Input type SHALL implement `DeserializeOwned` and `Send`
4. THE Output type SHALL implement `Serialize` and `Send`
5. THE execute method SHALL return `AppResult<Self::Output>`
6. WHEN implementing ApiEndpoint, THE developer SHALL only write pure business logic

### Requirement 2: Workspace API 端点

**User Story:** As a developer, I want Workspace CRUD operations as ApiEndpoint implementations, so that they can be used by both Warp and Tauri.

#### Acceptance Criteria

1. THE GetWorkspaces endpoint SHALL return all workspaces
2. THE GetWorkspace endpoint SHALL accept workspace ID and return single workspace or null
3. THE CreateWorkspace endpoint SHALL accept CreateWorkspaceRequest and return created workspace
4. THE UpdateWorkspace endpoint SHALL accept ID and UpdateWorkspaceRequest and return updated workspace
5. THE DeleteWorkspace endpoint SHALL accept workspace ID and return void

### Requirement 3: Node API 端点

**User Story:** As a developer, I want Node CRUD operations as ApiEndpoint implementations, so that they can be used by both Warp and Tauri.

#### Acceptance Criteria

1. THE GetNodesByWorkspace endpoint SHALL accept workspace ID and return all nodes
2. THE GetNode endpoint SHALL accept node ID and return single node or null
3. THE GetRootNodes endpoint SHALL accept workspace ID and return root-level nodes
4. THE GetChildNodes endpoint SHALL accept parent ID and return child nodes
5. THE CreateNode endpoint SHALL accept CreateNodeRequest and return created node
6. THE UpdateNode endpoint SHALL accept ID and UpdateNodeRequest and return updated node
7. THE MoveNode endpoint SHALL accept ID and MoveNodeRequest and return moved node
8. THE DeleteNode endpoint SHALL accept node ID and delete recursively

### Requirement 4: Content API 端点

**User Story:** As a developer, I want Content operations as ApiEndpoint implementations, so that they can be used by both Warp and Tauri.

#### Acceptance Criteria

1. THE GetContent endpoint SHALL accept node ID and return content or null
2. THE SaveContent endpoint SHALL accept SaveContentRequest and return saved content
3. THE GetContentVersion endpoint SHALL accept node ID and return version number or null

### Requirement 5: 事务支持

**User Story:** As a developer, I want transaction support in ApiEndpoint, so that related operations succeed or fail together.

#### Acceptance Criteria

1. THE CreateNodeWithContent endpoint SHALL create node and content in a single transaction
2. IF node creation succeeds but content creation fails, THEN THE system SHALL rollback the node
3. IF content creation succeeds but commit fails, THEN THE system SHALL rollback both
4. THE DeleteNodeRecursive endpoint SHALL delete node and all descendants in a single transaction

### Requirement 6: Warp 宏生成

**User Story:** As a developer, I want a macro to generate Warp handlers from ApiEndpoint, so that I don't write boilerplate HTTP code.

#### Acceptance Criteria

1. THE warp_routes macro SHALL accept database connection and endpoint definitions
2. THE warp_routes macro SHALL generate correct HTTP method (GET/POST/PUT/DELETE)
3. THE warp_routes macro SHALL generate correct URL path with parameters
4. THE warp_routes macro SHALL handle JSON request body deserialization
5. THE warp_routes macro SHALL handle JSON response serialization
6. THE warp_routes macro SHALL convert AppError to HTTP status codes
7. WHEN endpoint Input is (), THE macro SHALL not expect request body

### Requirement 7: Tauri 宏生成

**User Story:** As a developer, I want a macro to generate Tauri commands from ApiEndpoint, so that I don't write boilerplate IPC code.

#### Acceptance Criteria

1. THE tauri_commands macro SHALL generate #[tauri::command] annotated functions
2. THE tauri_commands macro SHALL inject State<DatabaseConnection> automatically
3. THE tauri_commands macro SHALL deserialize input from IPC arguments
4. THE tauri_commands macro SHALL serialize output to IPC response
5. THE tauri_commands macro SHALL convert AppError to String for Tauri error handling
6. WHEN endpoint Input is (), THE macro SHALL generate function with no input parameter

### Requirement 8: 端点注册

**User Story:** As a developer, I want a simple way to register all endpoints, so that adding new endpoints is easy.

#### Acceptance Criteria

1. THE api-rust main.rs SHALL use warp_routes macro to register all endpoints
2. THE tauri lib.rs SHALL use tauri_commands macro to register all endpoints
3. WHEN a new endpoint is added to rust-core, THE developer SHALL only add one line in each main file
4. THE endpoint registration SHALL be type-safe at compile time

### Requirement 9: 错误处理一致性

**User Story:** As a developer, I want consistent error handling across Warp and Tauri, so that frontend receives predictable error responses.

#### Acceptance Criteria

1. THE AppError SHALL map to consistent HTTP status codes in Warp
2. THE AppError SHALL convert to descriptive strings in Tauri
3. THE error response format SHALL be identical between Warp and Tauri
4. WHEN database error occurs, THE system SHALL return appropriate error type

### Requirement 10: API 路径和命名一致性

**User Story:** As a developer, I want the API paths and command names to remain consistent, so that frontend integration is straightforward.

#### Acceptance Criteria

1. THE Warp API paths SHALL follow RESTful conventions (e.g., `/api/workspaces`, `/api/nodes/:id`)
2. THE Tauri command names SHALL use snake_case (e.g., `get_workspaces`, `create_node`)
3. THE request/response JSON format SHALL use camelCase for field names
4. THE endpoint naming SHALL be consistent between Warp paths and Tauri commands
