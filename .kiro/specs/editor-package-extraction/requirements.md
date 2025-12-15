# Requirements Document

## Introduction

本文档定义了将编辑器模块从 `apps/desktop/src/components/editor` 抽取为独立的 Turborepo package (`@novel-editor/editor`) 的需求。这个重构将使编辑器成为一个独立的、可复用的模块，便于在多个应用之间共享，并支持独立开发和测试。

## Glossary

- **Editor Package**: 独立的 npm 包，包含基于 Lexical 的富文本编辑器核心功能
- **Turborepo**: 用于管理 monorepo 的构建系统
- **Lexical**: Facebook 开源的富文本编辑器框架
- **EditorInstance**: 单个编辑器实例的包装组件
- **MultiEditorContainer**: 管理多个编辑器实例的容器组件
- **Custom Node**: 自定义的 Lexical 节点类型（MentionNode, TagNode）
- **Plugin**: Lexical 编辑器插件

## Requirements

### Requirement 1

**User Story:** As a developer, I want to have the editor module as a separate package, so that I can reuse it across different applications and develop it independently.

#### Acceptance Criteria

1. WHEN the editor package is created THEN the system SHALL place it in `packages/editor` directory with proper package.json configuration
2. WHEN the editor package is built THEN the system SHALL export all editor components, nodes, plugins, and themes
3. WHEN an application imports from the editor package THEN the system SHALL provide TypeScript type definitions
4. WHEN the editor package dependencies are resolved THEN the system SHALL list Lexical and React as peer dependencies
5. WHEN the editor package is used in desktop app THEN the system SHALL maintain all existing functionality

### Requirement 2

**User Story:** As a developer, I want the editor package to have a clear module structure, so that I can easily understand and extend the editor functionality.

#### Acceptance Criteria

1. WHEN the editor package is organized THEN the system SHALL separate nodes, plugins, themes, and core components into distinct directories
2. WHEN the editor package exports are defined THEN the system SHALL provide a single entry point (`index.ts`) that re-exports all public APIs
3. WHEN custom nodes are created THEN the system SHALL export node creation functions and type guards (`$createNode`, `$isNode`)
4. WHEN plugins are exported THEN the system SHALL provide both the plugin component and any associated configuration types

### Requirement 3

**User Story:** As a developer, I want the editor package to support multiple editor instances, so that I can implement tabbed editing functionality.

#### Acceptance Criteria

1. WHEN multiple editors are rendered THEN the system SHALL maintain independent state for each instance
2. WHEN switching between editor tabs THEN the system SHALL preserve scroll position and cursor state using CSS visibility
3. WHEN editor content changes THEN the system SHALL provide callbacks for state synchronization
4. WHEN editor instances are managed THEN the system SHALL support independent undo/redo history per instance

### Requirement 4

**User Story:** As a developer, I want the desktop app to consume the editor package, so that I can verify the extraction was successful.

#### Acceptance Criteria

1. WHEN the desktop app imports the editor THEN the system SHALL use the package import path (`@novel-editor/editor`)
2. WHEN the desktop app builds THEN the system SHALL resolve the editor package through Turborepo workspace
3. WHEN the editor is rendered in desktop app THEN the system SHALL display identical behavior to the pre-extraction version
4. WHEN the editor package is updated THEN the system SHALL trigger rebuild of dependent applications

### Requirement 5

**User Story:** As a developer, I want the editor package to be properly integrated with Turborepo, so that builds are efficient and dependencies are correctly managed.

#### Acceptance Criteria

1. WHEN the editor package is added THEN the system SHALL update turbo.json to include the package in the build pipeline
2. WHEN the editor package has changes THEN the system SHALL only rebuild affected packages and applications
3. WHEN the editor package is built THEN the system SHALL output both ESM and type declaration files
4. WHEN workspace dependencies are resolved THEN the system SHALL use the `workspace:*` protocol for internal packages
