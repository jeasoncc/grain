# Requirements Document

## Introduction

本项目旨在彻底重构桌面应用的Lexical编辑器系统。当前实现存在严重的内存泄漏问题，导致浏览器崩溃和页面卡死。

**核心问题：**
1. 当前使用单一编辑器组件渲染不同文件，每次切换文件时重新创建编辑器实例
2. 编辑器组件过于复杂，加载了大量不必要的插件
3. 组件实现与Lexical Playground官方示例差异过大，导致不稳定

**重构目标：**
1. 彻底删除所有现有编辑器组件（`components/blocks/rich-editor/` 和 `components/editor/`）
2. 基于Lexical Playground官方示例重新实现编辑器
3. 只保留两个自定义插件：Wiki @提及插件 和 #[tags]标签插件
4. 每个打开的文件拥有独立的Lexical编辑器实例
5. 通过CSS visibility控制编辑器显示/隐藏，而非销毁/重建

## Glossary

- **Lexical**: Meta开源的富文本编辑器框架
- **Lexical Playground**: Lexical官方示例项目，包含完整且稳定的编辑器实现
- **Editor Instance**: 一个独立的Lexical编辑器实例，包含完整的编辑器状态
- **Editor State**: 编辑器的序列化状态，包含文档内容、选区等
- **Tab**: 编辑器标签页，每个标签对应一个打开的文件
- **Visibility Pattern**: 使用CSS visibility属性控制元素显示/隐藏，保持DOM和状态不变
- **MentionsPlugin**: 自定义Wiki @提及插件，支持输入@触发Wiki条目选择
- **TagPickerPlugin**: 自定义#[tags]标签插件，支持输入#[触发标签选择

## Requirements

### Requirement 1

**User Story:** As a developer, I want all existing editor components completely removed, so that I can start fresh with a clean Lexical Playground implementation.

#### Acceptance Criteria

1. WHEN the cleanup is complete THEN the Editor_System SHALL have deleted all files in `components/blocks/rich-editor/` directory
2. WHEN the cleanup is complete THEN the Editor_System SHALL have deleted all files in `components/editor/` directory except for the custom plugins
3. WHEN the cleanup is complete THEN the Editor_System SHALL preserve only `mentions-plugin.tsx`, `mention-tooltip-plugin.tsx`, `tag-picker-plugin.tsx` and their dependencies (`mention-node.tsx`, `tag-node.tsx`, `wiki-hover-preview.tsx`)
4. WHEN the cleanup is complete THEN the Editor_System SHALL have no broken imports or references to deleted files

### Requirement 2

**User Story:** As a developer, I want to install and configure Lexical Playground components, so that I have a stable and well-tested editor foundation.

#### Acceptance Criteria

1. WHEN the installation is complete THEN the Editor_System SHALL have Lexical Playground source files in a dedicated directory
2. WHEN the Editor_System initializes THEN the Editor_System SHALL use Lexical Playground's default configuration
3. WHEN the Editor_System loads THEN the Editor_System SHALL include only essential plugins (RichText, History, Markdown, List, Link)
4. WHEN the Editor_System renders THEN the Editor_System SHALL use Lexical Playground's theme and styling

### Requirement 3

**User Story:** As a user, I want each open file to have its own editor instance, so that switching between files preserves my editing position and state.

#### Acceptance Criteria

1. WHEN a user opens a file THEN the Editor_System SHALL create a new Lexical editor instance for that file
2. WHEN a user switches between tabs THEN the Editor_System SHALL preserve the cursor position of the previous tab
3. WHEN a user switches between tabs THEN the Editor_System SHALL preserve the scroll position of the previous tab
4. WHEN a user switches between tabs THEN the Editor_System SHALL preserve the undo/redo history of each tab independently
5. WHEN a user closes a tab THEN the Editor_System SHALL properly dispose of the editor instance and release memory

### Requirement 4

**User Story:** As a user, I want smooth tab switching without page freezing, so that I can work efficiently with multiple files.

#### Acceptance Criteria

1. WHEN a user switches tabs THEN the Editor_System SHALL use CSS visibility to show/hide editors instead of destroying and recreating them
2. WHEN multiple editors are open THEN the Editor_System SHALL maintain stable memory usage without continuous growth
3. WHEN a user has more than 10 tabs open THEN the Editor_System SHALL implement lazy disposal for oldest inactive editors to prevent memory overflow

### Requirement 5

**User Story:** As a user, I want to use Wiki @mentions and #[tags] in my documents, so that I can reference wiki entries and organize content with tags.

#### Acceptance Criteria

1. WHEN a user types @ THEN the Editor_System SHALL display a dropdown with matching Wiki entries
2. WHEN a user selects a Wiki entry THEN the Editor_System SHALL insert a styled mention node that links to the entry
3. WHEN a user hovers over a mention THEN the Editor_System SHALL display a preview tooltip of the Wiki entry
4. WHEN a user types #[ THEN the Editor_System SHALL display a dropdown with existing tags and option to create new tags
5. WHEN a user selects or creates a tag THEN the Editor_System SHALL insert a styled tag node

### Requirement 6

**User Story:** As a user, I want basic rich text editing features, so that I can format my novel content appropriately.

#### Acceptance Criteria

1. WHEN a user types markdown syntax THEN the Editor_System SHALL convert it to formatted text (headings, bold, italic, lists)
2. WHEN a user selects text THEN the Editor_System SHALL display a floating toolbar with formatting options
3. WHEN a user presses Ctrl+Z/Ctrl+Y THEN the Editor_System SHALL undo/redo changes within the current editor instance
4. WHEN a user types THEN the Editor_System SHALL auto-save content after a configurable delay

### Requirement 7

**User Story:** As a user, I want the editor to handle large documents efficiently, so that I can write long novels without performance issues.

#### Acceptance Criteria

1. WHEN a document exceeds 50,000 characters THEN the Editor_System SHALL maintain responsive typing performance
2. WHEN the Editor_System loads a large document THEN the Editor_System SHALL complete loading within 2 seconds
3. WHEN the Editor_System saves content THEN the Editor_System SHALL serialize and save without blocking the UI

