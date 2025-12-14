# Requirements Document

## Introduction

本功能旨在将编辑器从"小说编辑器"重构为更通用的"工作空间编辑器"，支持多种使用场景：网文写作、一般书籍写作、笔记管理等。核心改动包括：

1. **数据结构重构**：将 `Project → Chapter → Scene` 的两级固定结构改为 `Workspace → Node` 的无限层级结构
2. **文件树组件**：创建支持无限嵌套的递归文件树组件
3. **术语统一**：使用通用术语 Workspace（工作空间）、Folder（文件夹）、File（文件）

## Glossary

- **Workspace**: 工作空间，原 Project/书籍，是内容组织的顶层容器
- **Node**: 统一的节点类型，可以是文件夹（folder）或文件（file）
- **Folder**: 文件夹节点，可包含子节点，支持无限嵌套
- **File**: 文件节点，包含实际内容（文本、画布等）
- **File Tree**: 文件树组件，以树形结构展示工作空间内的所有节点
- **Parent Node**: 父节点，null 表示根节点（直接属于工作空间）

## Requirements

### Requirement 1

**User Story:** As a user, I want to organize my content in a flexible folder structure, so that I can create nested hierarchies that match my workflow.

#### Acceptance Criteria

1. WHEN a user creates a new folder THEN the System SHALL add a folder node with the specified parent
2. WHEN a user creates a new file THEN the System SHALL add a file node with the specified parent and empty content
3. WHILE a folder contains child nodes THEN the System SHALL prevent deletion unless user confirms recursive deletion
4. WHEN a user moves a node THEN the System SHALL update the node's parent reference and reorder siblings
5. WHEN a user renames a node THEN the System SHALL update the node's title

### Requirement 2

**User Story:** As a user, I want to see my content organized in a tree view, so that I can easily navigate and manage my files.

#### Acceptance Criteria

1. WHEN the file tree loads THEN the System SHALL display all nodes in a hierarchical tree structure
2. WHEN a user clicks a folder THEN the System SHALL toggle the folder's expanded/collapsed state
3. WHEN a user clicks a file THEN the System SHALL open the file in the editor
4. WHEN a user right-clicks a node THEN the System SHALL display a context menu with actions (rename, delete, new folder, new file)
5. WHEN a user drags a node THEN the System SHALL allow reordering within the same parent or moving to a different parent

### Requirement 3

**User Story:** As a user, I want my existing data to work with the new structure, so that I don't lose any content.

#### Acceptance Criteria

1. WHEN the database schema is updated THEN the System SHALL create a new nodes table
2. WHEN the application starts THEN the System SHALL maintain backward compatibility with existing projects table
3. WHEN a workspace is selected THEN the System SHALL load all nodes belonging to that workspace

### Requirement 4

**User Story:** As a user, I want to create different types of files, so that I can use the appropriate editor for each content type.

#### Acceptance Criteria

1. WHEN a user creates a text file THEN the System SHALL initialize it with an empty Lexical editor state
2. WHEN a user creates a canvas file THEN the System SHALL initialize it with an empty Excalidraw state
3. WHEN a user opens a file THEN the System SHALL render the appropriate editor based on file type
