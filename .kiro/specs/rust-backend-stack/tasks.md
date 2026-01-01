# 实现任务

## 任务概览

基于需求文档和设计文档，将 Rust 后端技术栈实现分解为以下任务。任务按依赖顺序排列，前置任务完成后才能开始后续任务。

## 任务列表

### 任务 1: 项目基础配置 ✅

**描述:** 配置 Cargo.toml 依赖和项目基础结构

**需求映射:** 需求 13 (依赖配置)

**验收标准:**
- [x] Cargo.toml 包含所有必需依赖（SeaORM、tokio、serde、thiserror 等）
- [x] 所有依赖版本固定，feature flags 正确配置
- [x] 项目目录结构按 design.md 创建（types/、entity/、migration/、repo/、services/、commands/）
- [ ] `cargo check` 通过，无编译错误

**依赖任务:** 无

---

### 任务 2: 错误类型定义 ✅

**描述:** 实现统一的错误处理类型

**需求映射:** 需求 5 (错误处理)

**验收标准:**
- [x] 创建 `types/error.rs`，定义 `AppError` 枚举
- [x] 包含所有错误变体：ValidationError、DatabaseError、NotFound、CryptoError、IoError、SerializationError、MigrationError、KeyringError
- [x] 实现 `From` trait 自动转换：`sea_orm::DbErr`、`std::io::Error`、`serde_json::Error`、`keyring::Error`
- [x] 定义 `AppResult<T>` 类型别名
- [x] 错误类型支持 `Serialize`（用于前端传输）

**依赖任务:** 任务 1

---

### 任务 3: 日志系统配置 ✅

**描述:** 配置 tracing 日志系统

**需求映射:** 需求 6 (日志系统)

**验收标准:**
- [x] 创建 `lib.rs` 中的日志初始化函数
- [x] 支持日志级别过滤（通过环境变量 `RUST_LOG`）
- [x] 开发环境输出到控制台，生产环境输出到文件
- [x] 日志格式包含时间戳、级别、模块路径
- [ ] 验证 `#[instrument]` 宏可用于函数追踪

**依赖任务:** 任务 1

---

### 任务 4: 密钥管理服务 ✅

**描述:** 实现跨平台密钥链访问服务

**需求映射:** 需求 3 (密钥管理)

**验收标准:**
- [x] 创建 `services/crypto_service.rs`
- [x] 实现 `get_or_create_key()` 函数：获取现有密钥或生成新密钥
- [x] 实现 `generate_key()` 函数：生成 256 位随机密钥（Base64 编码）
- [x] 实现 `delete_key()` 函数：删除密钥（用于重置）
- [ ] 在 Linux 上测试 GNOME Keyring 集成
- [x] 错误正确转换为 `AppError::KeyringError`

**依赖任务:** 任务 2

---

### 任务 5: 数据库连接管理 ✅

**描述:** 实现 SQLCipher 加密数据库连接

**需求映射:** 需求 2 (数据库加密), 需求 4 (异步运行时)

**验收标准:**
- [x] 创建 `db/connection.rs`
- [x] 实现 `connect()` 函数：创建加密数据库连接
- [ ] 从 `CryptoService` 获取加密密钥 (SQLCipher 待启用)
- [ ] 配置 SQLCipher 参数：cipher_page_size=4096, kdf_iter=256000 (SQLCipher 待启用)
- [x] 配置连接池：max_connections=5, idle_timeout=300s
- [x] 实现 `get_db_path()` 函数：获取数据库文件路径
- [ ] 验证加密数据库无法被 sqlite3 直接打开 (SQLCipher 待启用)

**依赖任务:** 任务 4

---

### 任务 6: SeaORM 实体定义 ✅

**描述:** 定义数据库实体模型

**需求映射:** 需求 1 (ORM 框架选型)

**验收标准:**
- [x] 创建 `entity/mod.rs` 导出所有实体
- [x] 创建 `entity/workspace.rs`：Workspace 实体（id, name, created_at, updated_at）
- [x] 创建 `entity/node.rs`：Node 实体（id, workspace_id, parent_id, title, node_type, is_collapsed, sort_order, created_at, updated_at）
- [x] 创建 `entity/content.rs`：Content 实体（id, node_id, content, version, created_at, updated_at）
- [x] 定义 `NodeType` 枚举：Folder, File, Diary, Drawing, Canvas
- [x] 定义实体间关系：Workspace -> Node (一对多), Node -> Content (一对一), Node -> Node (自引用)
- [x] 所有实体支持 `Serialize`/`Deserialize`

**依赖任务:** 任务 1

---

### 任务 7: 数据库迁移 ✅

**描述:** 实现数据库迁移脚本

**需求映射:** 需求 12 (数据库迁移工具)

**验收标准:**
- [x] 创建 `migration/mod.rs` 导出迁移器
- [x] 创建 `m20240101_000001_create_workspace.rs`：创建 workspaces 表
- [x] 创建 `m20240101_000002_create_node.rs`：创建 nodes 表，包含外键和索引
- [x] 创建 `m20240101_000003_create_content.rs`：创建 contents 表
- [x] 实现 `up()` 和 `down()` 方法
- [x] 创建索引：idx_node_workspace, idx_node_parent, idx_content_node
- [ ] 验证迁移可以正确执行和回滚

**依赖任务:** 任务 6

---

### 任务 8: Repository 层实现 ✅

**描述:** 实现数据访问层

**需求映射:** 需求 1 (ORM 框架选型)

**验收标准:**
- [x] 创建 `repo/mod.rs` 导出所有 Repository
- [x] 创建 `repo/workspace_repo.rs`：find_by_id, find_all, create, update, delete
- [x] 创建 `repo/node_repo.rs`：find_by_id, find_by_workspace, find_children, create, update, delete, move_node
- [x] 创建 `repo/content_repo.rs`：find_by_node_id, create, update, delete
- [x] 所有方法返回 `AppResult<T>`
- [x] 删除操作验证记录存在，不存在返回 `NotFound` 错误
- [x] 使用 tracing 记录关键操作日志

**依赖任务:** 任务 6, 任务 2

---

### 任务 9: 服务层实现 ✅

**描述:** 实现业务逻辑服务

**需求映射:** 需求 1 (ORM 框架选型), 需求 7 (文件系统操作)

**验收标准:**
- [x] 创建 `services/mod.rs` 导出所有服务
- [x] 创建 `services/node_service.rs`：封装节点相关业务逻辑（创建带内容的节点、级联删除等）
- [x] 创建 `services/backup_service.rs`：实现备份和恢复功能
- [x] 备份服务支持：创建 ZIP 备份、恢复备份、列出备份文件
- [x] 备份文件命名格式：`grain-backup-{timestamp}.zip`
- [x] 恢复前验证备份文件完整性

**依赖任务:** 任务 8, 任务 5

---

### 任务 10: Tauri Commands 实现 ✅

**描述:** 实现前端可调用的 Tauri Commands

**需求映射:** 需求 11 (Tauri 集成)

**验收标准:**
- [x] 创建 `commands/mod.rs` 导出所有 Commands
- [x] 创建 `commands/workspace_commands.rs`：get_workspaces, create_workspace, delete_workspace
- [x] 创建 `commands/node_commands.rs`：get_nodes_by_workspace, create_node, update_node, delete_node, move_node
- [x] 创建 `commands/content_commands.rs`：get_content, save_content
- [x] 创建 `commands/backup_commands.rs`：create_backup, restore_backup, list_backups
- [x] 所有 Commands 使用 `State<DatabaseConnection>` 注入数据库连接
- [x] 请求/响应结构体使用 camelCase 命名（`#[serde(rename_all = "camelCase")]`）
- [x] 错误转换为 `String` 返回给前端

**依赖任务:** 任务 9

---

### 任务 11: Tauri 应用配置 ✅

**描述:** 配置 Tauri 应用入口和状态管理

**需求映射:** 需求 11 (Tauri 集成)

**验收标准:**
- [x] 更新 `lib.rs`：配置 Tauri Builder
- [x] 注册所有 Commands
- [x] 配置 State 管理：注入 `DatabaseConnection`
- [x] 应用启动时自动执行数据库迁移
- [x] 配置 Tauri 插件：dialog, fs, shell
- [x] 更新 `main.rs`：调用 `lib.rs` 中的 run 函数

**依赖任务:** 任务 10, 任务 7

---

### 任务 12: 单元测试

**描述:** 编写核心模块的单元测试

**需求映射:** 需求 8 (测试框架)

**验收标准:**
- [ ] 为 `CryptoService` 编写测试：密钥生成、存储、读取
- [ ] 为 `NodeRepo` 编写属性测试：创建后查询返回相同数据
- [ ] 为 `ContentRepo` 编写测试：版本号递增
- [ ] 使用内存数据库（`sqlite::memory:`）进行快速测试
- [ ] 使用 `fake` 库生成测试数据
- [ ] 属性测试至少 100 次迭代

**依赖任务:** 任务 8

---

### 任务 13: 集成测试

**描述:** 编写端到端集成测试

**需求映射:** 需求 8 (测试框架)

**验收标准:**
- [ ] 创建 `tests/integration_test.rs`
- [ ] 测试完整流程：创建工作区 -> 创建节点 -> 保存内容 -> 查询验证
- [ ] 测试备份恢复流程：创建数据 -> 备份 -> 删除数据 -> 恢复 -> 验证
- [ ] 测试加密数据库：验证数据库文件无法被直接读取
- [ ] 使用临时目录进行文件系统相关测试
- [ ] 所有测试通过 `cargo test`

**依赖任务:** 任务 11

---

### 任务 14: 前端类型定义 ✅

**描述:** 生成前端 TypeScript 类型定义

**需求映射:** 需求 9 (序列化)

**验收标准:**
- [x] 创建 `apps/desktop/src/types/rust-api.ts`：定义与 Rust 后端对应的 TypeScript 类型
- [x] 定义请求类型：CreateWorkspaceRequest, CreateNodeRequest, SaveContentRequest 等
- [x] 定义响应类型：WorkspaceResponse, NodeResponse, ContentResponse 等
- [x] 类型命名使用 camelCase，与 Rust 端 serde 配置一致
- [x] 添加 JSDoc 注释说明每个字段

**依赖任务:** 任务 10

---

### 任务 15: 前端 API 封装 ✅

**描述:** 封装前端调用 Rust 后端的 API 函数

**需求映射:** 需求 11 (Tauri 集成)

**验收标准:**
- [x] 创建 `apps/desktop/src/db/rust-api.fn.ts`：封装所有 Tauri invoke 调用
- [x] 使用 fp-ts `TaskEither` 封装异步操作
- [x] 错误转换为 `AppError` 类型
- [x] 导出函数：getWorkspaces, createWorkspace, getNodesByWorkspace, createNode, saveContent 等
- [x] 添加 tracing 日志（使用 consola）

**依赖任务:** 任务 14

---

### 任务 16: 文档更新 ✅

**描述:** 更新项目文档

**需求映射:** 所有需求

**验收标准:**
- [x] 更新 `.kiro/steering/tech.md`：添加 Rust 后端技术栈信息
- [ ] 更新 `.kiro/steering/structure.md`：添加 src-tauri/src 目录结构
- [x] 创建 `docs/rust-backend-guide.md`：Rust 后端开发指南
- [x] 文档包含：环境配置、开发流程、测试方法、常见问题

**依赖任务:** 任务 13

---

## 任务依赖图

```
任务 1 (项目基础配置)
    │
    ├──▶ 任务 2 (错误类型定义)
    │        │
    │        └──▶ 任务 4 (密钥管理服务)
    │                 │
    │                 └──▶ 任务 5 (数据库连接管理)
    │                          │
    │                          └──▶ 任务 9 (服务层实现)
    │
    ├──▶ 任务 3 (日志系统配置)
    │
    └──▶ 任务 6 (SeaORM 实体定义)
             │
             ├──▶ 任务 7 (数据库迁移)
             │        │
             │        └──▶ 任务 11 (Tauri 应用配置)
             │                 │
             │                 └──▶ 任务 13 (集成测试)
             │                          │
             │                          └──▶ 任务 16 (文档更新)
             │
             └──▶ 任务 8 (Repository 层实现)
                      │
                      ├──▶ 任务 9 (服务层实现)
                      │        │
                      │        └──▶ 任务 10 (Tauri Commands 实现)
                      │                 │
                      │                 ├──▶ 任务 11 (Tauri 应用配置)
                      │                 │
                      │                 └──▶ 任务 14 (前端类型定义)
                      │                          │
                      │                          └──▶ 任务 15 (前端 API 封装)
                      │
                      └──▶ 任务 12 (单元测试)
```

## 里程碑

### 里程碑 1: 基础设施就绪
- 完成任务 1-5
- 预计时间: 2 天
- 交付物: 可连接加密数据库的基础框架

### 里程碑 2: 数据层完成
- 完成任务 6-8
- 预计时间: 3 天
- 交付物: 完整的实体定义、迁移脚本、Repository 层

### 里程碑 3: 后端 API 完成
- 完成任务 9-11
- 预计时间: 2 天
- 交付物: 可被前端调用的完整 Tauri Commands

### 里程碑 4: 测试与集成
- 完成任务 12-15
- 预计时间: 3 天
- 交付物: 测试覆盖、前端类型定义和 API 封装

### 里程碑 5: 文档与收尾
- 完成任务 16
- 预计时间: 1 天
- 交付物: 完整的开发文档
