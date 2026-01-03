# Implementation Plan: Rust API Macro

## Overview

将 Rust 后端重构为基于 ApiEndpoint trait 和声明式宏的统一架构。Warp 和 Tauri 共享同一套 API 定义，通过宏自动生成边界代码。

## Tasks

- [x] 1. 创建 ApiEndpoint trait 和基础设施
  - [x] 1.1 创建 `rust-core/src/api/mod.rs`
    - 定义 ApiEndpoint trait
    - 定义 NoInput、NoOutput 类型别名
    - 导出所有端点模块
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 1.2 创建通用输入类型 `rust-core/src/api/inputs.rs`
    - 定义 IdInput、WorkspaceIdInput、ParentIdInput 等
    - _Requirements: 1.3_

- [x] 2. 实现 Workspace API 端点
  - [x] 2.1 创建 `rust-core/src/api/workspace.rs`
    - 实现 GetWorkspaces、GetWorkspace、CreateWorkspace、UpdateWorkspace、DeleteWorkspace
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 2.2 编写 Workspace 端点属性测试
    - **Property 1: CRUD Round-Trip Consistency (Workspace)**
    - **Validates: Requirements 2.1-2.5**

- [x] 3. 实现 Node API 端点
  - [x] 3.1 创建 `rust-core/src/api/node.rs`
    - 实现 GetNodesByWorkspace、GetNode、GetRootNodes、GetChildNodes
    - 实现 CreateNode、UpdateNode、MoveNode、DeleteNode
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [x] 3.2 编写 Node 端点属性测试
    - **Property 1: CRUD Round-Trip Consistency (Node)**
    - **Validates: Requirements 3.1-3.8**

- [x] 4. 实现 Content API 端点
  - [x] 4.1 创建 `rust-core/src/api/content.rs`
    - 实现 GetContent、SaveContent、GetContentVersion
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 4.2 编写 Content 端点属性测试
    - **Property 1: CRUD Round-Trip Consistency (Content)**
    - **Validates: Requirements 4.1-4.3**

- [x] 5. 实现事务端点
  - [x] 5.1 创建 `rust-core/src/api/transaction.rs`
    - 实现 CreateNodeWithContent（事务创建节点和内容）
    - 实现 DeleteNodeRecursive（事务删除节点及后代）
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 5.2 编写事务原子性属性测试
    - **Property 2: Transaction Atomicity**
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [x] 6. Checkpoint - 验证 API 端点编译
  - 运行 `cargo check -p rust-core`
  - 确保所有端点正确实现 ApiEndpoint trait
  - _Requirements: 1.1-1.6_

- [x] 7. 创建 Warp 宏
  - [x] 7.1 创建 `rust-core/src/macros/mod.rs`
    - 定义 warp_routes! 宏
    - 实现 with_db Filter
    - 实现 extract_input Filter
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_
  - [x] 7.2 创建 `rust-core/src/macros/rejection.rs`
    - 定义 AppRejection 类型
    - 实现 handle_rejection 函数
    - _Requirements: 6.6, 9.1_
  - [x] 7.3 编写 Warp 宏属性测试
    - **Property 3: Warp Handler Correctness**
    - **Validates: Requirements 6.2-6.6**

- [x] 8. 创建 Tauri 宏
  - [x] 8.1 更新 `rust-core/src/macros/mod.rs`
    - 定义 tauri_commands! 宏
    - 定义 tauri_invoke_handler! 辅助宏
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [x] 8.2 编写 Tauri 宏属性测试
    - **Property 4: Tauri Command Correctness**
    - **Validates: Requirements 7.3-7.5**

- [x] 9. Checkpoint - 验证宏编译
  - 运行 `cargo check -p rust-core`
  - 确保宏正确展开
  - _Requirements: 6.1, 7.1_

- [x] 10. 重构 api-rust 使用宏
  - [x] 10.1 更新 `apps/api-rust/src/main.rs`
    - 使用 warp_routes! 宏注册所有端点
    - 删除手写的 filters 和 handlers
    - _Requirements: 8.1_
  - [x] 10.2 删除 `apps/api-rust/src/filters/` 目录
    - 所有 filter 代码由宏生成
    - _Requirements: 8.1_
  - [x] 10.3 删除 `apps/api-rust/src/handlers/` 目录
    - 所有 handler 代码由宏生成
    - _Requirements: 8.1_

- [x] 11. 重构 Tauri 使用宏
  - [x] 11.1 更新 `apps/desktop/src-tauri/src/lib.rs`
    - 使用 tauri_commands! 宏注册所有端点
    - _Requirements: 8.2_
  - [x] 11.2 删除 `apps/desktop/src-tauri/src/commands/` 目录
    - 所有 command 代码由宏生成
    - _Requirements: 8.2_

- [x] 12. Checkpoint - 验证两端编译
  - 运行 `cargo check -p grain-api`
  - 运行 `cargo check -p grain`
  - _Requirements: 8.1, 8.2_

- [x] 13. 实现剩余端点
  - [x] 13.1 创建 `rust-core/src/api/tag.rs`
    - 实现 Tag CRUD 端点
    - _Requirements: 2.1-2.5 (类似模式)_
  - [x] 13.2 创建 `rust-core/src/api/user.rs`
    - 实现 User CRUD 端点
    - _Requirements: 2.1-2.5 (类似模式)_
  - [x] 13.3 创建 `rust-core/src/api/attachment.rs`
    - 实现 Attachment CRUD 端点
    - _Requirements: 2.1-2.5 (类似模式)_
  - [x] 13.4 创建 `rust-core/src/api/backup.rs`
    - 实现 Backup 端点
    - _Requirements: 2.1-2.5 (类似模式)_

- [x] 14. 错误处理一致性
  - [x] 14.1 更新 AppError 实现
    - 确保 Warp 和 Tauri 错误格式一致
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 14.2 编写错误处理属性测试
    - **Property 5: Error Handling Consistency**
    - **Validates: Requirements 9.1-9.4**

- [x] 15. JSON 序列化验证
  - [x] 15.1 编写 JSON 格式属性测试
    - **Property 6: JSON Serialization Format**
    - **Validates: Requirements 10.3**

- [x] 16. Checkpoint - 端到端验证
  - 启动 Warp 服务器：`bun run api-rust:dev`
  - 使用 curl 测试所有 API 端点
  - 验证响应格式正确
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 17. Final Checkpoint - 全面测试
  - 运行所有 Rust 测试：`cargo test --workspace`
  - 验证 Tauri Desktop 功能正常
  - 验证 Web API 功能正常
  - 确保所有测试通过（129 个测试全部通过）

## Notes

- 所有任务均为必需，包括属性测试
- 使用 proptest 进行属性测试
- 宏设计优先使用声明式宏 (macro_rules!)，如需更复杂功能再考虑过程宏
- 保持 API 路径和命令名与现有实现一致

## 完成总结

### 最终架构

```
apps/
├── api-rust/src/
│   └── main.rs              # 8 行代码，只调用 rust_core::server::run_server()
│
└── desktop/src-tauri/src/
    ├── lib.rs               # 10 行代码，只调用 rust_core::tauri::create_builder()
    └── main.rs              # 5 行代码，只调用 grain_lib::run()

packages/rust-core/src/
├── api/                     # API 端点定义（ApiEndpoint trait 实现）
├── db/                      # 数据库操作
├── fn/                      # 纯函数
├── macros/                  # Warp 和 Tauri 宏
├── server/                  # Warp 服务器（routes + warp_server）
├── tauri/                   # Tauri 应用（commands + mod）
├── types/                   # 类型定义
└── tests/                   # 测试
```

### 关键成果

1. **零代码边界**：api-rust 和 desktop 只有 main 函数调用 rust-core
2. **统一 API 定义**：所有端点通过 ApiEndpoint trait 定义
3. **代码复用**：Warp 和 Tauri 共享同一套业务逻辑
4. **129 个测试全部通过**
