# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用函数式架构重构的收尾工作。主要目标是：
1. 删除已迁移但未清理的旧目录（domain/, services/）
2. 确保应用功能完整可用
3. 清理代码质量问题

## Glossary

- **Domain**: 旧的领域逻辑目录，已迁移到 types/, fn/, stores/
- **Services**: 旧的服务层目录，已迁移到 db/, fn/, actions/
- **Dead Code**: 无引用的代码文件

## Requirements

### Requirement 1: 删除无引用的 Domain 模块

**User Story:** As a developer, I want unused domain modules removed, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN the domain/editor-history/ directory has no external references THEN the System SHALL delete it
2. WHEN the domain/import-export/ directory has no external references THEN the System SHALL delete it
3. WHEN the domain/keyboard/ directory has no external references THEN the System SHALL delete it
4. WHEN the domain/save/ directory has no external references THEN the System SHALL delete it
5. WHEN the domain/selection/ directory has no external references THEN the System SHALL delete it
6. WHEN the domain/writing/ directory has no external references THEN the System SHALL delete it

### Requirement 2: 删除无引用的 Services 文件

**User Story:** As a developer, I want unused services files removed, so that the codebase is clean.

#### Acceptance Criteria

1. WHEN services/drawings.utils.ts has no external references THEN the System SHALL delete it
2. WHEN services/export-path.ts has no external references THEN the System SHALL delete it
3. WHEN services/import-export.ts has no external references THEN the System SHALL delete it
4. WHEN services/tags.ts has no external references THEN the System SHALL delete it
5. WHEN services/workspaces.ts has no external references THEN the System SHALL delete it

### Requirement 3: 更新 Services 索引

**User Story:** As a developer, I want the services index updated for backward compatibility.

#### Acceptance Criteria

1. WHEN services/index.ts re-exports migrated modules THEN the System SHALL update to point to new locations
2. WHEN backward compatibility is needed THEN the System SHALL provide re-exports from new locations

### Requirement 4: 验证应用功能

**User Story:** As a developer, I want to verify all features work correctly after cleanup.

#### Acceptance Criteria

1. WHEN running type check THEN the System SHALL have zero TypeScript errors
2. WHEN running the application THEN the System SHALL start without errors
3. WHEN creating diary/wiki/ledger THEN the System SHALL create files correctly
4. WHEN using file tree operations THEN the System SHALL work correctly

### Requirement 5: 最终清理

**User Story:** As a developer, I want all old directories removed after verification.

#### Acceptance Criteria

1. WHEN all domain modules are migrated THEN the System SHALL delete the domain/ directory
2. WHEN all services are migrated THEN the System SHALL delete the services/ directory
3. WHEN all db/models are migrated THEN the System SHALL delete the db/models/ directory
