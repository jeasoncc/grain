# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用中 Excalidraw 编辑器性能优化的需求。用户报告在 Tauri 桌面应用中使用 Excalidraw 绘图时存在明显的卡顿和延迟问题，需要进行性能分析和优化。

## Glossary

- **Excalidraw**: 开源的手绘风格白板工具，用于创建图表和绘图
- **Tauri**: 基于 Rust 的跨平台桌面应用框架
- **WebView**: Tauri 使用的 Web 渲染引擎
- **Canvas**: HTML5 画布元素，Excalidraw 的渲染基础
- **Re-render**: React 组件重新渲染
- **Debounce**: 防抖，延迟执行函数直到停止调用一段时间后
- **ResizeObserver**: 监听元素尺寸变化的 Web API
- **Container_Component**: 容器组件，负责数据获取和状态管理
- **View_Component**: 展示组件，负责 UI 渲染

## Requirements

### Requirement 1: 性能分析和诊断

**User Story:** As a developer, I want to identify the root causes of Excalidraw lag, so that I can apply targeted optimizations.

#### Acceptance Criteria

1. WHEN analyzing performance THEN the System SHALL profile React component re-renders using React DevTools
2. WHEN analyzing performance THEN the System SHALL measure Canvas rendering frame rate
3. WHEN analyzing performance THEN the System SHALL identify unnecessary state updates in Container component
4. WHEN analyzing performance THEN the System SHALL check ResizeObserver callback frequency
5. WHEN analyzing performance THEN the System SHALL evaluate debounce timing for onChange handler

### Requirement 2: 减少不必要的重新渲染

**User Story:** As a user, I want smooth drawing experience without lag, so that I can create diagrams efficiently.

#### Acceptance Criteria

1. WHEN Excalidraw onChange fires THEN the Container_Component SHALL NOT trigger re-renders for state updates
2. WHEN container size changes THEN the View_Component SHALL only re-render if size change exceeds threshold
3. WHEN theme changes THEN the System SHALL only re-render Excalidraw component once
4. WHEN initialData is set THEN the System SHALL NOT re-parse content on subsequent renders
5. WHILE drawing THEN the System SHALL maintain at least 30 FPS frame rate

### Requirement 3: 优化状态管理

**User Story:** As a developer, I want efficient state management, so that drawing operations don't cause performance bottlenecks.

#### Acceptance Criteria

1. WHEN storing current drawing data THEN the System SHALL use refs instead of state for non-rendering data
2. WHEN tracking unsaved changes THEN the System SHALL use refs instead of state
3. WHEN updating save status THEN the System SHALL batch multiple status updates
4. IF save status updates too frequently THEN the System SHALL throttle status updates to maximum 1 per 500ms

### Requirement 4: 优化 ResizeObserver 处理

**User Story:** As a user, I want the canvas to resize smoothly without causing lag, so that I can adjust window size freely.

#### Acceptance Criteria

1. WHEN ResizeObserver fires THEN the System SHALL debounce size updates with at least 200ms delay
2. WHEN size changes are below threshold THEN the System SHALL ignore the resize event
3. WHEN initial layout is calculating THEN the System SHALL wait for stable size before rendering Excalidraw
4. WHILE resizing THEN the System SHALL NOT re-create Excalidraw instance

### Requirement 5: 优化自动保存机制

**User Story:** As a user, I want my drawings to auto-save without causing lag, so that I don't lose work and can draw smoothly.

#### Acceptance Criteria

1. WHEN auto-save triggers THEN the System SHALL NOT block the main thread
2. WHEN serializing drawing data THEN the System SHALL use efficient JSON serialization
3. WHEN multiple changes occur rapidly THEN the System SHALL coalesce saves using debounce
4. IF auto-save fails THEN the System SHALL retry without blocking drawing operations

### Requirement 6: Tauri WebView 优化

**User Story:** As a developer, I want to optimize Excalidraw for Tauri's WebView, so that performance matches native applications.

#### Acceptance Criteria

1. WHEN running in Tauri THEN the System SHALL check WebView hardware acceleration status
2. WHEN Canvas renders THEN the System SHALL use hardware-accelerated rendering if available
3. IF hardware acceleration is unavailable THEN the System SHALL log a warning and suggest solutions
4. WHEN Excalidraw initializes THEN the System SHALL configure optimal rendering settings for WebView

### Requirement 7: 内存管理优化

**User Story:** As a user, I want Excalidraw to use memory efficiently, so that the application remains responsive over time.

#### Acceptance Criteria

1. WHEN component unmounts THEN the System SHALL properly cleanup all event listeners
2. WHEN component unmounts THEN the System SHALL cancel pending debounced operations
3. WHEN switching between drawings THEN the System SHALL release previous drawing resources
4. WHILE editing large drawings THEN the System SHALL maintain stable memory usage

### Requirement 8: 测试和验证

**User Story:** As a developer, I want performance tests, so that I can verify optimizations are effective.

#### Acceptance Criteria

1. WHEN testing performance THEN the System SHALL measure frame rate during drawing operations
2. WHEN testing performance THEN the System SHALL measure time from input to visual feedback
3. WHEN testing performance THEN the System SHALL verify no memory leaks during extended use
4. WHEN all optimizations are applied THEN the System SHALL achieve at least 30 FPS during drawing

