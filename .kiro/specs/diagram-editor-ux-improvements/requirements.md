# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用中 DiagramEditor（图表编辑器）的用户体验改进需求。主要包含两个功能：
1. Monaco 编辑器主题跟随应用主题变化
2. 编辑区和预览区支持可拖动调整大小

## Glossary

- **Monaco_Editor**: 微软开源的代码编辑器，VS Code 的核心组件
- **Theme**: 应用主题，包含颜色配置（如 Dracula、GitHub Dark、One Dark Pro 等）
- **DiagramEditor**: 图表编辑器组件，包含代码编辑区和预览区
- **Resizable_Panel**: 可调整大小的面板，使用 react-resizable-panels 库实现
- **Panel_Group**: 面板组，包含多个可调整大小的面板

## Requirements

### Requirement 1: Monaco 主题跟随应用主题

**User Story:** As a user, I want the Monaco editor theme to match my selected application theme, so that I have a consistent visual experience across the entire application.

#### Acceptance Criteria

1. WHEN the application theme changes THEN the Monaco_Editor SHALL update its theme to match the application theme colors
2. WHEN a new theme is selected THEN the Monaco_Editor SHALL use the theme's background, foreground, and syntax highlighting colors
3. WHEN the Monaco_Editor initializes THEN the System SHALL register a custom Monaco theme based on the current application theme
4. THE Monaco_Editor SHALL support all application themes including light themes (Default Light, GitHub Light, Solarized Light, etc.) and dark themes (Default Dark, Dracula, One Dark Pro, etc.)
5. WHEN switching themes THEN the Monaco_Editor SHALL update without requiring a page refresh

### Requirement 2: 可拖动调整编辑区和预览区大小

**User Story:** As a user, I want to resize the code editor and preview panels by dragging, so that I can adjust the layout to my preference.

#### Acceptance Criteria

1. WHEN viewing the DiagramEditor THEN the System SHALL display a draggable resize handle between the code editor and preview panels
2. WHEN dragging the resize handle THEN the System SHALL adjust the widths of both panels proportionally
3. WHEN resizing panels THEN the System SHALL enforce a minimum size of 20% for each panel
4. WHEN resizing panels THEN the System SHALL enforce a maximum size of 80% for each panel
5. WHEN the user releases the resize handle THEN the System SHALL persist the panel sizes to localStorage
6. WHEN the DiagramEditor loads THEN the System SHALL restore the previously saved panel sizes from localStorage
7. WHEN hovering over the resize handle THEN the System SHALL provide visual feedback (color change, cursor change)

### Requirement 3: 主题生成纯函数

**User Story:** As a developer, I want a pure function to generate Monaco themes from application themes, so that the code is testable and maintainable.

#### Acceptance Criteria

1. THE System SHALL provide a pure function `generateMonacoTheme` that converts application Theme to Monaco theme data
2. THE System SHALL provide a function `registerMonacoTheme` that registers the generated theme with Monaco
3. WHEN generating Monaco theme THEN the System SHALL map application theme colors to Monaco editor colors (background, foreground, selection, cursor, etc.)
4. WHEN generating Monaco theme THEN the System SHALL include syntax highlighting rules based on theme colors
5. THE System SHALL cache registered themes to avoid duplicate registration

### Requirement 4: 测试覆盖

**User Story:** As a developer, I want comprehensive tests for the new functionality, so that the features are reliable.

#### Acceptance Criteria

1. WHEN testing Monaco theme generation THEN the System SHALL have unit tests for `generateMonacoTheme` function
2. WHEN testing Monaco theme registration THEN the System SHALL have unit tests for `registerMonacoTheme` function
3. WHEN testing DiagramEditor THEN the System SHALL have tests for resizable panel behavior
4. WHEN all tests run THEN the System SHALL pass without errors
