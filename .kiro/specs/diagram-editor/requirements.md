# Requirements Document

## Introduction

为 Grain 编辑器添加 Mermaid 和 PlantUML 图表编辑功能。用户可以像创建日记、Wiki 一样创建图表文件，并在编辑器中实时预览图表渲染结果。图表通过 Kroki 服务进行渲染。

## Glossary

- **Diagram_Editor**: 图表编辑器组件，包含代码编辑区和预览区
- **Kroki_Service**: 图表渲染服务，支持 Mermaid 和 PlantUML
- **Mermaid_Config**: Mermaid 图表的模板配置
- **PlantUML_Config**: PlantUML 图表的模板配置
- **Date_Template_Factory**: 日期模板配置工厂函数

## Requirements

### Requirement 1: Mermaid 模板配置

**User Story:** As a user, I want to create Mermaid diagram files with the same folder structure as diary, so that I can organize my diagrams by date.

#### Acceptance Criteria

1. WHEN creating a Mermaid file, THE Mermaid_Config SHALL use `"mermaid"` as fileType
2. WHEN creating a Mermaid file, THE System SHALL generate folder path using Date_Template_Factory
3. THE Mermaid_Config SHALL use `"Mermaid"` as rootFolder
4. THE Mermaid_Config SHALL use `"mermaid"` as tag
5. WHEN a Mermaid file is created, THE System SHALL generate default Mermaid content with flowchart template

### Requirement 2: PlantUML 模板配置

**User Story:** As a user, I want to create PlantUML diagram files with the same folder structure as diary, so that I can organize my diagrams by date.

#### Acceptance Criteria

1. WHEN creating a PlantUML file, THE PlantUML_Config SHALL use `"plantuml"` as fileType
2. WHEN creating a PlantUML file, THE System SHALL generate folder path using Date_Template_Factory
3. THE PlantUML_Config SHALL use `"PlantUML"` as rootFolder
4. THE PlantUML_Config SHALL use `"plantuml"` as tag
5. WHEN a PlantUML file is created, THE System SHALL generate default PlantUML content with sequence diagram template

### Requirement 3: 图表编辑器组件

**User Story:** As a user, I want to edit diagram code and see real-time preview, so that I can create diagrams efficiently.

#### Acceptance Criteria

1. THE Diagram_Editor SHALL display a split view with code editor on left and preview on right
2. WHEN user types in code editor, THE System SHALL update preview after debounce delay
3. THE Diagram_Editor SHALL support both Mermaid and PlantUML syntax based on file type
4. IF Kroki_Service is not configured, THEN THE System SHALL display configuration prompt
5. WHEN preview fails, THE System SHALL display error message with details

### Requirement 4: Kroki 服务集成

**User Story:** As a user, I want diagrams to be rendered using Kroki service, so that I can see accurate diagram previews.

#### Acceptance Criteria

1. WHEN rendering Mermaid diagram, THE System SHALL call Kroki Mermaid endpoint
2. WHEN rendering PlantUML diagram, THE System SHALL call Kroki PlantUML endpoint
3. THE System SHALL use existing Kroki configuration from diagram.store
4. IF Kroki server URL is empty, THEN THE System SHALL prompt user to configure it
5. WHEN Kroki request fails, THE System SHALL display error and allow retry

### Requirement 5: 工作空间集成

**User Story:** As a user, I want to open diagram files in the workspace editor, so that I can edit them like other files.

#### Acceptance Criteria

1. WHEN opening a mermaid type node, THE Story_Workspace SHALL render Diagram_Editor
2. WHEN opening a plantuml type node, THE Story_Workspace SHALL render Diagram_Editor
3. THE Diagram_Editor SHALL load content from node and save changes to database
4. WHEN switching tabs, THE System SHALL preserve editor state

### Requirement 6: Activity Bar 集成

**User Story:** As a user, I want to create diagram files from the activity bar icon buttons, so that I can quickly add new diagrams like diary.

#### Acceptance Criteria

1. THE Activity_Bar SHALL display a "New Mermaid" icon button
2. THE Activity_Bar SHALL display a "New PlantUML" icon button
3. WHEN user clicks "New Mermaid" button, THE System SHALL create mermaid file and open it in editor
4. WHEN user clicks "New PlantUML" button, THE System SHALL create plantuml file and open it in editor
5. THE icon buttons SHALL follow the same style as existing buttons (Diary, Wiki, etc.)

