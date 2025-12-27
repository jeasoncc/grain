# Requirements Document

## Introduction

本需求文档描述将已完成的 Diary 和 Wiki 创建功能集成到 ActivityBar 组件中的需求，并修复 Ledger 文件夹结构的问题。

在 fp-architecture-refactor spec 中，我们已经完成了 `createDiaryCompatAsync` 和 `createWikiAsync` 等纯函数的实现。但是，ActivityBar 组件中的 `handleCreateDiary` 和 `handleCreateWiki` 回调函数仍然是占位符实现（只显示 "being reimplemented" toast）。

此外，E2E 测试发现 Ledger 创建功能存在以下问题：
1. **年份文件夹格式不一致** - Ledger 使用 `year-2024` 格式，而 Diary 使用 `year-2024-Dragon` 格式（带生肖）
2. **模板内容未正确显示** - 创建的 Ledger 文件可能没有正确的模板内容

本 spec 的目标是：
1. 将 Diary 和 Wiki 创建功能集成到 ActivityBar 中
2. 统一所有模板化文件的年份文件夹格式（使用带生肖的格式）

## Glossary

- **ActivityBar**: 应用左侧的活动栏组件，包含工作区选择、文件创建按钮等功能
- **Diary**: 日记文件，按日期自动组织到文件夹结构中（Diary > year-YYYY-Zodiac > month-MM-MonthName > day-DD-Weekday）
- **Wiki**: Wiki 条目文件，按年月组织到文件夹结构中（Wiki > year-YYYY > month-MM-MonthName）
- **Ledger**: 记账文件，已实现的模板化文件创建功能
- **EditorTabs**: 编辑器标签页，用于显示打开的文件
- **Toast**: 用于显示操作结果的通知消息

## Requirements

### Requirement 1: Diary 创建功能集成

**User Story:** As a user, I want to click the "New Diary" button in ActivityBar, so that I can quickly create a diary entry for today.

#### Acceptance Criteria

1. WHEN a user clicks the "New Diary" button AND a workspace is selected, THE ActivityBar SHALL call `createDiaryCompatAsync` with the current workspace ID and current date
2. WHEN the diary creation succeeds, THE ActivityBar SHALL open the newly created diary file in EditorTabs
3. WHEN the diary creation succeeds, THE ActivityBar SHALL display a success toast message "Diary created"
4. WHEN the diary creation fails, THE ActivityBar SHALL display an error toast message with the failure reason
5. IF no workspace is selected, THEN THE ActivityBar SHALL display an error toast "Please select a workspace first"

### Requirement 2: Wiki 创建功能集成

**User Story:** As a user, I want to click the "New Wiki" button in ActivityBar, so that I can create a new wiki entry with a custom title.

#### Acceptance Criteria

1. WHEN a user clicks the "New Wiki" button AND a workspace is selected, THE ActivityBar SHALL display a dialog prompting for the wiki title
2. WHEN the user enters a title and confirms, THE ActivityBar SHALL call `createWikiAsync` with the workspace ID and entered title
3. WHEN the wiki creation succeeds, THE ActivityBar SHALL open the newly created wiki file in EditorTabs
4. WHEN the wiki creation succeeds, THE ActivityBar SHALL display a success toast message "Wiki created"
5. WHEN the wiki creation fails, THE ActivityBar SHALL display an error toast message with the failure reason
6. WHEN the user cancels the dialog, THE ActivityBar SHALL not create any file
7. IF no workspace is selected, THEN THE ActivityBar SHALL display an error toast "Please select a workspace first"

### Requirement 3: Wiki 标题输入对话框

**User Story:** As a user, I want to enter a custom title for my wiki entry, so that I can organize my knowledge base effectively.

#### Acceptance Criteria

1. WHEN the wiki title dialog opens, THE Dialog SHALL display an input field with placeholder text "Enter wiki title"
2. WHEN the user types in the input field, THE Dialog SHALL update the input value in real-time
3. WHEN the user presses Enter in the input field, THE Dialog SHALL submit the form (same as clicking confirm)
4. WHEN the user clicks the confirm button with a non-empty title, THE Dialog SHALL close and trigger wiki creation
5. WHEN the user clicks the cancel button, THE Dialog SHALL close without creating a wiki
6. IF the user attempts to confirm with an empty title, THEN THE Dialog SHALL display a validation error "Please enter a wiki title"

### Requirement 4: 与现有 Ledger 功能保持一致

**User Story:** As a developer, I want the Diary and Wiki creation to follow the same pattern as Ledger creation, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Diary creation implementation SHALL follow the same pattern as `handleCreateLedger` in ActivityBar
2. THE Wiki creation implementation SHALL use the same error handling pattern as Ledger creation
3. THE Diary and Wiki creation SHALL use the same `openTab` function to open newly created files
4. THE Diary and Wiki creation SHALL use the same toast notification pattern as Ledger creation

### Requirement 5: 统一年份文件夹格式

**User Story:** As a user, I want all templated files (Diary, Wiki, Ledger) to use the same year folder format with zodiac animal, so that my file tree is consistent and organized.

#### Acceptance Criteria

1. THE Ledger year folder SHALL use the format `year-YYYY-{Zodiac}` (e.g., `year-2024-Dragon`)
2. THE Ledger year folder format SHALL be consistent with Diary year folder format
3. THE `ledgerConfig` SHALL use `getDateFolderStructure` from `@/fn/date` instead of `getLedgerFolderStructure` from `@/fn/ledger`
4. THE Ledger folder structure SHALL be: `Ledger > year-YYYY-{Zodiac} > month-MM-{MonthName} > ledger-{filename}`
5. THE `getLedgerFolderStructure` function MAY be deprecated or removed after migration

### Requirement 6: Ledger 模板内容修复

**User Story:** As a user, I want the Ledger file to have proper template content when created, so that I can start recording my finances immediately.

#### Acceptance Criteria

1. WHEN a Ledger file is created, THE System SHALL generate proper Lexical JSON content with Income, Expenses, Summary, and Notes sections
2. WHEN opening a newly created Ledger file, THE Editor SHALL display the template content correctly
3. THE Ledger template content SHALL include tags `#[ledger]` and `#[YYYY-MM-DD]`

### Requirement 7: E2E 测试验证

**User Story:** As a developer, I want the E2E tests to pass after integration, so that I can verify the functionality works correctly.

#### Acceptance Criteria

1. WHEN running the Diary E2E tests, THE tests SHALL pass for "Diary Folder Structure Created"
2. WHEN running the Diary E2E tests, THE tests SHALL pass for "Diary File Appears in File Tree"
3. WHEN running the Wiki E2E tests, THE tests SHALL pass for "Wiki Folder Structure Created"
4. WHEN running the Wiki E2E tests, THE tests SHALL pass for "Wiki File Appears in File Tree"
5. WHEN running the Ledger E2E tests, THE tests SHALL pass for "Ledger Folder Structure Created" with zodiac year format
6. WHEN running all E2E tests, THE overall pass rate SHALL be higher than the current 61.3%
