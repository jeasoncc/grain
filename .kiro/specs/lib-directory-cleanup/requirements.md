# Requirements Document

## Introduction

本规范定义了对 `apps/desktop/src/lib/` 目录的清理和重组要求。当前 lib 目录包含混合类型的文件：配置数据、Zustand store、工具函数和数据库定义。根据项目架构规范，这些文件应该被重新组织到正确的位置。

## Glossary

- **Config File**: 包含配置常量和预设数据的文件
- **Utils File**: 包含纯工具函数的文件，命名为 `.utils.ts` 后缀
- **Store File**: 包含 Zustand store 的文件，应放在 `domain/` 或 `stores/` 目录
- **Domain Module**: 自包含的领域模块，包含 interface、store、utils 和 index 文件

## Requirements

### Requirement 1: 移动 diagram-settings.ts 到 domain 模块

**User Story:** As a developer, I want diagram settings to be in a domain module, so that it follows the established architecture pattern.

#### Acceptance Criteria

1. WHEN the diagram-settings store is accessed THEN the System SHALL provide it from `@/domain/diagram` module
2. WHEN the diagram domain module is created THEN the System SHALL include interface, store, and index files
3. WHEN the old file is removed THEN the System SHALL update all imports to use the new location

### Requirement 2: 移动 log-db.ts 到 db 目录

**User Story:** As a developer, I want database definitions to be in the db directory, so that all database-related code is co-located.

#### Acceptance Criteria

1. WHEN the log database is accessed THEN the System SHALL provide it from `@/db/log-db.ts`
2. WHEN the file is moved THEN the System SHALL update all imports to use the new location

### Requirement 3: 移动 icon-themes.ts 到 domain 模块

**User Story:** As a developer, I want icon theme configuration to be in a domain module, so that it follows the established architecture pattern.

#### Acceptance Criteria

1. WHEN icon themes are accessed THEN the System SHALL provide them from `@/domain/icon-theme` module
2. WHEN the icon-theme domain module is created THEN the System SHALL separate config data from utility functions
3. WHEN localStorage operations are used THEN the System SHALL encapsulate them in a store

### Requirement 4: 保留纯配置文件在 lib 目录

**User Story:** As a developer, I want pure configuration files to remain in lib, so that shared configs are easily accessible.

#### Acceptance Criteria

1. WHEN a file contains only configuration constants THEN the System SHALL keep it in the lib directory
2. WHEN a config file is kept THEN the System SHALL ensure it has no side effects
3. WHEN a config file is kept THEN the System SHALL ensure proper JSDoc documentation

### Requirement 5: 验证现有文件符合规范

**User Story:** As a developer, I want all lib files to follow naming conventions, so that the codebase is consistent.

#### Acceptance Criteria

1. WHEN a file contains pure utility functions THEN the System SHALL name it with `.utils.ts` suffix
2. WHEN a file contains configuration data THEN the System SHALL use descriptive naming
3. WHEN a file has unused imports THEN the System SHALL remove them

