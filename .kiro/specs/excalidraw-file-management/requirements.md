# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用中 Excalidraw 文件管理功能的需求。目标是将现有的 drawing 模块重构为基于文件树的 Excalidraw 文件管理系统，类似于日记功能，文件存储在 `excalidraw/` 根目录下。

## Glossary

- **Excalidraw**: 开源的手绘风格白板工具，用于创建图表和绘图
- **Drawing Node**: 存储 Excalidraw 内容的文件节点
- **File Tree**: 文件树结构，用于组织和管理文件
- **Templated File**: 使用模板配置创建的文件，遵循统一的创建模式
- **Root Folder**: 根文件夹，Excalidraw 文件的顶层目录名称为 "excalidraw"

## Requirements

### Requirement 1: 删除旧的 Drawing 模块

**User Story:** As a developer, I want to remove the old drawing module, so that we can replace it with a file-tree-based approach.

#### Acceptance Criteria

1. WHEN removing old drawing code THEN the System SHALL delete all files in `components/drawing/` directory
2. WHEN removing old drawing code THEN the System SHALL delete all files in `actions/drawing/` directory
3. WHEN removing old drawing code THEN the System SHALL delete all drawing-related database functions in `db/drawing.db.fn.ts`
4. WHEN removing old drawing code THEN the System SHALL remove drawing-related types from `db/schema.ts`
5. WHEN removing old drawing code THEN the System SHALL update all import statements that reference deleted files

### Requirement 2: 创建 Excalidraw 模板配置

**User Story:** As a developer, I want to create an Excalidraw template configuration, so that Excalidraw files can be created using the templated file pattern.

#### Acceptance Criteria

1. WHEN creating Excalidraw template config THEN the System SHALL define `ExcalidrawTemplateParams` interface
2. WHEN creating Excalidraw template config THEN the System SHALL create `excalidrawConfig` following the `TemplateConfig` pattern
3. WHEN creating Excalidraw template config THEN the System SHALL set `rootFolder` to "excalidraw"
4. WHEN creating Excalidraw template config THEN the System SHALL set `fileType` to "drawing"
5. WHEN creating Excalidraw template config THEN the System SHALL set `tag` to "excalidraw"
6. WHEN creating Excalidraw template config THEN the System SHALL provide a `generateTemplate` function that creates empty Excalidraw JSON
7. WHEN creating Excalidraw template config THEN the System SHALL provide a `generateFolderPath` function that returns year/month/day folder structure
8. WHEN creating Excalidraw template config THEN the System SHALL provide a `generateTitle` function that generates date-based titles

### Requirement 3: 创建 Excalidraw 文件创建 Action

**User Story:** As a developer, I want to create an action for creating Excalidraw files, so that users can create new drawings in the file tree.

#### Acceptance Criteria

1. WHEN creating Excalidraw action THEN the System SHALL use the `createTemplatedFile` higher-order function
2. WHEN creating Excalidraw action THEN the System SHALL pass `excalidrawConfig` to the higher-order function
3. WHEN creating Excalidraw action THEN the System SHALL export `createExcalidraw` function
4. WHEN creating Excalidraw action THEN the System SHALL export `createExcalidrawAsync` function for component usage
5. WHEN creating an Excalidraw file THEN the System SHALL create it under `excalidraw/year/month/day/` folder structure
6. WHEN creating an Excalidraw file THEN the System SHALL initialize it with empty Excalidraw JSON structure

### Requirement 4: 生成 Excalidraw 模板内容

**User Story:** As a developer, I want to generate proper Excalidraw template content, so that new drawings have valid initial data.

#### Acceptance Criteria

1. WHEN generating Excalidraw template THEN the System SHALL create a function `generateExcalidrawContent`
2. WHEN generating Excalidraw template THEN the System SHALL return valid Excalidraw JSON with empty elements array
3. WHEN generating Excalidraw template THEN the System SHALL include default appState with viewBackgroundColor
4. WHEN generating Excalidraw template THEN the System SHALL include empty files object
5. WHEN generating Excalidraw template THEN the System SHALL set default width to 1920
6. WHEN generating Excalidraw template THEN the System SHALL set default height to 1080

### Requirement 5: 更新路由和 UI 集成

**User Story:** As a user, I want to create and edit Excalidraw files from the file tree, so that I can manage my drawings like other files.

#### Acceptance Criteria

1. WHEN viewing file tree THEN the System SHALL display Excalidraw files with drawing icon
2. WHEN clicking an Excalidraw file THEN the System SHALL open it in the Excalidraw editor
3. WHEN creating a new Excalidraw file THEN the System SHALL add it to the file tree under `excalidraw/` folder
4. WHEN editing an Excalidraw file THEN the System SHALL save changes to the node content
5. WHEN deleting an Excalidraw file THEN the System SHALL remove it from the file tree

### Requirement 6: 命令面板集成

**User Story:** As a user, I want to create Excalidraw files from the command palette, so that I can quickly create new drawings.

#### Acceptance Criteria

1. WHEN opening command palette THEN the System SHALL show "Create Excalidraw Drawing" command
2. WHEN executing "Create Excalidraw Drawing" command THEN the System SHALL create a new Excalidraw file
3. WHEN creating Excalidraw from command palette THEN the System SHALL open the new file in editor
4. WHEN creating Excalidraw from command palette THEN the System SHALL use current workspace

### Requirement 7: 测试覆盖

**User Story:** As a developer, I want comprehensive tests for Excalidraw functionality, so that the feature is reliable.

#### Acceptance Criteria

1. WHEN testing Excalidraw config THEN the System SHALL have unit tests for template generation
2. WHEN testing Excalidraw action THEN the System SHALL have unit tests for file creation
3. WHEN testing Excalidraw content THEN the System SHALL have unit tests for content generation
4. WHEN all tests run THEN the System SHALL pass without errors
