# Requirements Document

## Introduction

本功能旨在提升小说编辑器的用户体验，包含三个核心改进：

1. **多编辑器实例**：将当前单编辑器切换模式改为多编辑器实例模式，每个打开的文件保持独立的编辑器实例，保留光标位置、撤销历史等状态
2. **Emacs 风格快捷键切换**：实现类似 Doom Emacs 的文件切换功能，通过快捷键打开弹窗快速搜索和切换已打开的文件
3. **可拖动侧边栏**：使左侧章节管理侧边栏支持拖动调整宽度，并在宽度小于阈值时自动隐藏

## Glossary

- **Editor Instance**: 一个独立的 Lexical 编辑器组件实例，包含完整的编辑状态（内容、光标、撤销历史、滚动位置）
- **Tab**: 编辑器标签页，代表一个打开的文件
- **Buffer Switcher**: Emacs 风格的文件切换弹窗，支持搜索和快捷键导航
- **Sidebar**: 左侧统一侧边栏，包含章节管理、搜索、Wiki 等面板
- **Resize Handle**: 可拖动的边界条，用于调整侧边栏宽度
- **Auto-collapse Threshold**: 侧边栏自动隐藏的宽度阈值

## Requirements

### Requirement 1

**User Story:** As a writer, I want each open file to have its own editor instance, so that I can preserve my editing state (cursor position, undo history, scroll position) when switching between files.

#### Acceptance Criteria

1. WHEN a user opens a new file THEN the System SHALL create a new editor instance for that file
2. WHEN a user switches between tabs THEN the System SHALL preserve the previous tab's editor state including cursor position, selection, and scroll position
3. WHEN a user performs undo/redo operations THEN the System SHALL apply them only to the active editor instance
4. WHILE multiple tabs are open THEN the System SHALL render all editor instances but display only the active one using CSS visibility
5. WHEN a user closes a tab THEN the System SHALL destroy the corresponding editor instance and release its memory
6. WHEN the application restarts THEN the System SHALL restore previously open tabs with their content but reset transient state (cursor, scroll)

### Requirement 2

**User Story:** As a power user, I want Emacs-style keyboard shortcuts to quickly switch between open files, so that I can navigate my workspace efficiently without using the mouse.

#### Acceptance Criteria

1. WHEN a user presses Ctrl+Tab THEN the System SHALL open the buffer switcher dialog showing all open tabs
2. WHEN a user presses Ctrl+Shift+Tab THEN the System SHALL open the buffer switcher dialog with reverse order selection
3. WHEN the buffer switcher is open AND the user types text THEN the System SHALL filter the tab list by fuzzy matching against file titles
4. WHEN the buffer switcher is open AND the user presses Enter THEN the System SHALL switch to the selected tab and close the dialog
5. WHEN the buffer switcher is open AND the user presses Escape THEN the System SHALL close the dialog without switching tabs
6. WHEN the buffer switcher is open AND the user presses Arrow Up/Down THEN the System SHALL navigate through the filtered list
7. WHEN the buffer switcher displays tabs THEN the System SHALL show file title, parent chapter name, and file type icon for each entry
8. WHEN the buffer switcher is open THEN the System SHALL highlight the currently active tab in the list

### Requirement 3

**User Story:** As a user, I want to resize the left sidebar by dragging its edge, so that I can customize my workspace layout according to my preferences.

#### Acceptance Criteria

1. WHEN a user hovers over the right edge of the sidebar THEN the System SHALL display a resize cursor indicator
2. WHEN a user drags the resize handle THEN the System SHALL adjust the sidebar width in real-time following the cursor position
3. WHILE the user is dragging THEN the System SHALL constrain the sidebar width between 200px minimum and 600px maximum
4. WHEN the sidebar width is dragged below 150px THEN the System SHALL automatically collapse and hide the sidebar
5. WHEN the sidebar is collapsed by dragging THEN the System SHALL provide a visual indicator or button to restore it
6. WHEN the user releases the drag handle THEN the System SHALL persist the new width to local storage
7. WHEN the application restarts THEN the System SHALL restore the previously saved sidebar width
8. WHEN the sidebar width changes THEN the System SHALL smoothly animate the main content area adjustment

