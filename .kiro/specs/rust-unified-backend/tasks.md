# Implementation Plan: Rust Unified Backend

## Overview

将 Rust 后端重构为三层架构：rust-core 共享 crate、Tauri 薄层、Warp HTTP 服务器。前端使用高阶函数创建统一 API 客户端。

## Tasks

- [x] 1. 创建 rust-core 共享 crate 基础结构
  - [x] 1.1 创建 `packages/rust-core/` 目录和 Cargo.toml
    - 配置 crate 名称、版本、依赖
    - 添加 sea-orm、serde、thiserror、uuid、chrono、tokio 依赖
    - _Requirements: 1.1, 1.7_
  - [x] 1.2 创建 `src/lib.rs` 公共 API 导出
    - 定义模块结构：types、db、fn
    - 重新导出所有公共类型
    - _Requirements: 1.5_
  - [x] 1.3 创建 `src/types/error.rs` 统一错误类型
    - 定义 AppError 枚举（NotFound、ValidationError、DatabaseError、Unauthorized、InternalError）
    - 实现 status_code() 方法
    - _Requirements: 5.1_
  - [x] 1.4 编写 AppError 单元测试
    - **Property 6: HTTP Status Code Mapping**
    - **Validates: Requirements 3.8**

- [x] 2. 迁移类型定义到 rust-core
  - [x] 2.1 迁移 workspace 类型
    - 复制 `src-tauri/src/types/workspace/` 到 `rust-core/src/types/workspace/`
    - 更新 mod.rs 导出
    - _Requirements: 1.2, 1.6_
  - [x] 2.2 迁移 node 类型
    - 复制 `src-tauri/src/types/node/` 到 `rust-core/src/types/node/`
    - _Requirements: 1.2_
  - [x] 2.3 迁移 content 类型
    - 复制 `src-tauri/src/types/content/` 到 `rust-core/src/types/content/`
    - _Requirements: 1.2_
  - [x] 2.4 迁移 tag、user、attachment 类型
    - 复制剩余类型目录
    - _Requirements: 1.2_
  - [x] 2.5 创建 `src/types/mod.rs` 统一导出
    - 重新导出所有类型
    - _Requirements: 1.5_
  - [ ] 2.6 编写类型序列化属性测试
    - **Property 2: JSON Serialization Round-Trip**
    - **Validates: Requirements 3.4, 8.1, 8.2**

- [x] 3. 迁移数据库函数到 rust-core
  - [x] 3.1 迁移 connection.rs
    - 复制数据库连接管理代码
    - 添加可配置数据库路径支持
    - _Requirements: 6.1, 6.2_
  - [x] 3.2 迁移 workspace_db_fn.rs
    - 复制工作区数据库操作函数
    - _Requirements: 1.3_
  - [x] 3.3 迁移 node_db_fn.rs
    - 复制节点数据库操作函数
    - _Requirements: 1.3_
  - [x] 3.4 迁移 content_db_fn.rs
    - 复制内容数据库操作函数
    - _Requirements: 1.3_
  - [x] 3.5 迁移 tag_db_fn.rs、user_db_fn.rs、attachment_db_fn.rs
    - 复制剩余数据库操作函数
    - _Requirements: 1.3_
  - [x] 3.6 创建 `src/db/mod.rs` 统一导出
    - 重新导出所有数据库函数
    - _Requirements: 1.5_

- [ ] 4. 迁移纯函数到 rust-core
  - [ ] 4.1 迁移 `src-tauri/src/fn/` 目录
    - 复制所有纯函数
    - _Requirements: 1.4_
  - [ ] 4.2 创建 `src/fn/mod.rs` 统一导出
    - _Requirements: 1.5_

- [x] 5. Checkpoint - 验证 rust-core 编译
  - 运行 `cargo check -p rust-core`
  - 确保所有模块正确导出
  - 确保无 Tauri/Warp 依赖
  - _Requirements: 1.7_

- [ ] 6. 重构 Tauri Commands 为薄层
  - [ ] 6.1 更新 `src-tauri/Cargo.toml` 依赖 rust-core
    - 添加 `rust-core = { path = "../../../packages/rust-core" }`
    - _Requirements: 2.4_
  - [ ] 6.2 重构 workspace_commands.rs
    - 移除业务逻辑，改为调用 rust_core
    - 保持命令名称和签名不变
    - _Requirements: 2.1, 2.3, 2.5_
  - [ ] 6.3 重构 node_commands.rs
    - 移除业务逻辑，改为调用 rust_core
    - _Requirements: 2.1_
  - [ ] 6.4 重构 content_commands.rs
    - 移除业务逻辑，改为调用 rust_core
    - _Requirements: 2.1_
  - [ ] 6.5 重构 tag_commands.rs、user_commands.rs、attachment_commands.rs
    - 移除业务逻辑，改为调用 rust_core
    - _Requirements: 2.1_
  - [ ] 6.6 重构 backup_commands.rs、file_commands.rs
    - 移除业务逻辑，改为调用 rust_core
    - _Requirements: 2.1_
  - [ ] 6.7 更新 lib.rs 导入
    - 从 rust_core 导入类型
    - _Requirements: 2.1_
  - [ ] 6.8 编写 Tauri Commands 委托测试
    - **Property 1: Tauri Commands Delegation**
    - **Validates: Requirements 2.1**

- [ ] 7. Checkpoint - 验证 Tauri 编译和运行
  - 运行 `cargo check -p grain`
  - 运行 `bun run desktop:dev` 验证功能正常
  - _Requirements: 2.3_

- [ ] 8. 创建 Warp HTTP 服务器
  - [ ] 8.1 创建 `apps/api-rust/` 目录和 Cargo.toml
    - 配置依赖：rust-core、warp、tokio、serde、tracing
    - _Requirements: 3.1_
  - [ ] 8.2 创建 `src/main.rs` 入口点
    - 初始化日志、配置、数据库连接
    - 构建路由树并启动服务器
    - _Requirements: 3.7, 7.3_
  - [ ] 8.3 创建 `src/rejection.rs` 错误处理
    - 定义 AppRejection 类型
    - 实现 handle_rejection 函数
    - _Requirements: 3.8, 5.3_
  - [ ] 8.4 编写错误处理属性测试
    - **Property 3: Error Handling Consistency**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [ ] 9. 创建 Warp Filters（Filter 组合子模式）
  - [ ] 9.1 创建 `src/filters/mod.rs` 和通用 Filter
    - 定义 with_db Filter
    - _Requirements: 3.3_
  - [ ] 9.2 创建 `src/filters/workspace_filters.rs`
    - 使用 `and()`, `or()` 组合子构建路由
    - GET/POST/PUT/DELETE /api/workspaces
    - _Requirements: 3.2, 3.3_
  - [ ] 9.3 创建 `src/filters/node_filters.rs`
    - Node 相关路由
    - _Requirements: 3.2_
  - [ ] 9.4 创建 `src/filters/content_filters.rs`
    - Content 相关路由
    - _Requirements: 3.2_
  - [ ] 9.5 创建 `src/filters/tag_filters.rs`、`user_filters.rs`、`attachment_filters.rs`
    - 剩余实体路由
    - _Requirements: 3.2_
  - [ ] 9.6 创建 `src/filters/backup_filters.rs`
    - Backup 相关路由
    - _Requirements: 3.2_

- [ ] 10. 创建 Warp Handlers
  - [ ] 10.1 创建 `src/handlers/mod.rs`
    - _Requirements: 3.5_
  - [ ] 10.2 创建 `src/handlers/workspace_handlers.rs`
    - 调用 rust_core 函数
    - _Requirements: 3.5_
  - [ ] 10.3 创建 `src/handlers/node_handlers.rs`
    - _Requirements: 3.5_
  - [ ] 10.4 创建 `src/handlers/content_handlers.rs`
    - _Requirements: 3.5_
  - [ ] 10.5 创建剩余 handlers
    - tag、user、attachment、backup handlers
    - _Requirements: 3.5_

- [ ] 11. 配置 CORS 和日志
  - [ ] 11.1 添加 CORS 支持
    - 使用 `warp::cors()` 配置
    - _Requirements: 3.6_
  - [ ] 11.2 添加请求日志
    - 使用 `warp::log()` 记录请求
    - _Requirements: 7.2_

- [ ] 12. Checkpoint - 验证 Warp 服务器
  - 运行 `cargo run -p api-rust`
  - 使用 curl 测试 API 端点
  - _Requirements: 3.4_

- [ ] 13. 创建前端统一 API 客户端
  - [ ] 13.1 创建 `apps/desktop/src/db/api-client.fn.ts`
    - 实现环境检测（isTauri）
    - 实现 invokeTE 和 fetchTE 封装
    - _Requirements: 4.1, 4.2_
  - [ ] 13.2 实现 createApiClient 高阶函数
    - 返回统一 API 接口
    - 所有方法返回 TaskEither
    - _Requirements: 4.1, 4.3_
  - [ ] 13.3 实现 Workspace API 方法
    - getWorkspaces、getWorkspace、createWorkspace、updateWorkspace、deleteWorkspace
    - _Requirements: 4.4, 4.5, 4.6_
  - [ ] 13.4 实现 Node API 方法
    - getNodesByWorkspace、getNode、createNode、updateNode、moveNode、deleteNode
    - _Requirements: 4.4_
  - [ ] 13.5 实现 Content API 方法
    - getContent、saveContent
    - _Requirements: 4.4_
  - [ ] 13.6 实现 Backup API 方法
    - createBackup、listBackups
    - _Requirements: 4.4_
  - [ ] 13.7 导出单例客户端
    - `export const api = createApiClient()`
    - _Requirements: 4.7_
  - [ ] 13.8 编写 API Client 属性测试
    - **Property 4: API Client Signature Consistency**
    - **Validates: Requirements 4.3, 4.4**

- [ ] 14. 迁移现有代码使用新 API 客户端
  - [ ] 14.1 更新 `workspace.repo.fn.ts`
    - 从 `api-client.fn.ts` 导入
    - _Requirements: 4.8_
  - [ ] 14.2 更新其他 repo 文件
    - 使用新的 api 客户端
    - _Requirements: 4.8_
  - [ ] 14.3 删除旧的 `rust-api.fn.ts`（可选，保留兼容）
    - _Requirements: 4.8_

- [ ] 15. 配置开发脚本
  - [ ] 15.1 更新 `package.json` 添加 api-rust 脚本
    - `api-rust:dev`: `cargo watch -x 'run -p api-rust'`
    - `api-rust:build`: `cargo build -p api-rust --release`
    - _Requirements: 7.1, 7.4, 7.5_
  - [ ] 15.2 配置环境变量
    - 添加 `VITE_API_URL` 环境变量
    - _Requirements: 6.4_

- [ ] 16. Checkpoint - 端到端验证
  - 启动 Warp 服务器：`bun run api-rust:dev`
  - 启动 Web 应用：`bun run web:dev`
  - 验证 Web 应用能正常调用 API
  - _Requirements: 4.5, 4.6_

- [ ] 17. 数据库一致性验证
  - [ ] 17.1 编写数据库 Schema 一致性测试
    - **Property 5: Database Schema Consistency**
    - **Validates: Requirements 6.5**

- [ ] 18. Final Checkpoint - 全面测试
  - 运行所有 Rust 测试：`cargo test --workspace`
  - 运行前端测试：`bun run test`
  - 验证 Tauri Desktop 功能正常
  - 验证 Web 功能正常
  - 确保所有测试通过

## Notes

- 所有任务都是必需的，包括测试任务
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- 使用 Rust 原生函数式特性（Option、Result、Iterator 组合子），不引入额外 FP 库

