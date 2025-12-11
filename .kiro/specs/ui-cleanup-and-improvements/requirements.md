# Requirements Document

## Introduction

本规格文档涵盖桌面应用的 UI 清理和改进任务，包括：删除编辑页面右侧边栏、调整 Activity Bar 图标顺序和样式、删除重复的日志页面、移除章节管理中的书籍选择功能、移除章节管理中的新建绘画功能（因为绘画属于书籍级别而非章节级别），以及添加 Git Tag 构建触发脚本。

## Glossary

- **Activity Bar**: 应用左侧的垂直导航栏，包含主要功能入口图标
- **Unified Sidebar**: 统一侧边栏，位于 Activity Bar 右侧，用于显示各种面板（书库、搜索、章节等）
- **Right Sidebar**: 编辑页面右侧的侧边栏（已废弃，功能已集成到 Unified Sidebar）
- **Chapters Panel**: 章节管理面板，用于管理书籍的章节和场景结构
- **Drawing**: 绘图，属于书籍（Project）级别的资源，不属于章节
- **Icon Theme**: 图标主题系统，为不同功能提供统一的图标风格
- **Git Tag**: Git 版本标签，用于触发 CI/CD 构建流程

## Requirements

### Requirement 1: 删除编辑页面右侧边栏

**User Story:** As a user, I want the editor page to have a cleaner layout without the right sidebar, so that I can focus on writing with more screen space.

#### Acceptance Criteria

1. WHEN the editor page loads THEN the system SHALL NOT render the StoryRightSidebar component
2. WHEN the root layout renders THEN the system SHALL remove all right sidebar related state and logic
3. WHEN the user navigates to the editor page THEN the system SHALL display only the Activity Bar, Unified Sidebar, and main content area

### Requirement 2: 调整 Activity Bar 图标顺序和样式

**User Story:** As a user, I want the Activity Bar icons to be arranged in a logical order with distinct icons, so that I can quickly identify and access different features.

#### Acceptance Criteria

1. WHEN the Activity Bar renders THEN the system SHALL display icons in the following order: 书籍管理(1st), 章节管理(2nd), Wiki(3rd), 搜索(4th), 大纲(5th)
2. WHEN the Activity Bar renders THEN the system SHALL use distinct icons for each function: Library icon for 书籍管理, FolderTree icon for 章节管理, BookOpen icon for Wiki, Search icon for 搜索, ListTree icon for 大纲
3. WHEN the user changes the icon theme in settings THEN the system SHALL update all Activity Bar icons to reflect the new theme
4. WHEN the icon theme changes THEN the system SHALL emit an event that triggers Activity Bar icon refresh

### Requirement 3: 删除重复的日志页面

**User Story:** As a developer, I want to have only one logs page at /settings/logs, so that the application has a cleaner route structure without duplicate functionality.

#### Acceptance Criteria

1. WHEN the user navigates to /logs THEN the system SHALL NOT render any page (route removed)
2. WHEN the application builds THEN the system SHALL NOT include the /log route file
3. WHEN the user wants to view logs THEN the system SHALL direct them to /settings/logs

### Requirement 4: 移除章节管理中的书籍选择功能

**User Story:** As a user, I want the chapters panel to always show chapters for the currently selected book, so that I cannot accidentally switch books while managing chapters.

#### Acceptance Criteria

1. WHEN the Chapters Panel renders THEN the system SHALL NOT display a book/project selector dropdown
2. WHEN the user selects a book from the Books Panel THEN the system SHALL automatically update the Chapters Panel to show that book's chapters
3. WHEN the Chapters Panel loads THEN the system SHALL use the globally selected project ID from the selection store
4. WHEN no book is selected globally THEN the system SHALL display a message prompting the user to select a book first

### Requirement 5: 移除章节管理中的新建绘画功能

**User Story:** As a user, I want drawings to be managed at the book level only, so that the data model correctly reflects that drawings belong to books, not chapters.

#### Acceptance Criteria

1. WHEN the chapter context menu opens THEN the system SHALL NOT display an "Add Canvas" or "Add Drawing" option
2. WHEN the user wants to create a drawing THEN the system SHALL require them to use the Drawings Panel which is at the book level
3. WHEN the database stores a drawing THEN the system SHALL associate it with a project ID only, not with a chapter ID

### Requirement 6: 添加 Git Tag 构建触发脚本

**User Story:** As a developer, I want npm scripts to create git tags that trigger CI/CD builds, so that I can easily release new versions.

#### Acceptance Criteria

1. WHEN the developer runs `npm run tag:desktop` THEN the system SHALL create a git tag in the format `desktop-v{version}` and push it to trigger the desktop release workflow
2. WHEN the developer runs `npm run tag:snap` THEN the system SHALL create a git tag in the format `snap-v{version}` and push it to trigger the Snap Store publish workflow
3. WHEN the developer runs `npm run tag:aur` THEN the system SHALL create a git tag in the format `aur-v{version}` and push it to trigger the AUR publish workflow
4. WHEN the developer runs `npm run tag:all` THEN the system SHALL create all three tags (desktop, snap, aur) and push them
5. WHEN creating a tag THEN the system SHALL read the current version from package.json or tauri.conf.json
