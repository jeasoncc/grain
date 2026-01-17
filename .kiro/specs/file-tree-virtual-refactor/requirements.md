# Requirements Document: File Tree Virtual Refactor

## Introduction

Refactor the file tree component to use a simpler, more performant architecture based on virtual scrolling and functional programming principles. Replace react-arborist with @tanstack/react-virtual + shadcn/ui components for better control, performance, and alignment with our architecture.

## Glossary

- **Virtual_List**: A rendering technique that only renders visible items in the DOM
- **Flat_Tree**: A tree structure flattened into a linear array for virtual rendering
- **Zustand_State**: Global state management using Zustand store
- **Shadcn_UI**: UI component library based on Radix UI
- **Tree_Node**: A single item in the file tree (file or folder)
- **Expand_State**: Boolean state indicating if a folder is expanded or collapsed

## Requirements

### Requirement 1: Virtual List Foundation

**User Story:** As a developer, I want the file tree to use virtual scrolling, so that it can handle thousands of files without performance degradation.

#### Acceptance Criteria

1. WHEN the file tree contains more than 100 nodes THEN only visible nodes SHALL be rendered in the DOM
2. WHEN the user scrolls the file tree THEN the system SHALL dynamically render and unmount nodes based on viewport position
3. WHEN measuring performance with 10,000 nodes THEN the initial render SHALL complete within 500ms
4. THE Virtual_List SHALL use @tanstack/react-virtual for virtual scrolling implementation
5. THE Virtual_List SHALL calculate item heights dynamically based on content

### Requirement 2: Tree Flattening Pipeline

**User Story:** As a developer, I want tree data to be flattened into a linear array, so that it can be efficiently rendered by the virtual list.

#### Acceptance Criteria

1. WHEN tree nodes are provided THEN the system SHALL flatten them into a linear array preserving hierarchy
2. WHEN a folder is collapsed THEN its children SHALL be excluded from the flattened array
3. WHEN a folder is expanded THEN its children SHALL be included in the flattened array at the correct position
4. THE flattening function SHALL be a pure function in pipes/node/
5. THE flattened array SHALL include depth information for each node for indentation rendering
6. THE flattening function SHALL preserve node order based on the order field

### Requirement 3: Zustand State Management

**User Story:** As a developer, I want all tree state managed by Zustand, so that state changes trigger automatic re-renders without manual synchronization.

#### Acceptance Criteria

1. WHEN a folder is toggled THEN the Zustand_State SHALL update the expanded state
2. WHEN Zustand_State changes THEN the tree SHALL automatically re-render with new data
3. THE Expand_State SHALL be stored as a Record<string, boolean> in Zustand
4. THE system SHALL NOT persist expand state to localStorage (runtime only)
5. WHEN workspace changes THEN the Expand_State SHALL be reset

### Requirement 4: Shadcn UI Components

**User Story:** As a developer, I want to use shadcn/ui components for rendering, so that the UI is consistent with the rest of the application.

#### Acceptance Criteria

1. THE file tree SHALL use shadcn/ui Button components for interactive elements
2. THE file tree SHALL use shadcn/ui styling patterns (Tailwind classes)
3. THE file tree SHALL use Lucide icons for folder/file icons
4. THE file tree SHALL maintain the current visual design and spacing
5. THE file tree SHALL support hover states and selection highlighting

### Requirement 5: Simplified Architecture

**User Story:** As a developer, I want a simple architecture without drag-and-drop complexity, so that the code is easier to maintain and debug.

#### Acceptance Criteria

1. THE system SHALL NOT implement drag-and-drop functionality
2. THE system SHALL support click to select files
3. THE system SHALL support click to expand/collapse folders
4. THE system SHALL support double-click to rename (future feature, not in this refactor)
5. THE system SHALL support right-click context menu
6. THE system SHALL support keyboard navigation (arrow keys, Enter, Space)

### Requirement 6: Remove react-arborist

**User Story:** As a developer, I want to remove react-arborist dependency, so that we have full control over the tree implementation.

#### Acceptance Criteria

1. WHEN the refactor is complete THEN react-arborist SHALL be removed from package.json
2. WHEN the refactor is complete THEN no imports from react-arborist SHALL exist in the codebase
3. THE system SHALL maintain all existing functionality (select, expand, collapse, create, delete, rename)
4. THE system SHALL maintain the current visual appearance
5. THE system SHALL improve or maintain current performance metrics

### Requirement 7: Functional Programming Compliance

**User Story:** As a developer, I want the implementation to follow functional programming principles, so that it aligns with our architecture guidelines.

#### Acceptance Criteria

1. THE tree flattening logic SHALL be implemented as pure functions in pipes/node/
2. THE tree rendering logic SHALL be in views/ layer
3. THE state binding logic SHALL be in hooks/ layer
4. THE system SHALL use readonly types for all data structures
5. THE system SHALL avoid mutations and use immutable updates
6. THE system SHALL follow the dependency rules (views → hooks → flows/state → pipes)

### Requirement 8: Performance Requirements

**User Story:** As a user, I want the file tree to be fast and responsive, so that I can work efficiently with large projects.

#### Acceptance Criteria

1. WHEN rendering 1,000 nodes THEN the initial render SHALL complete within 200ms
2. WHEN rendering 10,000 nodes THEN the initial render SHALL complete within 500ms
3. WHEN toggling a folder THEN the UI SHALL respond within 16ms (60fps)
4. WHEN scrolling THEN the frame rate SHALL maintain 60fps
5. THE system SHALL render only visible nodes plus a small overscan buffer

### Requirement 9: Maintain Existing Features

**User Story:** As a user, I want all current file tree features to continue working, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN clicking a file THEN the system SHALL select and open the file
2. WHEN clicking a folder THEN the system SHALL toggle expand/collapse
3. WHEN clicking expand all button THEN all folders SHALL expand
4. WHEN clicking collapse all button THEN all folders SHALL collapse
5. WHEN creating a new file/folder THEN ancestors SHALL auto-expand and scroll to the new item
6. WHEN right-clicking a node THEN the context menu SHALL appear with appropriate actions
7. THE system SHALL display appropriate icons for different file types
8. THE system SHALL show folder colors based on theme

### Requirement 10: Auto-expand and Scroll

**User Story:** As a user, I want newly created files to be visible immediately, so that I can start working with them right away.

#### Acceptance Criteria

1. WHEN a file is created THEN its ancestor folders SHALL automatically expand
2. WHEN a file is created THEN the tree SHALL scroll to make it visible
3. WHEN a folder is created THEN its ancestor folders SHALL automatically expand
4. WHEN a folder is created THEN the tree SHALL scroll to make it visible
5. THE auto-expand logic SHALL use the ancestor path calculation from pipes/node/

## Non-Functional Requirements

### Performance
- Virtual scrolling must handle 10,000+ nodes smoothly
- 60fps during scrolling and interactions
- Minimal re-renders on state changes

### Maintainability
- Clear separation of concerns (pipes/hooks/views)
- Pure functions for all data transformations
- Type-safe with TypeScript
- Well-documented code

### Compatibility
- Must work with existing Zustand state
- Must integrate with existing flows (create, delete, rename)
- Must maintain current keyboard shortcuts
- Must maintain current visual design

## Success Criteria

1. ✅ react-arborist removed from dependencies
2. ✅ @tanstack/react-virtual integrated
3. ✅ All existing features working
4. ✅ Performance improved or maintained
5. ✅ Code follows functional architecture
6. ✅ No regressions in user experience
7. ✅ Simpler, more maintainable codebase
