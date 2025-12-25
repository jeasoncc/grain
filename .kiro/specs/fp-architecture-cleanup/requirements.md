# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用架构清理的需求。目标是删除所有已迁移到新架构的旧文件，确保代码库符合 `architecture.md` 和 `structure.md` 中定义的目标结构。

## Glossary

- **Domain**: 旧架构中的领域逻辑目录，应该被删除
- **Services**: 旧架构中的服务层目录，应该被删除
- **db/models**: 旧架构中的数据模型目录，已迁移到 types/
- **Unused Component**: 未被任何其他文件引用的组件

## Requirements

### Requirement 1: 删除 domain/ 目录

**User Story:** As a developer, I want the domain/ directory removed, so that the codebase follows the new architecture.

#### Acceptance Criteria

1. WHEN the cleanup is complete THEN the System SHALL NOT have a `domain/` directory
2. WHEN deleting domain/ THEN the System SHALL first update all imports to use new locations
3. WHEN domain/diary is deleted THEN the System SHALL ensure diary functions are available from `fn/date/` and `actions/templated/`
4. WHEN domain/export is deleted THEN the System SHALL ensure export functions are available from `fn/export/` and `actions/export/`
5. WHEN domain/search is deleted THEN the System SHALL ensure search functions are available from `fn/search/`

### Requirement 2: 删除 services/ 目录

**User Story:** As a developer, I want the services/ directory removed, so that the codebase follows the new architecture.

#### Acceptance Criteria

1. WHEN the cleanup is complete THEN the System SHALL NOT have a `services/` directory
2. WHEN deleting services/ THEN the System SHALL first update all imports to use new locations
3. WHEN services/index.ts is deleted THEN the System SHALL ensure all re-exports are available from their new locations

### Requirement 3: 删除 db/ 子目录中的旧服务

**User Story:** As a developer, I want the old service files in db/ subdirectories removed, so that only the new *.db.fn.ts files remain.

#### Acceptance Criteria

1. WHEN the cleanup is complete THEN the System SHALL NOT have `db/backup/` directory
2. WHEN the cleanup is complete THEN the System SHALL NOT have `db/clear-data/` directory
3. WHEN the cleanup is complete THEN the System SHALL NOT have `db/init/` directory
4. WHEN deleting these directories THEN the System SHALL ensure functions are available from `db/*.db.fn.ts` files

### Requirement 4: 删除未使用的组件

**User Story:** As a developer, I want unused components removed, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN a component has zero imports from other files THEN the System SHALL delete that component
2. WHEN deleting components THEN the System SHALL verify no runtime errors occur
3. WHEN the cleanup is complete THEN the System SHALL only contain actively used components

### Requirement 5: 删除测试路由

**User Story:** As a developer, I want test routes removed from production code, so that the application is clean.

#### Acceptance Criteria

1. WHEN the cleanup is complete THEN the System SHALL NOT have `routes/test-*.tsx` files
2. WHEN deleting test routes THEN the System SHALL update the route tree

### Requirement 6: 更新导入路径

**User Story:** As a developer, I want all imports updated to use the new architecture paths, so that the code is consistent.

#### Acceptance Criteria

1. WHEN imports reference `@/domain/` THEN the System SHALL update them to the new location
2. WHEN imports reference `@/services/` THEN the System SHALL update them to the new location
3. WHEN imports reference `@/db/backup/` THEN the System SHALL update them to `@/db/backup.db.fn`
4. WHEN imports reference `@/db/clear-data/` THEN the System SHALL update them to `@/db/clear-data.db.fn`
5. WHEN imports reference `@/db/init/` THEN the System SHALL update them to `@/db/init.db.fn`

### Requirement 7: 验证清理结果

**User Story:** As a developer, I want the cleanup verified, so that the application still works correctly.

#### Acceptance Criteria

1. WHEN the cleanup is complete THEN the System SHALL pass TypeScript type checking
2. WHEN the cleanup is complete THEN the System SHALL pass all existing tests
3. WHEN the cleanup is complete THEN the System SHALL start without errors
4. WHEN the cleanup is complete THEN the System SHALL match the structure defined in `structure.md`
