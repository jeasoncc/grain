# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用中 DiagramEditor（图表编辑器）的保存和渲染优化需求。当前实现中，每次代码变化都会触发实时渲染，导致编辑体验不佳。本规范旨在优化保存策略，使渲染只在保存后触发，而非每次输入时触发。

## Glossary

- **DiagramEditor**: 图表编辑器组件，支持 Mermaid 和 PlantUML 语法
- **Auto_Save**: 自动保存功能，在用户停止编辑后自动保存内容
- **Idle_Detection**: 空闲检测，检测用户是否停止编辑
- **Preview_Render**: 预览渲染，将图表代码渲染为 SVG 图像
- **Debounce**: 防抖，延迟执行直到一段时间内没有新的调用

## Requirements

### Requirement 1: 自动保存默认关闭

**User Story:** As a user, I want auto-save to be disabled by default for diagram editors, so that I can control when my changes are saved and rendered.

#### Acceptance Criteria

1. WHEN the DiagramEditor initializes THEN the System SHALL disable auto-save by default
2. THE System SHALL provide a setting to enable/disable auto-save for diagram editors
3. WHEN auto-save is disabled THEN the System SHALL only save content when the user manually triggers save (Ctrl+S)

### Requirement 2: 空闲检测保存

**User Story:** As a user, I want the system to save my diagram only when I stop editing, so that the preview doesn't constantly update while I'm typing.

#### Acceptance Criteria

1. WHEN auto-save is enabled THEN the System SHALL detect when the user stops editing
2. WHEN the user stops editing for the configured idle time THEN the System SHALL trigger auto-save
3. WHEN the user is actively editing THEN the System SHALL NOT trigger auto-save
4. THE System SHALL define "actively editing" as having typed within the last idle timeout period
5. WHEN the user resumes editing after an idle period THEN the System SHALL reset the idle timer

### Requirement 3: 可配置的保存延迟

**User Story:** As a user, I want to configure the auto-save delay time, so that I can balance between save frequency and editing experience.

#### Acceptance Criteria

1. THE System SHALL provide a configurable auto-save delay setting for diagram editors
2. THE System SHALL set the default auto-save delay to 60 seconds
3. WHEN the user changes the auto-save delay THEN the System SHALL apply the new delay immediately
4. THE System SHALL enforce a minimum auto-save delay of 10 seconds
5. THE System SHALL enforce a maximum auto-save delay of 300 seconds (5 minutes)

### Requirement 4: 基于保存的预览渲染

**User Story:** As a user, I want the diagram preview to update only after saving, so that I don't see constant flickering while typing.

#### Acceptance Criteria

1. WHEN content is saved (manually or auto-save) THEN the System SHALL trigger preview rendering
2. WHEN the user is typing THEN the System SHALL NOT trigger preview rendering
3. THE System SHALL provide visual feedback indicating unsaved changes
4. WHEN the user presses Ctrl+S THEN the System SHALL immediately save and render the preview

### Requirement 5: 保存状态指示

**User Story:** As a user, I want to see the save status of my diagram, so that I know when my changes are saved.

#### Acceptance Criteria

1. THE System SHALL display a visual indicator when there are unsaved changes
2. THE System SHALL display a visual indicator when saving is in progress
3. THE System SHALL display a visual indicator when content is saved
4. WHEN auto-save is disabled THEN the System SHALL clearly indicate this to the user

### Requirement 6: 设置界面

**User Story:** As a user, I want to configure diagram editor save settings in the settings page, so that I can customize my editing experience.

#### Acceptance Criteria

1. THE System SHALL provide diagram editor settings in the settings page
2. THE System SHALL allow toggling auto-save on/off
3. THE System SHALL allow configuring auto-save delay (when auto-save is enabled)
4. THE System SHALL persist these settings across sessions
