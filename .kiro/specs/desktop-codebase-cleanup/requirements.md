# Requirements Document

## Introduction

本文档定义了 desktop 应用代码库清理的需求。目标是移除不再需要的向后兼容层、已废弃的迁移代码、空的兼容文件，以及未被使用的示例代码，以减少代码库的复杂性和维护负担。

## Glossary

- **Compatibility_Layer**: 为向后兼容而保留的重导出文件，通常只包含 `export * from` 或 `export {} from` 语句
- **Migration_Code**: 用于数据迁移的代码，如 Dexie 到 SQLite 的迁移
- **Deprecated_Code**: 标记为 `@deprecated` 的代码，已有替代方案
- **Dead_Code**: 没有任何代码引用的文件或导出

## Requirements

### Requirement 1: 移除空的兼容层文件

**User Story:** As a developer, I want to remove empty compatibility layer files, so that the codebase is cleaner and easier to navigate.

#### Acceptance Criteria

1. WHEN a compatibility layer file exports nothing or only re-exports from another location, THE Cleanup_Tool SHALL identify it as removable
2. WHEN a compatibility layer file has no imports from other files in the codebase, THE Cleanup_Tool SHALL mark it for deletion
3. WHEN deleting a compatibility layer file, THE Cleanup_Tool SHALL verify no runtime errors occur

### Requirement 2: 移除已废弃的 Dexie 迁移代码

**User Story:** As a developer, I want to remove the Dexie-to-SQLite migration code, so that we don't maintain code for a migration that is no longer needed.

#### Acceptance Criteria

1. WHEN the migration module is not imported by any production code, THE Cleanup_Tool SHALL mark the entire migration directory for deletion
2. WHEN removing migration code, THE Cleanup_Tool SHALL also remove associated test files
3. WHEN migration status is stored in localStorage, THE Cleanup_Tool SHALL document the cleanup of migration status keys

### Requirement 3: 移除未使用的示例代码

**User Story:** As a developer, I want to remove example files that are not part of the production code, so that the codebase only contains necessary files.

#### Acceptance Criteria

1. WHEN an example file is not imported by any other file, THE Cleanup_Tool SHALL mark it for deletion
2. WHEN removing example files, THE Cleanup_Tool SHALL preserve any documentation value by noting it in commit messages

### Requirement 4: 清理已废弃的 hooks

**User Story:** As a developer, I want to remove deprecated hooks that have been replaced, so that developers use the correct APIs.

#### Acceptance Criteria

1. WHEN a hook is marked as deprecated and has a replacement, THE Cleanup_Tool SHALL verify the replacement is being used
2. WHEN a deprecated hook has no remaining imports, THE Cleanup_Tool SHALL mark it for deletion
3. WHEN a deprecated hook still has imports, THE Cleanup_Tool SHALL update those imports to use the replacement

### Requirement 5: 移除重复的功能模块

**User Story:** As a developer, I want to consolidate duplicate functionality, so that there is a single source of truth for each feature.

#### Acceptance Criteria

1. WHEN two modules provide the same functionality, THE Cleanup_Tool SHALL identify the canonical location
2. WHEN a duplicate module exists, THE Cleanup_Tool SHALL update all imports to use the canonical location
3. WHEN all imports are updated, THE Cleanup_Tool SHALL delete the duplicate module

### Requirement 6: 清理空的或仅包含注释的文件

**User Story:** As a developer, I want to remove files that contain no functional code, so that the codebase is not cluttered with placeholder files.

#### Acceptance Criteria

1. WHEN a file exports only an empty object or nothing, THE Cleanup_Tool SHALL mark it for deletion
2. WHEN a file contains only comments and no executable code, THE Cleanup_Tool SHALL mark it for deletion

### Requirement 7: 更新 index.ts 导出

**User Story:** As a developer, I want index files to only export modules that exist, so that imports work correctly.

#### Acceptance Criteria

1. WHEN a module is deleted, THE Cleanup_Tool SHALL update the parent index.ts to remove the export
2. WHEN an index.ts exports a deleted module, THE Cleanup_Tool SHALL remove that export line

## Identified Files for Cleanup

### Category 1: Empty Compatibility Layers (No Imports Found)

| File | Status | Reason |
|------|--------|--------|
| `io/db/index.ts` | DELETE | Empty, only contains comments, no imports |
| `utils/error.util.ts` | DELETE | Re-export only, no imports |
| `utils/save-service-manager.util.ts` | DELETE | Empty export, no imports |
| `hooks/use-theme-dom.ts` | DELETE | Re-export only, no imports |
| `views/ledger/index.ts` | DELETE | Re-export only, no imports |
| `views/editor/index.ts` | DELETE | Re-export only, no imports |
| `views/icon-theme/index.ts` | DELETE | Re-export only, no imports |
| `pipes/export/export.download.fn.ts` | DELETE | Re-export only, no imports |
| `pipes/export/export.path.fn.ts` | DELETE | Empty export, no imports |
| `pipes/search/search.engine.fn.ts` | DELETE | Empty export, no imports |
| `pipes/format/format.bytes.fn.ts` | DELETE | Re-export only, no imports |

### Category 2: Migration Code (No Longer Needed)

| File | Status | Reason |
|------|--------|--------|
| `flows/migration/` (entire directory) | DELETE | Dexie support removed, all functions return no-op |
| `flows/wiki/migrate-wiki.flow.ts` | DELETE | Wiki migration no longer needed |

### Category 3: Example/Test Files (Not Production Code)

| File | Status | Reason |
|------|--------|--------|
| `examples/functional-logging-example.ts` | DELETE | Example file, not imported |
| `flows/log/performance-test.ts` | DELETE | Test script, not imported |
| `flows/log/test-logger.flow.ts` | KEEP | Used by example file, delete after example is removed |

### Category 4: Deprecated Hooks with Replacements

| File | Status | Reason |
|------|--------|--------|
| `hooks/use-drawing.ts` | REFACTOR | Has 1 import, deprecated functions should be removed |

### Category 5: Duplicate Functionality

| File | Status | Reason |
|------|--------|--------|
| `flows/data/` (entire directory) | DELETE | Duplicates `flows/backup/clear-data.flow.ts` |
| `pipes/format/` (entire directory) | DELETE | Only contains re-export, no imports |

### Category 6: Files to Update

| File | Action | Reason |
|------|--------|--------|
| `pipes/wiki/wiki.builder.ts` | UPDATE | Change import in `flows/wiki/get-wiki-files.flow.ts` to use `@/types/wiki` |
| `pipes/wiki/wiki.schema.ts` | DELETE | After updating imports to use `@/types/wiki` |
| `state/ui.state.ts` | UPDATE | Remove deprecated alias `useUIState` |
| `state/editor-history.state.ts` | UPDATE | Remove deprecated alias `useEditorHistory` |
| `state/diagram.state.ts` | UPDATE | Remove deprecated alias `useDiagramSettings` |
| `state/sidebar.state.ts` | UPDATE | Remove deprecated alias `useUnifiedSidebarStore` |

## Summary

Total files to delete: ~20 files
Total directories to delete: 3 directories (`flows/migration/`, `flows/data/`, `pipes/format/`)
Total files to update: ~6 files

This cleanup will reduce code complexity and remove approximately 1500+ lines of dead or deprecated code.
