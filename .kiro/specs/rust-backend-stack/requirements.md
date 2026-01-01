# 需求文档

## 简介

定义 Grain 项目 Rust 后端的技术栈选型，包括 ORM、加密、密钥管理、文件系统等核心库的选择和配置。本规范将作为 SQLite 迁移和后续 Rust 后端开发的技术基础。

## 术语表

- **SeaORM**: 异步优先的 Rust ORM 框架，基于 sqlx 构建，提供类型安全的查询 DSL
- **SQLCipher**: SQLite 的加密扩展，提供透明的数据库级 AES-256 加密
- **Keyring**: 跨平台系统密钥链访问库，支持 macOS Keychain、Windows Credential Manager、Linux Secret Service
- **Tauri_Command**: Tauri 框架中前端调用后端 Rust 函数的机制
- **proptest**: Rust 属性测试框架，用于生成随机测试数据验证程序正确性
- **Repository**: 数据访问层，封装所有数据库操作
- **Entity**: SeaORM 中的数据模型定义，对应数据库表

## 需求

### 需求 1: ORM 框架选型

**用户故事:** 作为开发者，我希望使用类型安全的 ORM 框架，以便减少手写 SQL 的错误并提高开发效率。

#### 验收标准

1. THE ORM_Framework SHALL 支持原生异步操作（async/await）
2. THE ORM_Framework SHALL 支持 SQLite 数据库
3. THE ORM_Framework SHALL 提供类型安全的查询构建器（Query Builder）
4. THE ORM_Framework SHALL 支持代码化数据库迁移（Migration）
5. THE ORM_Framework SHALL 支持与 serde 集成进行序列化/反序列化
6. THE ORM_Framework SHALL 支持关系映射（一对多、多对多）
7. WHEN 定义实体时，THE ORM_Framework SHALL 支持通过宏自动生成 CRUD 方法
8. THE ORM_Framework SHALL 支持事务操作（Transaction）
9. THE ORM_Framework SHALL 支持批量插入和更新操作

### 需求 2: 数据库加密

**用户故事:** 作为用户，我希望我的数据被加密存储，以便即使设备被他人访问，我的笔记和文档也能得到保护。

#### 验收标准

1. THE Database_Encryption SHALL 使用 AES-256 加密算法
2. THE Database_Encryption SHALL 支持透明加密（应用层无需感知）
3. WHEN 数据库文件被直接打开时，THE Database_Encryption SHALL 阻止未授权访问
4. THE Database_Encryption SHALL 支持密钥轮换
5. THE Database_Encryption SHALL 与选定的 ORM 框架兼容
6. THE Database_Encryption SHALL 支持配置加密参数（cipher_page_size、kdf_iter 等）

### 需求 3: 密钥管理

**用户故事:** 作为用户，我希望加密密钥被安全存储在系统密钥链中，以便密钥不会以明文形式存储在磁盘上。

#### 验收标准

1. THE Keyring_Service SHALL 支持 macOS Keychain
2. THE Keyring_Service SHALL 支持 Windows Credential Manager
3. THE Keyring_Service SHALL 支持 Linux Secret Service（GNOME Keyring）
4. WHEN 密钥不存在时，THE Keyring_Service SHALL 自动生成并安全存储新密钥
5. THE Keyring_Service SHALL 提供统一的跨平台 API
6. THE Keyring_Service SHALL 支持密钥的读取、写入和删除操作

### 需求 4: 异步运行时

**用户故事:** 作为开发者，我希望使用成熟的异步运行时，以便高效处理并发操作。

#### 验收标准

1. THE Async_Runtime SHALL 支持多线程调度
2. THE Async_Runtime SHALL 与 Tauri 框架兼容
3. THE Async_Runtime SHALL 与选定的 ORM 框架兼容
4. THE Async_Runtime SHALL 支持异步文件 I/O 操作
5. THE Async_Runtime SHALL 支持异步通道（Channel）用于跨线程通信

### 需求 5: 错误处理

**用户故事:** 作为开发者，我希望有统一的错误处理机制，以便错误信息清晰且易于调试。

#### 验收标准

1. THE Error_Handling SHALL 支持自定义错误类型派生
2. THE Error_Handling SHALL 支持错误链（Error Chaining）
3. THE Error_Handling SHALL 支持与 serde 集成进行错误序列化
4. THE Error_Handling SHALL 支持从标准库错误类型自动转换
5. THE Error_Types SHALL 包含：ValidationError、DatabaseError、NotFound、CryptoError、IoError、SerializationError、MigrationError
6. WHEN 错误发生时，THE Error_Handler SHALL 记录错误上下文信息

### 需求 6: 日志系统

**用户故事:** 作为开发者，我希望有结构化的日志系统，以便追踪和调试应用行为。

#### 验收标准

1. THE Logging_System SHALL 支持结构化日志
2. THE Logging_System SHALL 支持日志级别过滤（error、warn、info、debug、trace）
3. THE Logging_System SHALL 支持函数调用自动追踪（通过 #[instrument] 宏）
4. THE Logging_System SHALL 支持异步日志写入
5. THE Logging_System SHALL 支持日志输出到文件和控制台

### 需求 7: 文件系统操作

**用户故事:** 作为开发者，我希望有便捷的文件系统操作库，以便处理备份、导出等功能。

#### 验收标准

1. THE Filesystem_Library SHALL 支持递归目录遍历
2. THE Filesystem_Library SHALL 支持文件系统变更监听
3. THE Filesystem_Library SHALL 支持临时文件创建
4. THE Filesystem_Library SHALL 支持 ZIP 压缩/解压
5. WHEN 创建备份时，THE Filesystem_Library SHALL 支持复制加密数据库文件
6. WHEN 恢复备份时，THE Filesystem_Library SHALL 支持验证文件完整性

### 需求 8: 测试框架

**用户故事:** 作为开发者，我希望有完善的测试框架，以便验证代码正确性。

#### 验收标准

1. THE Testing_Framework SHALL 支持属性测试（Property-Based Testing）
2. THE Testing_Framework SHALL 支持异步测试
3. THE Testing_Framework SHALL 支持假数据生成
4. THE Testing_Framework SHALL 支持至少 100 次迭代的属性测试
5. THE Testing_Framework SHALL 支持内存数据库进行快速测试
6. THE Testing_Framework SHALL 支持临时文件进行文件系统相关测试

### 需求 9: 序列化

**用户故事:** 作为开发者，我希望有高效的序列化库，以便在前后端之间传输数据。

#### 验收标准

1. THE Serialization_Library SHALL 支持 JSON 序列化/反序列化
2. THE Serialization_Library SHALL 支持通过派生宏自动实现
3. THE Serialization_Library SHALL 支持字段重命名（camelCase/snake_case）
4. THE Serialization_Library SHALL 支持可选字段和默认值
5. FOR ALL 结构体，序列化后再反序列化 SHALL 产生等价数据（往返属性）

### 需求 10: 工具库

**用户故事:** 作为开发者，我希望有常用的工具库，以便处理 UUID、时间等常见需求。

#### 验收标准

1. THE Utility_Libraries SHALL 提供 UUID v4 生成功能
2. THE Utility_Libraries SHALL 提供时间处理功能（时区、ISO 8601 格式化）
3. THE Utility_Libraries SHALL 提供安全随机数生成功能
4. THE Utility_Libraries SHALL 与 serde 集成
5. THE Utility_Libraries SHALL 支持时间戳和日期字符串的相互转换

### 需求 11: Tauri 集成

**用户故事:** 作为开发者，我希望后端库能与 Tauri 框架无缝集成，以便前端可以通过 Commands 调用后端功能。

#### 验收标准

1. THE Tauri_Integration SHALL 支持 Tauri 2.x 版本
2. THE Tauri_Integration SHALL 支持异步 Commands
3. THE Tauri_Integration SHALL 支持 State 管理（依赖注入）
4. THE Tauri_Integration SHALL 支持插件系统（dialog、fs、shell 等）
5. WHEN Command 返回错误时，THE Tauri_Integration SHALL 将错误转换为前端可读的格式

### 需求 12: 数据库迁移工具

**用户故事:** 作为开发者，我希望有代码化的数据库迁移工具，以便版本控制数据库结构变更。

#### 验收标准

1. THE Migration_Tool SHALL 支持代码化迁移定义（Rust 代码而非 SQL 文件）
2. THE Migration_Tool SHALL 支持迁移版本追踪
3. THE Migration_Tool SHALL 支持迁移回滚
4. WHEN 应用启动时，THE Migration_Tool SHALL 自动执行未应用的迁移
5. THE Migration_Tool SHALL 支持在事务中执行迁移（失败时回滚）

### 需求 13: 依赖配置

**用户故事:** 作为开发者，我希望有清晰的依赖配置文档，以便快速搭建开发环境。

#### 验收标准

1. THE Cargo_Config SHALL 列出所有必需的依赖及其版本
2. THE Cargo_Config SHALL 列出所有必需的 feature flags
3. THE Cargo_Config SHALL 区分生产依赖和开发依赖
4. THE Cargo_Config SHALL 包含中文注释说明每个依赖的用途
