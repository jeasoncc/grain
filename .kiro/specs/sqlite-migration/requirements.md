# Requirements Document

## Introduction

将 Grain 应用的数据存储从前端 IndexedDB (Dexie) 迁移到 Rust 后端 SQLite (SQLCipher)，实现数据加密存储，为后续本地 AI、全文搜索等功能打下基础。

## Glossary

- **SQLCipher**: SQLite 的加密扩展，提供透明的数据库级 AES-256 加密
- **Tauri_Command**: Tauri 框架中前端调用后端 Rust 函数的机制
- **Repository**: 数据访问层，封装所有数据库操作
- **Migration_Tool**: 数据迁移工具，将 IndexedDB 数据导入 SQLite
- **Keychain**: 操作系统提供的安全密钥存储（macOS Keychain、Windows Credential Manager、Linux Secret Service）

## Requirements

### Requirement 1: Rust 后端数据库初始化

**User Story:** As a user, I want my data to be stored in an encrypted SQLite database, so that my personal notes and documents are protected even if someone accesses my device.

#### Acceptance Criteria

1. WHEN the application starts for the first time, THE Database_Initializer SHALL create a new SQLCipher encrypted database file in the user's data directory
2. WHEN the application starts, THE Database_Initializer SHALL retrieve or generate an encryption key from the system Keychain
3. IF the encryption key cannot be retrieved from Keychain, THEN THE Database_Initializer SHALL generate a new key and store it securely
4. WHEN the database is created, THE Database_Initializer SHALL execute all migration scripts to create the required tables
5. THE Database_Schema SHALL include tables for: nodes, contents, workspaces, users, attachments, tags, and db_versions

### Requirement 2: 核心数据类型定义 (Rust)

**User Story:** As a developer, I want Rust data types that mirror the TypeScript interfaces, so that data can be serialized/deserialized correctly between frontend and backend.

#### Acceptance Criteria

1. THE Node_Struct SHALL contain fields: id, workspace, parent, node_type, title, order, collapsed, create_date, last_edit, tags
2. THE Content_Struct SHALL contain fields: id, node_id, content, content_type, last_edit
3. THE Workspace_Struct SHALL contain fields: id, title, author, description, publisher, language, last_open, create_date, members, owner
4. THE User_Struct SHALL contain fields matching UserInterface including nested features, state, and settings
5. THE Tag_Struct SHALL contain fields: id, name, workspace, count, last_used, create_date
6. THE Attachment_Struct SHALL contain fields: id, project, attachment_type, file_name, file_path, uploaded_at, size, mime_type
7. FOR ALL structs, serialization to JSON and deserialization from JSON SHALL produce equivalent data (round-trip property)

### Requirement 3: Node CRUD 操作

**User Story:** As a user, I want to create, read, update, and delete nodes through the Rust backend, so that my file tree operations are persisted securely.

#### Acceptance Criteria

1. WHEN a create_node command is invoked, THE Node_Repository SHALL insert a new node and return the created node
2. WHEN a get_node command is invoked with a valid ID, THE Node_Repository SHALL return the node if it exists
3. WHEN a get_node command is invoked with an invalid ID, THE Node_Repository SHALL return None
4. WHEN a get_nodes_by_workspace command is invoked, THE Node_Repository SHALL return all nodes belonging to that workspace ordered by the order field
5. WHEN an update_node command is invoked, THE Node_Repository SHALL update the specified fields and update last_edit timestamp
6. WHEN a delete_node command is invoked, THE Node_Repository SHALL remove the node and all its descendants recursively
7. WHEN a move_node command is invoked, THE Node_Repository SHALL update the parent and order fields atomically

### Requirement 4: Content CRUD 操作

**User Story:** As a user, I want my document content to be stored and retrieved separately from node metadata, so that the file tree loads quickly without loading heavy content.

#### Acceptance Criteria

1. WHEN a create_content command is invoked, THE Content_Repository SHALL insert new content linked to a node
2. WHEN a get_content_by_node command is invoked, THE Content_Repository SHALL return the content for that node if it exists
3. WHEN an update_content command is invoked, THE Content_Repository SHALL update the content and last_edit timestamp
4. WHEN a node is deleted, THE Content_Repository SHALL also delete the associated content (cascade delete)
5. THE Content_Repository SHALL support content types: lexical, excalidraw, text

### Requirement 5: Workspace CRUD 操作

**User Story:** As a user, I want to manage multiple workspaces, so that I can organize my projects separately.

#### Acceptance Criteria

1. WHEN a create_workspace command is invoked, THE Workspace_Repository SHALL create a new workspace with auto-generated ID and timestamps
2. WHEN a get_all_workspaces command is invoked, THE Workspace_Repository SHALL return all workspaces ordered by last_open descending
3. WHEN an update_workspace command is invoked, THE Workspace_Repository SHALL update the specified fields
4. WHEN a delete_workspace command is invoked, THE Workspace_Repository SHALL remove the workspace and all associated nodes, contents, and tags

### Requirement 6: Tag 聚合操作

**User Story:** As a user, I want to see tag statistics and autocomplete suggestions, so that I can organize my notes efficiently.

#### Acceptance Criteria

1. WHEN a node's tags are updated, THE Tag_Aggregator SHALL update the tag counts in the tags table
2. WHEN a get_tags_by_workspace command is invoked, THE Tag_Repository SHALL return all tags for that workspace with their counts
3. WHEN a tag count reaches zero, THE Tag_Aggregator SHALL remove the tag from the tags table
4. THE Tag_Repository SHALL support searching tags by prefix for autocomplete

### Requirement 7: User CRUD 操作

**User Story:** As a user, I want my user profile and settings to be stored securely, so that my preferences persist across sessions.

#### Acceptance Criteria

1. WHEN a create_user command is invoked, THE User_Repository SHALL create a new user with auto-generated ID and timestamps
2. WHEN a get_user command is invoked, THE User_Repository SHALL return the user if it exists
3. WHEN an update_user command is invoked, THE User_Repository SHALL update the specified fields including nested objects (features, state, settings)
4. THE User_Repository SHALL support updating individual nested fields without overwriting the entire object

### Requirement 8: Attachment CRUD 操作

**User Story:** As a user, I want to attach files to my projects, so that I can keep related resources together.

#### Acceptance Criteria

1. WHEN a create_attachment command is invoked, THE Attachment_Repository SHALL insert a new attachment record
2. WHEN a get_attachments_by_project command is invoked, THE Attachment_Repository SHALL return all attachments for that project
3. WHEN a delete_attachment command is invoked, THE Attachment_Repository SHALL remove the attachment record
4. WHEN a project is deleted, THE Attachment_Repository SHALL also delete all associated attachments (cascade delete)

### Requirement 9: 数据迁移工具

**User Story:** As an existing user, I want my data from IndexedDB to be migrated to the new SQLite database, so that I don't lose any of my existing notes.

#### Acceptance Criteria

1. WHEN the migration tool is triggered, THE Migration_Tool SHALL read all data from IndexedDB via frontend
2. WHEN migrating data, THE Migration_Tool SHALL preserve all node relationships (parent-child hierarchy)
3. WHEN migrating data, THE Migration_Tool SHALL preserve all timestamps (createDate, lastEdit)
4. WHEN migrating data, THE Migration_Tool SHALL preserve all content associations (node-content links)
5. IF migration fails partway, THEN THE Migration_Tool SHALL rollback all changes and report the error
6. WHEN migration completes successfully, THE Migration_Tool SHALL mark the migration as complete to prevent re-migration
7. FOR ALL migrated data, the data in SQLite SHALL be equivalent to the original data in IndexedDB (round-trip property)

### Requirement 10: 前端 API 适配层

**User Story:** As a developer, I want a TypeScript API layer that wraps Tauri commands, so that existing code can migrate incrementally with minimal changes.

#### Acceptance Criteria

1. THE API_Layer SHALL provide functions matching the existing db/*.db.fn.ts interface signatures
2. WHEN an API function is called, THE API_Layer SHALL invoke the corresponding Tauri command
3. WHEN a Tauri command returns an error, THE API_Layer SHALL convert it to an AppError type
4. THE API_Layer SHALL handle serialization/deserialization of complex types (dates, nested objects)
5. THE API_Layer SHALL provide TypeScript types that match the Rust structs

### Requirement 11: 错误处理

**User Story:** As a user, I want clear error messages when database operations fail, so that I can understand what went wrong.

#### Acceptance Criteria

1. WHEN a database operation fails, THE Error_Handler SHALL return a structured error with type and message
2. THE Error_Types SHALL include: ValidationError, DatabaseError, NotFound, CryptoError, IoError, SerializationError
3. WHEN an error occurs, THE Error_Handler SHALL log the error with context information
4. IF a critical error occurs during startup, THEN THE Application SHALL display a user-friendly error dialog

### Requirement 12: 数据库备份与恢复

**User Story:** As a user, I want to backup and restore my database, so that I can protect against data loss.

#### Acceptance Criteria

1. WHEN a backup command is invoked, THE Backup_Service SHALL create a copy of the encrypted database file
2. WHEN a restore command is invoked, THE Backup_Service SHALL replace the current database with the backup
3. WHEN backing up, THE Backup_Service SHALL verify the backup file integrity
4. THE Backup_Service SHALL support exporting to a user-specified location
