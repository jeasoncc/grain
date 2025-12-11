# Requirements Document

## Introduction

本功能规格涵盖三个主要改进：
1. 移除右侧边栏，将章节管理功能迁移到左侧统一侧边栏
2. 改进编辑器中 Wiki 悬浮预览的显示效果和内容完整性
3. 在设置页面新增日志查看模块，展示系统日志并提供清空功能

## Glossary

- **UnifiedSidebar**: 左侧统一侧边栏组件，包含书库、搜索、绘图、Wiki 等面板
- **ActivityBar**: 最左侧的活动栏，包含切换各面板的按钮
- **ChapterPanel**: 新增的章节管理面板，用于管理书籍的章节和场景
- **WikiHoverPreview**: Wiki 条目悬浮预览组件，鼠标悬停时显示详细内容
- **LogViewer**: 日志查看器组件，用于展示和管理系统日志
- **LogDB**: 基于 IndexedDB 的日志数据库，存储应用运行日志
- **Logger**: 日志记录器，基于 consola 实现，替代 console.log

## Requirements

### Requirement 1

**User Story:** As a writer, I want to manage chapters and scenes from the left sidebar, so that I can organize my book structure without needing a separate right sidebar.

#### Acceptance Criteria

1. WHEN a user clicks the chapter management button in the ActivityBar THEN the UnifiedSidebar SHALL display the ChapterPanel with the current project's chapters and scenes
2. WHEN a user selects a different project in the ChapterPanel THEN the ChapterPanel SHALL update to show that project's chapters and scenes
3. WHEN a user creates a new chapter in the ChapterPanel THEN the System SHALL add the chapter to the current project and display it in the list
4. WHEN a user creates a new scene in the ChapterPanel THEN the System SHALL add the scene to the selected chapter and display it in the list
5. WHEN a user drags a chapter or scene to reorder THEN the System SHALL update the order and persist the change
6. WHEN a user renames a chapter or scene THEN the System SHALL update the title and persist the change
7. WHEN a user deletes a chapter or scene THEN the System SHALL remove the item after confirmation and persist the change
8. WHEN the ChapterPanel is active THEN the ActivityBar SHALL highlight the chapter management button

### Requirement 2

**User Story:** As a writer, I want to see detailed Wiki content when hovering over mentions in the editor, so that I can quickly reference character and world information without leaving my writing.

#### Acceptance Criteria

1. WHEN a user hovers over a Wiki mention in the editor THEN the WikiHoverPreview SHALL display the full content of the Wiki entry
2. WHEN the WikiHoverPreview displays THEN the System SHALL render the content with proper formatting including headings, lists, and paragraphs
3. WHEN the WikiHoverPreview displays THEN the System SHALL show the entry name, aliases, tags, and full content
4. WHEN the WikiHoverPreview displays THEN the System SHALL use a visually appealing card design with proper shadows, borders, and spacing
5. WHEN the WikiHoverPreview content exceeds the viewport THEN the System SHALL provide scrollable content within a maximum height constraint
6. WHEN a user moves the mouse away from the mention THEN the WikiHoverPreview SHALL hide after a brief delay

### Requirement 3

**User Story:** As a developer, I want to view application logs in the settings page, so that I can debug issues and monitor application behavior.

#### Acceptance Criteria

1. WHEN a user navigates to the logs section in settings THEN the LogViewer SHALL display all stored log entries from the LogDB
2. WHEN displaying log entries THEN the LogViewer SHALL show timestamp, log level, and message for each entry
3. WHEN displaying log entries THEN the LogViewer SHALL use color coding to distinguish different log levels (error, warn, info, debug)
4. WHEN a user clicks the clear logs button THEN the System SHALL remove all log entries from the LogDB after confirmation
5. WHEN the application logs a message using the Logger THEN the System SHALL store the log entry in the LogDB
6. WHEN the LogViewer is open THEN the System SHALL provide filtering options by log level
7. WHEN the LogViewer is open THEN the System SHALL provide search functionality to find specific log messages

### Requirement 4

**User Story:** As a developer, I want all console.log statements replaced with the Logger, so that I can capture all application logs in the LogDB for debugging.

#### Acceptance Criteria

1. WHEN the application logs debug information THEN the System SHALL use the Logger instead of console.log
2. WHEN the application logs errors THEN the System SHALL use the Logger.error method
3. WHEN the application logs warnings THEN the System SHALL use the Logger.warn method
4. WHEN the application logs informational messages THEN the System SHALL use the Logger.info method
5. WHEN the Logger records a message THEN the System SHALL persist the log entry to the LogDB with timestamp and level
