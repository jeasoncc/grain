# 实现计划：函数式日志系统重构与代码库清理

## 概述

本实现计划将分阶段重构日志系统为函数式架构，同时清理代码库中的结构性问题。采用渐进式迁移策略，确保系统稳定性。

## 任务

- [-] 1. 清理重复目录结构和文件命名
- 删除重复的 flows/templated/templated/ 目录
- 将所有 .action.ts 文件重命名为 .flow.ts
- 更新相关的导入语句和文档
- _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_

- [ ]* 1.1 验证重复目录清理
  - **Property**: 文件系统检查重复目录不存在
  - **Validates: Requirements 4.1**

- [ ]* 1.2 验证文件重命名正确性
  - **Property**: 所有导入语句指向正确的 .flow.ts 文件
  - **Validates: Requirements 3.3**

- [ ] 2. 启用严格 TypeScript 检查
- [ ] 2.1 更新 tsconfig.json 配置
  - 设置 noUnusedLocals: true
  - 设置 noUnusedParameters: true
  - _Requirements: 5.1, 5.2_

- [ ] 2.2 清理未使用的变量和参数
  - 修复所有 TypeScript 严格检查错误
  - 移除未使用的导入和变量
  - _Requirements: 5.3, 5.4_

- [ ]* 2.3 验证严格检查通过
  - **Example**: TypeScript 编译无错误无警告
  - **Validates: Requirements 5.4, 5.5**

- [ ] 3. 设计新的函数式日志系统
- [ ] 3.1 创建日志类型定义
  - 定义 LogLevel、LogEntry、LogConfig 接口
  - 创建 AppError 日志相关错误类型
  - _Requirements: 1.1, 1.5_

- [ ] 3.2 实现日志格式化纯函数
  - 创建 pipes/log/log.format.pipe.ts
  - 实现 formatLogEntry、addConsoleColors、filterByLevel 函数
  - _Requirements: 1.4, 1.5_

- [ ]* 3.3 编写日志格式化属性测试
  - **Property 4: 日志级别区分性**
  - **Validates: Requirements 1.5**

- [ ] 4. 实现 SQLite 日志存储
- [ ] 4.1 设计 SQLite 日志表结构
  - 创建日志表 DDL
  - 添加性能优化索引
  - _Requirements: 2.1_

- [ ] 4.2 实现 Rust 后端日志 API
  - 创建 save_log_entry Tauri 命令
  - 创建 query_logs Tauri 命令
  - 创建 clear_old_logs Tauri 命令
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 4.3 验证 SQLite 表创建
  - **Example**: 应用启动时正确创建日志表
  - **Validates: Requirements 2.1**

- [ ] 4.4 实现前端日志存储 API
  - 创建 io/log/log.storage.api.ts
  - 实现 saveLogToSQLite、queryLogsFromSQLite 函数
  - _Requirements: 2.2, 2.3_

- [ ]* 4.5 编写 SQLite 存储属性测试
  - **Property 3: 双重输出一致性**
  - **Property 5: SQLite 查询一致性**
  - **Validates: Requirements 1.4, 2.2, 2.3**

- [ ] 5. 实现函数式日志 API
- [ ] 5.1 创建日志 API 接口
  - 创建 io/log/logger.api.ts
  - 实现 logDebug、logInfo、logWarn、logError、logSuccess 函数
  - _Requirements: 1.1, 1.5_

- [ ] 5.2 实现日志流程组合
  - 创建 flows/log/log.flow.ts
  - 实现 createLogFlow 高阶函数
  - _Requirements: 1.1, 1.2, 1.4_

- [ ]* 5.3 编写日志 API 属性测试
  - **Property 1: 日志记录 TaskEither 一致性**
  - **Property 2: 日志错误隔离性**
  - **Validates: Requirements 1.1, 1.2, 6.2, 6.3, 6.5**

- [ ] 6. 实现 IndexedDB 到 SQLite 迁移
- [ ] 6.1 创建迁移检测逻辑
  - 检查是否存在 IndexedDB 日志数据
  - 实现迁移状态管理
  - _Requirements: 8.1_

- [ ] 6.2 实现数据迁移流程
  - 读取 IndexedDB 中的所有日志
  - 批量写入到 SQLite
  - 提供迁移进度反馈
  - _Requirements: 2.5, 8.3_

- [ ]* 6.3 编写迁移功能测试
  - **Example**: IndexedDB 到 SQLite 完整迁移流程
  - **Validates: Requirements 2.5, 8.3**

- [ ] 6.4 实现迁移用户界面
  - 创建迁移向导组件
  - 支持用户选择跳过迁移
  - 显示迁移进度和结果
  - _Requirements: 8.2, 8.4_

- [ ]* 6.5 编写迁移 UI 测试
  - **Example**: 迁移向导正确显示和用户交互
  - **Validates: Requirements 8.1, 8.2, 8.4**

- [ ] 7. 性能优化实现
- [ ] 7.1 实现批量日志写入
  - 创建日志缓冲区机制
  - 实现批量写入策略
  - _Requirements: 7.1_

- [ ]* 7.2 编写批量写入属性测试
  - **Property 6: 批量写入优化**
  - **Validates: Requirements 7.1**

- [ ] 7.3 实现日志查询优化
  - 支持分页查询
  - 实现日志过滤功能
  - _Requirements: 7.2_

- [ ]* 7.4 编写查询优化属性测试
  - **Property 7: 分页查询正确性**
  - **Validates: Requirements 7.2**

- [ ] 7.5 实现异步日志处理
  - 确保日志操作不阻塞主线程
  - 实现日志队列机制
  - _Requirements: 7.3_

- [ ]* 7.6 编写异步性能属性测试
  - **Property 8: 异步非阻塞性**
  - **Validates: Requirements 7.3**

- [ ] 8. 实现自动清理和配置
- [ ] 8.1 实现自动日志清理
  - 监控日志存储大小
  - 自动清理旧日志条目
  - _Requirements: 7.4_

- [ ]* 8.2 编写自动清理属性测试
  - **Property 9: 自动清理触发**
  - **Validates: Requirements 7.4**

- [ ] 8.3 实现日志配置系统
  - 支持日志级别配置
  - 支持存储策略配置
  - _Requirements: 7.5_

- [ ]* 8.4 编写配置系统属性测试
  - **Property 10: 配置驱动行为**
  - **Validates: Requirements 7.5**

- [ ] 9. 渐进式迁移现有代码
- [ ] 9.1 创建兼容层
  - 提供向后兼容的 logger 接口
  - 支持新旧系统并行运行
  - _Requirements: 向后兼容性_

- [ ] 9.2 迁移核心模块
  - 迁移 flows/ 目录下的日志调用
  - 迁移 io/ 目录下的日志调用
  - _Requirements: 6.1_

- [ ] 9.3 迁移 UI 组件
  - 迁移 views/ 目录下的日志调用
  - 迁移 hooks/ 目录下的日志调用
  - _Requirements: 6.1_

- [ ] 10. 清理旧系统和 IndexedDB
- [ ] 10.1 移除旧日志系统
  - 删除 io/log/logger.ts（旧版本）
  - 删除 io/db/log-db.ts
  - _Requirements: 2.4_

- [ ] 10.2 移除 IndexedDB 依赖
  - 删除所有 Dexie 相关代码
  - 更新 package.json 移除 dexie 依赖
  - _Requirements: 2.4_

- [ ]* 10.3 验证 IndexedDB 完全移除
  - **Example**: 代码库中不存在 IndexedDB 相关引用
  - **Validates: Requirements 2.4**

- [ ] 11. 错误处理和容错机制
- [ ] 11.1 实现日志错误处理
  - 日志失败时的降级策略
  - 错误恢复和重试机制
  - _Requirements: 1.2, 6.5_

- [ ]* 11.2 编写错误处理测试
  - **Example**: 迁移失败时的错误处理
  - **Validates: Requirements 8.5**

- [ ] 12. 最终检查点 - 确保所有测试通过
- 确保所有测试通过，询问用户是否有问题

## 注意事项

- 标记为 `*` 的任务是可选的，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求以便追溯
- 检查点任务确保增量验证
- 属性测试验证通用正确性属性
- 示例测试验证特定场景和边界情况
- 渐进式迁移策略确保系统稳定性