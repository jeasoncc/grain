# Implementation Plan: Desktop Codebase Cleanup

## Overview

分阶段清理 desktop 应用中的冗余代码，每阶段独立验证确保不破坏现有功能。

## Tasks

- [ ] 1. 删除空兼容层文件
  - [x] 1.1 删除 `io/db/index.ts`
    - 空文件，只有注释说明数据已迁移到 SQLite
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 删除 `utils/error.util.ts`
    - 仅重导出 `@/types/error`，无导入
    - _Requirements: 1.1, 1.2_
  - [x] 1.3 删除 `utils/save-service-manager.util.ts`
    - 空导出，无导入
    - _Requirements: 1.1, 1.2_
  - [x] 1.4 删除 `hooks/use-theme-dom.ts`
    - 仅重导出 `@/io/dom/theme.dom`，无导入
    - _Requirements: 1.1, 1.2_
  - [x] 1.5 删除 `views/ledger/index.ts`
    - 仅重导出 `@/pipes/ledger`，无导入
    - 同时删除整个 `views/ledger/` 目录（只有这一个文件）
    - _Requirements: 1.1, 1.2_
  - [x] 1.6 删除 `views/editor/index.ts`
    - 仅重导出 `@/pipes/editor`，无导入
    - 保留目录中的其他文件
    - _Requirements: 1.1, 1.2_
  - [x] 1.7 删除 `views/icon-theme/index.ts`
    - 仅重导出 `@/pipes/icon-theme`，无导入
    - 保留目录中的其他文件
    - _Requirements: 1.1, 1.2_
  - [x] 1.8 删除 `pipes/export/export.download.fn.ts`
    - 仅重导出 `@/io/file/download.file`，无导入
    - _Requirements: 1.1, 1.2_
  - [x] 1.9 删除 `pipes/export/export.path.fn.ts`
    - 空导出，无导入
    - _Requirements: 1.1, 1.2_
  - [x] 1.10 删除 `pipes/search/search.engine.fn.ts` 和测试文件
    - 空导出，无导入
    - 同时删除 `search.engine.fn.test.ts`
    - _Requirements: 1.1, 1.2_
  - [x] 1.11 更新相关 index.ts 文件移除已删除模块的导出
    - 更新 `io/index.ts` 移除 db 导出
    - 更新 `utils/index.ts` 移除 error.util 和 save-service-manager.util 导出
    - 更新 `hooks/index.ts` 移除 use-theme-dom 导出
    - 更新 `views/index.ts` 移除 ledger 导出
    - 更新 `pipes/export/index.ts` 移除 export.download.fn 和 export.path.fn 导出
    - 更新 `pipes/search/index.ts` 移除 search.engine.fn 导出
    - _Requirements: 7.1, 7.2_

- [ ] 2. Checkpoint - 验证阶段 1
  - 运行 `bun run typecheck` 确保类型正确
  - 运行 `bun run build` 确保构建成功
  - 运行 `bun run test` 确保测试通过
  - 提交: `git commit -m "refactor: remove empty compatibility layers"`

- [x] 3. 删除 Dexie 迁移代码
  - [x] 3.1 删除 `flows/migration/` 整个目录
    - 包含 `dexie-to-sqlite.migration.fn.ts`
    - 包含 `dexie-to-sqlite.migration.fn.test.ts`
    - 包含 `migration-sqlite-dependency-verification.property.test.ts`
    - 包含 `index.ts`
    - _Requirements: 2.1, 2.2_
  - [x] 3.2 删除 `flows/wiki/migrate-wiki.flow.ts`
    - Wiki 迁移不再需要
    - _Requirements: 2.1_
  - [x] 3.3 更新 `flows/wiki/index.ts` 移除 migrate-wiki 导出
    - _Requirements: 7.1, 7.2_
  - [x] 3.4 更新 `flows/index.ts` 移除 migration 相关导出
    - 移除 `checkMigrationNeeded`, `migrateWikiEntriesToFiles`, `runMigrationIfNeeded` 导出
    - _Requirements: 7.1, 7.2_
  - [x] 3.5 清理 localStorage 中的迁移状态键（文档记录）
    - 键名: `grain_dexie_to_sqlite_migration_status`
    - 用户可手动清理或忽略
    - _Requirements: 2.3_

- [ ] 4. Checkpoint - 验证阶段 3
  - 运行 `bun run typecheck` 确保类型正确
  - 运行 `bun run build` 确保构建成功
  - 运行 `bun run test` 确保测试通过
  - 提交: `git commit -m "refactor: remove Dexie migration code"`

- [x] 5. 删除示例和测试文件
  - [x] 5.1 删除 `examples/` 整个目录
    - 包含 `functional-logging-example.ts`
    - _Requirements: 3.1_
  - [x] 5.2 删除 `flows/log/performance-test.ts`
    - 性能测试脚本，无导入
    - _Requirements: 3.1_
  - [x] 5.3 删除 `flows/log/test-logger.flow.ts`
    - 日志测试工具，只被已删除的 example 引用
    - _Requirements: 3.1_
  - [x] 5.4 更新 `flows/log/index.ts` 移除 test-logger 导出
    - _Requirements: 7.1, 7.2_

- [ ] 6. Checkpoint - 验证阶段 5
  - 运行 `bun run typecheck` 确保类型正确
  - 运行 `bun run build` 确保构建成功
  - 运行 `bun run test` 确保测试通过
  - 提交: `git commit -m "refactor: remove example and test files"`

- [x] 7. 删除重复功能
  - [x] 7.1 删除 `flows/data/` 整个目录
    - 包含 `clear-data.flow.ts` 和 `index.ts`
    - 功能与 `flows/backup/clear-data.flow.ts` 重复
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 7.2 删除 `pipes/format/` 整个目录
    - 包含 `format.bytes.fn.ts`, `format.bytes.fn.test.ts`, `index.ts`
    - 只有重导出，无实际使用
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 7.3 更新 `flows/index.ts` 移除 data 导出
    - _Requirements: 7.1, 7.2_
  - [x] 7.4 更新 `pipes/index.ts` 移除 format 导出
    - _Requirements: 7.1, 7.2_

- [ ] 8. Checkpoint - 验证阶段 7
  - 运行 `bun run typecheck` 确保类型正确
  - 运行 `bun run build` 确保构建成功
  - 运行 `bun run test` 确保测试通过
  - 提交: `git commit -m "refactor: remove duplicate functionality"`

- [ ] 9. 更新导入和移除 deprecated 别名
  - [ ] 9.1 更新 `flows/wiki/get-wiki-files.flow.ts` 的导入
    - 将 `from "@/pipes/wiki/wiki.builder"` 改为 `from "@/types/wiki"`
    - _Requirements: 4.3_
  - [ ] 9.2 删除 `pipes/wiki/wiki.builder.ts`
    - 更新导入后可安全删除
    - _Requirements: 4.2_
  - [ ] 9.3 删除 `pipes/wiki/wiki.schema.ts`
    - 仅重导出 `@/types/wiki`
    - _Requirements: 4.2_
  - [ ] 9.4 更新 `pipes/wiki/index.ts` 移除已删除模块的导出
    - _Requirements: 7.1, 7.2_
  - [ ] 9.5 移除 `state/ui.state.ts` 中的 deprecated 别名
    - 移除 `useUIState` 别名
    - _Requirements: 4.1_
  - [ ] 9.6 移除 `state/editor-history.state.ts` 中的 deprecated 别名
    - 移除 `useEditorHistory` 别名
    - _Requirements: 4.1_
  - [ ] 9.7 移除 `state/diagram.state.ts` 中的 deprecated 别名
    - 移除 `useDiagramSettings` 别名
    - _Requirements: 4.1_
  - [ ] 9.8 移除 `state/sidebar.state.ts` 中的 deprecated 别名
    - 移除 `useUnifiedSidebarStore` 别名
    - _Requirements: 4.1_

- [ ] 10. Final Checkpoint - 验证所有清理
  - 运行 `bun run typecheck` 确保类型正确
  - 运行 `bun run build` 确保构建成功
  - 运行 `bun run test` 确保测试通过
  - 提交: `git commit -m "refactor: update imports and remove deprecated aliases"`

## Notes

- 每个 Checkpoint 任务确保增量验证，发现问题可及时回滚
- 所有删除操作通过 git 管理，可随时 `git reset --hard HEAD~1` 回滚
- 清理完成后预计减少约 20 个文件和 1500+ 行代码
