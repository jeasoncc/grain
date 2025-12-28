# Requirements Document

## Introduction

统一 NodeType 类型定义，确保所有模板化文件类型都有对应的 NodeType 枚举值。当前只有 `diary` 有专门的类型，而 `wiki`、`todo`、`note`、`ledger` 等都使用通用的 `"file"` 类型，这导致无法通过类型区分不同的文件。

## Glossary

- **NodeType**: 节点类型枚举，定义文件树中不同类型的节点
- **Node_Interface**: 文件树节点的数据接口
- **Template_Config**: 模板化文件的配置对象
- **Date_Template_Factory**: 日期模板配置工厂函数

## Requirements

### Requirement 1: 扩展 NodeType 枚举

**User Story:** As a developer, I want all template file types to have their own NodeType, so that I can distinguish different file types programmatically.

#### Acceptance Criteria

1. THE NodeType SHALL include the following values: `folder`, `file`, `diary`, `wiki`, `todo`, `note`, `ledger`, `drawing`, `plantuml`, `mermaid`
2. WHEN a new template type is added, THE NodeType SHALL be extended to include the new type
3. THE NodeType SHALL exclude the deprecated `canvas` type (replaced by `drawing`)

### Requirement 2: 更新模板配置文件

**User Story:** As a developer, I want each template config to use its specific NodeType, so that created files have the correct type.

#### Acceptance Criteria

1. WHEN creating a wiki file, THE Wiki_Config SHALL use `"wiki"` as fileType
2. WHEN creating a todo file, THE Todo_Config SHALL use `"todo"` as fileType
3. WHEN creating a note file, THE Note_Config SHALL use `"note"` as fileType
4. WHEN creating a ledger file, THE Ledger_Config SHALL use `"ledger"` as fileType
5. WHEN creating a diary file, THE Diary_Config SHALL continue to use `"diary"` as fileType

### Requirement 3: 更新数据库 Schema

**User Story:** As a developer, I want the database schema to support all NodeType values, so that data integrity is maintained.

#### Acceptance Criteria

1. THE Database_Schema SHALL define NodeType with all supported values
2. WHEN migrating existing data, THE System SHALL preserve existing node types
3. IF a node has type `"file"` with tag `"wiki"`, THEN the migration MAY update it to type `"wiki"` (optional)

### Requirement 4: 类型安全保证

**User Story:** As a developer, I want TypeScript to enforce correct NodeType usage, so that type errors are caught at compile time.

#### Acceptance Criteria

1. THE Date_Template_Factory SHALL accept only valid non-folder NodeType values for fileType
2. WHEN an invalid NodeType is used in config, THE TypeScript_Compiler SHALL report an error
3. THE NodeType definition SHALL be the single source of truth for all type references

### Requirement 5: 向后兼容性

**User Story:** As a user, I want my existing files to continue working after the update, so that I don't lose any data.

#### Acceptance Criteria

1. WHEN loading existing nodes with type `"file"`, THE System SHALL continue to display them correctly
2. WHEN loading existing nodes with type `"canvas"`, THE System SHALL treat them as `"drawing"` type
3. THE System SHALL NOT require data migration for basic functionality
