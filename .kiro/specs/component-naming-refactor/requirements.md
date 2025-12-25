# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用组件命名重构的需求。目标是将所有组件迁移到新的命名规范，使用 `.fn.tsx` 后缀标识纯函数式组件，并按照 View/Container 模式组织组件结构。

## Glossary

- **View 组件**: 纯展示组件，只接收 props，无副作用，命名为 `xxx.view.fn.tsx`
- **Container 组件**: 容器组件，连接 hooks/stores，命名为 `xxx.container.fn.tsx`
- **纯函数式组件**: 使用 `memo()` 包裹，无内部业务状态，Props 驱动的组件
- **UI 状态**: 仅用于 UI 交互的状态（isOpen、isHovered 等）
- **业务状态**: 与业务数据相关的状态（nodes、user 等）

## Requirements

### Requirement 1: 重命名已有 View/Container 结构的组件

**User Story:** As a developer, I want components with existing View/Container structure renamed to follow the new naming convention, so that the codebase is consistent.

#### Acceptance Criteria

1. WHEN renaming activity-bar components THEN the System SHALL rename `activity-bar-view.tsx` to `activity-bar.view.fn.tsx`
2. WHEN renaming activity-bar components THEN the System SHALL rename `activity-bar-container.tsx` to `activity-bar.container.fn.tsx`
3. WHEN renaming components THEN the System SHALL update all import paths
4. WHEN renaming components THEN the System SHALL update the index.ts exports

### Requirement 2: 重构 blocks/ 目录中的组件

**User Story:** As a developer, I want blocks/ components refactored to follow the View/Container pattern, so that they are pure and testable.

#### Acceptance Criteria

1. WHEN refactoring wiki-hover-preview THEN the System SHALL rename `wiki-hover-preview.tsx` to `wiki-hover-preview.view.fn.tsx`
2. WHEN refactoring wiki-hover-preview THEN the System SHALL rename `wiki-hover-preview-connected.tsx` to `wiki-hover-preview.container.fn.tsx`
3. WHEN refactoring global-search THEN the System SHALL rename `global-search.tsx` to `global-search.view.fn.tsx`
4. WHEN refactoring global-search THEN the System SHALL rename `global-search-connected.tsx` to `global-search.container.fn.tsx`
5. WHEN refactoring single-file components THEN the System SHALL create View/Container split if the component has store/hook dependencies

### Requirement 3: 重构 file-tree/ 目录中的组件

**User Story:** As a developer, I want file-tree components refactored to follow the new naming convention, so that they are consistent with the architecture.

#### Acceptance Criteria

1. WHEN refactoring file-tree THEN the System SHALL rename `file-tree.tsx` to `file-tree.view.fn.tsx`
2. WHEN refactoring file-tree THEN the System SHALL create `file-tree.container.fn.tsx` if needed
3. WHEN refactoring file-tree-item THEN the System SHALL rename to `file-tree-item.view.fn.tsx`
4. WHEN refactoring file-tree THEN the System SHALL create `file-tree.types.ts` for shared types

### Requirement 4: 重构 panels/ 目录中的组件

**User Story:** As a developer, I want panels/ components refactored to follow the new naming convention, so that they are consistent with the architecture.

#### Acceptance Criteria

1. WHEN refactoring panels THEN the System SHALL analyze each panel for View/Container split
2. WHEN a panel has store dependencies THEN the System SHALL create Container component
3. WHEN a panel is pure THEN the System SHALL rename with `.view.fn.tsx` suffix
4. WHEN refactoring panels THEN the System SHALL create types files for each panel

### Requirement 5: 重构根级组件

**User Story:** As a developer, I want root-level components in components/ refactored to follow the new naming convention.

#### Acceptance Criteria

1. WHEN refactoring root components THEN the System SHALL move each to its own directory
2. WHEN refactoring root components THEN the System SHALL apply View/Container pattern
3. WHEN refactoring root components THEN the System SHALL create index.ts for each directory

### Requirement 6: 保持 ui/ 目录不变

**User Story:** As a developer, I want the ui/ directory (shadcn/ui) to remain unchanged, so that we don't break the UI library.

#### Acceptance Criteria

1. WHEN refactoring components THEN the System SHALL NOT modify files in `components/ui/`
2. WHEN refactoring components THEN the System SHALL NOT rename files in `components/ui/`

### Requirement 7: 验证重构结果

**User Story:** As a developer, I want the refactoring verified, so that the application still works correctly.

#### Acceptance Criteria

1. WHEN the refactoring is complete THEN the System SHALL pass TypeScript type checking
2. WHEN the refactoring is complete THEN the System SHALL pass all existing tests
3. WHEN the refactoring is complete THEN the System SHALL start without errors
4. WHEN the refactoring is complete THEN all components SHALL follow the new naming convention
