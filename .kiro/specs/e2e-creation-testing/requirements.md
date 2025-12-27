# Requirements Document

## Introduction

本文档定义了使用 Puppeteer 进行端到端（E2E）测试的需求，覆盖 Grain 编辑器中 Diary（日记）、Wiki、Ledger（记账）和 Excalidraw（画板）四种文件类型的创建流程测试。

测试目标是验证用户通过 UI 界面创建各类文件的完整流程，确保：
- 文件创建功能正常工作
- 文件夹结构正确生成
- 文件内容正确初始化
- 创建后文件自动打开
- 错误处理正确显示

## Glossary

- **E2E_Test_Runner**: 端到端测试执行器，使用 Puppeteer 控制浏览器进行自动化测试
- **Activity_Bar**: 左侧活动栏组件，包含创建 Diary、Wiki、Ledger 等按钮
- **File_Tree**: 文件树组件，显示工作区中的文件和文件夹结构
- **Editor_Tabs**: 编辑器标签页组件，显示当前打开的文件
- **Workspace**: 工作区，用户数据的顶层容器
- **Node**: 文件或文件夹节点
- **Toast**: 提示消息组件，显示操作成功或失败信息

## Requirements

### Requirement 1: E2E 测试基础设施

**User Story:** As a developer, I want to set up Puppeteer E2E testing infrastructure, so that I can run automated browser tests for the desktop application.

#### Acceptance Criteria

1. THE E2E_Test_Runner SHALL be configured with Puppeteer to launch and control a browser instance
2. THE E2E_Test_Runner SHALL connect to the development server at `http://localhost:5173`
3. THE E2E_Test_Runner SHALL wait for the application to fully load before executing tests
4. THE E2E_Test_Runner SHALL capture screenshots on test failures for debugging
5. THE E2E_Test_Runner SHALL clean up browser resources after test completion
6. IF the development server is not running, THEN THE E2E_Test_Runner SHALL display a clear error message

### Requirement 2: Workspace 初始化测试

**User Story:** As a developer, I want to verify workspace initialization, so that I can ensure the application starts correctly with a default workspace.

#### Acceptance Criteria

1. WHEN the application loads for the first time, THE E2E_Test_Runner SHALL verify that a default workspace is created
2. WHEN a workspace exists, THE E2E_Test_Runner SHALL verify that the Activity_Bar displays the workspace selector
3. WHEN a workspace is selected, THE E2E_Test_Runner SHALL verify that the File_Tree is displayed
4. THE E2E_Test_Runner SHALL verify that the Activity_Bar contains buttons for creating Diary, Wiki, Ledger, and Excalidraw files

### Requirement 3: Diary 创建流程测试

**User Story:** As a developer, I want to test the Diary creation flow, so that I can ensure users can create diary entries through the UI.

#### Acceptance Criteria

1. WHEN the user clicks the "New Diary" button in Activity_Bar, THE E2E_Test_Runner SHALL verify that a new diary file is created
2. WHEN a diary is created, THE E2E_Test_Runner SHALL verify that the correct folder structure is generated (Diary > year-YYYY-{Zodiac} > month-MM-{Month} > day-DD-{Weekday})
3. WHEN a diary is created, THE E2E_Test_Runner SHALL verify that the file appears in the File_Tree
4. WHEN a diary is created, THE E2E_Test_Runner SHALL verify that the file is automatically opened in Editor_Tabs
5. WHEN a diary is created, THE E2E_Test_Runner SHALL verify that a success Toast message is displayed
6. IF no workspace is selected, THEN THE E2E_Test_Runner SHALL verify that an error Toast message is displayed

### Requirement 4: Wiki 创建流程测试

**User Story:** As a developer, I want to test the Wiki creation flow, so that I can ensure users can create wiki entries through the UI.

#### Acceptance Criteria

1. WHEN the user clicks the "New Wiki" button in Activity_Bar, THE E2E_Test_Runner SHALL verify that a wiki creation dialog or prompt appears
2. WHEN the user enters a wiki title and confirms, THE E2E_Test_Runner SHALL verify that a new wiki file is created
3. WHEN a wiki is created, THE E2E_Test_Runner SHALL verify that the correct folder structure is generated (Wiki > year-YYYY > month-MM-{MonthName})
4. WHEN a wiki is created, THE E2E_Test_Runner SHALL verify that the file appears in the File_Tree with the correct title
5. WHEN a wiki is created, THE E2E_Test_Runner SHALL verify that the file is automatically opened in Editor_Tabs
6. WHEN a wiki is created, THE E2E_Test_Runner SHALL verify that a success Toast message is displayed
7. IF the user cancels wiki creation, THEN THE E2E_Test_Runner SHALL verify that no file is created

### Requirement 5: Ledger 创建流程测试

**User Story:** As a developer, I want to test the Ledger creation flow, so that I can ensure users can create ledger entries through the UI.

#### Acceptance Criteria

1. WHEN the user clicks the "New Ledger" button in Activity_Bar, THE E2E_Test_Runner SHALL verify that a new ledger file is created
2. WHEN a ledger is created, THE E2E_Test_Runner SHALL verify that the correct folder structure is generated (Ledger > year-YYYY > month-MM-{MonthName})
3. WHEN a ledger is created, THE E2E_Test_Runner SHALL verify that the file appears in the File_Tree
4. WHEN a ledger is created, THE E2E_Test_Runner SHALL verify that the file is automatically opened in Editor_Tabs
5. WHEN a ledger is created, THE E2E_Test_Runner SHALL verify that a success Toast message is displayed
6. IF no workspace is selected, THEN THE E2E_Test_Runner SHALL verify that an error Toast message is displayed

### Requirement 6: Excalidraw 创建流程测试

**User Story:** As a developer, I want to test the Excalidraw creation flow, so that I can ensure users can create drawing files through the UI.

#### Acceptance Criteria

1. WHEN the user triggers Excalidraw creation (via menu or button), THE E2E_Test_Runner SHALL verify that a new excalidraw file is created
2. WHEN an excalidraw is created, THE E2E_Test_Runner SHALL verify that the correct folder structure is generated (excalidraw > year-YYYY-{Zodiac} > month-MM-{Month} > day-DD-{Weekday})
3. WHEN an excalidraw is created, THE E2E_Test_Runner SHALL verify that the file appears in the File_Tree
4. WHEN an excalidraw is created, THE E2E_Test_Runner SHALL verify that the file is automatically opened in Editor_Tabs
5. WHEN an excalidraw is created, THE E2E_Test_Runner SHALL verify that a success Toast message is displayed

### Requirement 7: UI 元素选择器规范

**User Story:** As a developer, I want to define consistent data-testid attributes, so that E2E tests can reliably locate UI elements.

#### Acceptance Criteria

1. THE Activity_Bar SHALL have `data-testid="activity-bar"` attribute
2. THE Activity_Bar buttons SHALL have the following data-testid attributes:
   - New Diary button: `data-testid="btn-new-diary"`
   - New Wiki button: `data-testid="btn-new-wiki"`
   - New Ledger button: `data-testid="btn-new-ledger"`
3. THE File_Tree SHALL have `data-testid="file-tree"` attribute
4. EACH File_Tree item SHALL have `data-testid="file-tree-item"` and `data-node-id` attributes
5. THE Editor_Tabs SHALL have `data-testid="editor-tabs"` attribute
6. EACH Editor_Tab SHALL have `data-testid="editor-tab"` and `data-node-id` attributes
7. THE Toast container SHALL have `data-testid="toast-container"` attribute

### Requirement 8: 测试报告和问题记录

**User Story:** As a developer, I want to generate test reports and record issues, so that I can track test results and fix problems.

#### Acceptance Criteria

1. THE E2E_Test_Runner SHALL generate a test report after each test run
2. THE E2E_Test_Runner SHALL record any discovered issues in a structured format
3. WHEN a test fails, THE E2E_Test_Runner SHALL capture a screenshot and include it in the report
4. THE E2E_Test_Runner SHALL record the following for each issue:
   - Issue description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshot (if applicable)
5. THE E2E_Test_Runner SHALL output a summary of passed/failed tests at the end of the run
