# Requirements Document

## Introduction

本需求文档描述将日记功能整合到文件树中，并简化整体 UI 的改进方案。目标是：
1. 将日记作为文件树中的特殊文件夹，而非独立模块
2. 简化 ActivityBar，将工作空间选择移到 "..." 菜单，但保留日历图标用于快速创建日记
3. 支持 Tab 标签位置配置（顶部或右侧边栏）
4. 日记文件格式与 org-roam 兼容
5. 确保日记文件能够正确保存

## Glossary

- **Workspace**: 工作空间，对应 projects 表
- **Node**: 文件树节点，可以是 folder、file 或 canvas，存储在 nodes 表中
- **Scene**: 场景，存储在 scenes 表中（旧结构）
- **Diary Folder**: 日记文件夹，位于工作空间根目录的 `📔 日记` 文件夹
- **Org-roam**: Emacs 的笔记管理系统，使用特定的文件夹和文件命名规范
- **Chinese Era**: 中国天干地支纪年法
- **Chinese Hour**: 中国十二时辰

## Requirements

### Requirement 1: 日记整合到文件树

**User Story:** As a user, I want to create diary entries within the file tree, so that I can manage all my content in one unified structure.

#### Acceptance Criteria

1. WHEN a user clicks the "New Diary" button THEN the system SHALL create a diary file in the correct folder hierarchy: `📔 日记/year-YYYY-Zodiac/month-MM-MonthName/day-DD-Weekday/diary-timestamp-HH-MM-SS`
2. WHEN the diary folder structure does not exist THEN the system SHALL automatically create the required year, month, and day folders
3. WHEN a diary file is created THEN the system SHALL populate it with org-roam compatible metadata including title, author, date, Chinese era, Chinese hour, device info, and tags
4. WHEN a diary file is created THEN the system SHALL include TODO section with Action items and Mermaid gantt chart template
5. WHEN a user opens a diary file THEN the system SHALL display it in the editor like any other file

### Requirement 2: 简化 ActivityBar 但保留日历图标

**User Story:** As a user, I want a cleaner ActivityBar with less frequently used options hidden, but keep the calendar icon for quick diary creation, so that I can focus on my primary tasks while still having easy access to create diary entries.

#### Acceptance Criteria

1. WHEN the user views the ActivityBar THEN the system SHALL display essential navigation items: Files, Wiki, Search, Outline, Statistics, Settings, and a Calendar icon for diary creation
2. WHEN the user clicks the Calendar icon THEN the system SHALL create a new diary entry in the current workspace and open it in the editor
3. WHEN the user clicks the "..." menu THEN the system SHALL display workspace selection, import, export, and delete options
4. WHEN the user selects a workspace from the "..." menu THEN the system SHALL switch to that workspace and update the file tree
5. WHEN the ActivityBar loads THEN the system SHALL remove the separate Library button but keep the Calendar icon

### Requirement 3: 移除独立日记面板

**User Story:** As a user, I want diary functionality integrated into the file tree, so that I have a unified content management experience.

#### Acceptance Criteria

1. WHEN the user wants to create a diary THEN the system SHALL provide a "New Diary" button in the file tree header
2. WHEN the diary panel is removed THEN the system SHALL preserve all existing diary data by migrating to the nodes structure
3. WHEN the user accesses old diary entries THEN the system SHALL display them through the file tree

### Requirement 4: Tab 标签位置配置

**User Story:** As a user, I want to configure where my editor tabs appear, so that I can customize my workspace layout.

#### Acceptance Criteria

1. WHEN the user opens settings THEN the system SHALL display a tab position option with choices: "top" or "right-sidebar"
2. WHEN the user selects "top" THEN the system SHALL display tabs above the editor area
3. WHEN the user selects "right-sidebar" THEN the system SHALL display tabs in the right sidebar panel
4. WHEN the application starts THEN the system SHALL default to "right-sidebar" tab position

### Requirement 5: 日记文件格式兼容 Org-roam

**User Story:** As an org-roam user, I want diary files to follow the same format as my shell script, so that I can maintain consistency across tools.

#### Acceptance Criteria

1. WHEN a diary file is created THEN the system SHALL use the filename format: `diary-{timestamp}-{HH-MM-SS}` (using hyphens instead of colons for cross-platform compatibility)
2. WHEN a diary file is created THEN the system SHALL include org-mode style headers in the following format:
   - `#+TITLE: My Document`
   - `#+AUTHOR: {author_name}` (configurable)
   - `#+Email: {email}` (configurable)
   - `#+DATE: {YYYY-MM-DD}`
   - `#+YEAR: {Chinese_Era} {Zodiac}` (e.g., "乙巳 Snake" for 2025)
   - `#+CREATE_TIME: {YYYY-MM-DD HH:mm:ss} {Chinese_Hour}` (e.g., "2025-12-14 17:36:25 酉时")
   - `#+DEVICE: {OS_info}` (e.g., "Linux archlinux 6.17.9-zen1-1-zen...")
   - `#+TAGS: org-mode, notes, document`
   - `#+OPTIONS: toc:nil`
   - `#+TOC: headlines`
   - `#+HTML_HEAD: <link rel="stylesheet" ...>` (optional CSS link)
3. WHEN a diary file is created THEN the system SHALL include a TODO section with Action items placeholder
4. WHEN a diary file is created THEN the system SHALL include a Content section
5. WHEN a diary file is created THEN the system SHALL NOT include Mermaid gantt chart template (removed per user preference)

### Requirement 6: 日记文件保存功能

**User Story:** As a user, I want to save my diary entries, so that my writing is persisted and not lost.

#### Acceptance Criteria

1. WHEN a user edits a diary file (node type) THEN the system SHALL track changes and mark the file as dirty
2. WHEN a user presses Ctrl+S or triggers manual save on a diary file THEN the system SHALL save the content to the nodes table using updateNode
3. WHEN auto-save is enabled and a diary file is modified THEN the system SHALL automatically save the content after the configured delay
4. WHEN a diary file is saved successfully THEN the system SHALL display a success toast notification
5. WHEN a diary file save fails THEN the system SHALL display an error toast notification with the error message
