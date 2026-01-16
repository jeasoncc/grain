# 实施计划: Legacy Database Removal

## 概述

本实施计划将彻底移除 Grain 桌面应用中的所有 Dexie/IndexedDB 遗留代码，并将所有数据访问替换为 SQLite API 调用。实施将分阶段进行，确保每个步骤都能独立验证和测试。

## 任务

- [x] 1. 分析和准备阶段
  - 审查所有 Dexie 引用和依赖关系
  - 验证 SQLite API 的可用性和完整性
  - 创建测试基准以验证功能完整性
  - _需求: 1.1, 1.2, 6.1, 6.2, 6.3, 6.4_

- [x] 1.1 编写属性测试用于代码库 Dexie 清理验证
  - **属性 1: 代码库 Dexie 清理完整性**
  - **验证: 需求 1.2, 2.4, 3.3, 4.3, 5.3, 7.1, 7.3**

- [ ] 2. 替换备份功能中的 Dexie 调用
  - [x] 2.1 更新 `backup.flow.ts` 使用 SQLite createBackup API
    - 移除 `legacyDatabase` 导入
    - 替换 `createBackup` 函数实现
    - 使用 `api.createBackup()` 替代 Dexie 数据访问
    - _需求: 2.1_

  - [x] 2.2 更新 `backup.flow.ts` 使用 SQLite restoreBackup API
    - 替换 `restoreBackup` 和 `restoreBackupData` 函数
    - 使用 `api.restoreBackup()` 替代 Dexie 数据写入
    - _需求: 2.2_

  - [x] 2.3 编写属性测试用于 SQLite API 使用验证
    - **属性 2: SQLite API 使用一致性**
    - **验证: 需求 2.1, 2.2, 3.1, 6.1, 6.2, 6.3, 6.4**

  - [x] 2.4 更新 `clear-data.flow.ts` 移除 IndexedDB 清理
    - 移除 `clearIndexedDB` 函数
    - 保留 SQLite 清理调用
    - 简化清理逻辑
    - _需求: 2.4_

  - [x] 2.5 ESLint 检查备份模块
    - 运行 `bun run lint` 检查 `flows/backup/` 目录
    - 修复所有 ESLint 错误和警告
    - 确保代码质量符合项目标准
    - _需求: 所有备份相关需求_

- [x] 2.6 编写单元测试验证备份功能 ✅
  - 测试备份创建和恢复流程
  - 验证错误处理
  - _需求: 2.3_

- [ ] 3. 检查点 - 确保备份功能正常工作
  - 确保所有测试通过，如有问题请询问用户。

- [-] 4. 替换导出功能中的 Dexie 调用
  - [x] 4.1 更新 `export-project.flow.ts` 使用 SQLite API
    - 移除 `legacyDatabase` 导入
    - 替换 `getProjectContent` 函数使用 SQLite API
    - 使用 `getWorkspace`, `getNodesByWorkspace`, `getContentsByNodeIds`
    - _需求: 3.1_

  - [x] 4.2 验证导出数据格式兼容性
    - 确保导出格式与之前版本兼容
    - 测试导出文件的完整性
    - _需求: 3.2, 3.4_

  - [x] 4.3 ESLint 检查导出模块
    - 运行 `bun run lint` 检查 `flows/export/` 目录
    - 修复所有 ESLint 错误和警告
    - 确保代码质量符合项目标准
    - _需求: 所有导出相关需求_

  - [ ] 4.4 编写属性测试用于备份数据完整性
    - **属性 3: 备份数据完整性**
    - **验证: 需求 3.2, 3.4**

- [ ] 4.5 编写单元测试验证导出功能
  - 测试项目导出流程
  - 验证导出数据完整性
  - _需求: 3.3_

- [x] 5. 处理 Wiki 功能
  - [x] 5.1 评估 Wiki 功能使用情况
    - 检查 Wiki 功能是否仍在使用
    - 确定保留或移除策略
    - _需求: 4.1, 4.2_

  - [x] 5.2 更新或移除 `get-wiki-files.flow.ts`
    - 如果保留：替换 Dexie 调用为 SQLite API
    - 如果移除：删除文件和相关引用
    - _需求: 4.1, 4.2, 4.3_

  - [x] 5.3 更新或移除 `migrate-wiki.flow.ts`
    - 如果保留：替换 Dexie 调用为 SQLite API
    - 如果移除：删除文件和相关引用
    - _需求: 4.1, 4.2, 4.3_

  - [x] 5.4 编写属性测试用于 Wiki 代码清理验证
    - **属性 6: Wiki 代码清理一致性**
    - **验证: 需求 4.1, 4.2, 4.4**

  - [x] 5.5 ESLint 检查 Wiki 模块
    - 运行 `bun run lint` 检查 `flows/wiki/` 目录
    - 修复所有 ESLint 错误和警告
    - 确保代码质量符合项目标准
    - _需求: 所有 Wiki 相关需求_

- [x] 6. 清理迁移系统中的 Dexie 引用
  - [x] 6.1 更新 `dexie-to-sqlite.migration.fn.ts`
    - 移除 Dexie 数据检查逻辑 (`hasDexieData`)
    - 移除 Dexie 数据清理逻辑 (`clearDexieData`)
    - 简化迁移状态管理
    - _需求: 5.1, 5.2, 5.3_

  - [x] 6.2 更新迁移日志消息
    - 修改日志消息反映仅使用 SQLite 的架构
    - 移除 Dexie 相关的日志信息
    - _需求: 5.4_

  - [x] 6.3 编写属性测试用于迁移系统 SQLite 依赖验证
    - **属性 5: 迁移系统 SQLite 依赖**
    - **验证: 需求 5.2, 5.4**

  - [x] 6.4 ESLint 检查迁移模块
    - 运行 `bun run lint` 检查 `flows/migration/` 目录
    - 修复所有 ESLint 错误和警告
    - 确保代码质量符合项目标准
    - _需求: 所有迁移相关需求_

- [ ] 7. 检查点 - 确保核心功能替换完成
  - 确保所有测试通过，如有问题请询问用户。

- [ ] 8. 完全移除 Dexie 代码和依赖
  - [ ] 8.1 删除 `legacy-database.ts` 文件
    - 删除 `src/io/db/legacy-database.ts`
    - _需求: 1.1, 6.1_

  - [ ] 8.2 更新 `src/io/db/index.ts`
    - 移除 `LegacyDatabase` 和 `legacyDatabase` 导出
    - 清理相关类型导出
    - _需求: 1.2, 6.2_

  - [ ] 8.3 从 package.json 移除 Dexie 依赖
    - 移除 `dexie` 包依赖
    - 运行 `bun install` 清理 lock 文件
    - _需求: 1.3, 6.3_

  - [ ] 8.4 编写属性测试用于运行时 IndexedDB 隔离验证
    - **属性 4: 运行时 IndexedDB 隔离**
    - **验证: 需求 1.4, 5.1**

  - [ ] 8.5 ESLint 检查数据库模块
    - 运行 `bun run lint` 检查 `io/db/` 目录
    - 修复所有 ESLint 错误和警告
    - 确保代码质量符合项目标准
    - _需求: 所有数据库相关需求_

- [ ] 9. 清理测试中的 Dexie 模拟和引用
  - [ ] 9.1 更新 `dexie-to-sqlite.migration.fn.test.ts`
    - 移除 `mockLegacyDatabase` 模拟
    - 移除 Dexie 相关的测试用例
    - 更新测试以验证 SQLite API 使用
    - _需求: 7.1, 7.2_

  - [ ] 9.2 搜索并清理其他测试文件中的 Dexie 引用
    - 搜索所有 `.test.ts` 文件中的 Dexie 引用
    - 移除或更新相关测试代码
    - _需求: 7.3_

  - [ ] 9.3 编写属性测试用于测试套件 SQLite 验证
    - **属性 7: 测试套件 SQLite 验证**
    - **验证: 需求 7.2, 7.4**

  - [ ] 9.4 ESLint 检查测试文件
    - 运行 `bun run lint` 检查所有更新的测试文件
    - 修复所有 ESLint 错误和警告
    - 确保测试代码质量符合项目标准
    - _需求: 所有测试相关需求_

- [ ] 10. 验证和测试
  - [ ] 10.1 运行完整测试套件
    - 执行所有单元测试
    - 执行所有属性测试
    - 确保所有测试通过
    - _需求: 7.4_

  - [ ] 10.2 执行功能验证测试
    - 测试应用启动
    - 测试备份和恢复功能
    - 测试项目导出功能
    - 测试数据操作功能
    - _需求: 8.1, 8.2, 8.3_

  - [ ] 10.3 编写属性测试用于功能完整性验证
    - **属性 8: 功能完整性保持**
    - **验证: 需求 8.1, 8.2, 8.3, 8.4**

  - [ ] 10.4 最终 ESLint 全面检查
    - 运行 `bun run lint` 检查整个项目
    - 修复所有 ESLint 错误和警告
    - 确保整个代码库质量符合项目标准
    - 验证没有遗留的技术债务
    - _需求: 所有需求_

- [ ] 11. 最终检查点 - 确保所有功能正常
  - 确保所有测试通过，应用运行正常，ESLint 检查全部通过，如有问题请询问用户。

## 注意事项

- 每个任务都引用了具体的需求以便追溯
- 检查点确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证特定示例和边缘情况
- 所有任务都是必需的，确保从一开始就有全面的质量保证
- **ESLint 检查**: 每完成一个模块就立即进行 ESLint 检查，修复所有错误和警告，绝不留技术债务
- **代码质量**: 所有代码必须符合项目的 ESLint 规则和代码标准