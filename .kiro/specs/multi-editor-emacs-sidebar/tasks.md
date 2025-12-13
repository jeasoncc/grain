# Implementation Plan

- [x] 1. Extend EditorTabsStore for multi-editor state management
  - [x] 1.1 Add EditorInstanceState interface and editorStates map to store
    - Add `EditorInstanceState` interface with serializedState, selectionState, scrollTop, scrollLeft, isDirty, lastModified
    - Add `editorStates: Record<string, EditorInstanceState>` to store state
    - Add `updateEditorState` and `getEditorState` actions
    - Update persist configuration to include editorStates
    - _Requirements: 1.1, 1.6_

  - [ ]* 1.2 Write property test for editor state isolation
    - **Property 1: Editor Instance Isolation**
    - **Validates: Requirements 1.1, 1.3**

  - [x] 1.3 Implement tab close cleanup logic
    - Modify `closeTab` action to also remove corresponding entry from editorStates
    - Ensure memory is properly released when tab is closed
    - _Requirements: 1.5_

  - [ ]* 1.4 Write property test for tab close cleanup
    - **Property 3: Tab Close Cleanup**
    - **Validates: Requirements 1.5**

- [x] 2. Create MultiEditorWorkspace component
  - [x] 2.1 Create base MultiEditorWorkspace component
    - Create new file `apps/desktop/src/components/workspace/multi-editor-workspace.tsx`
    - Implement rendering of all editor instances with CSS visibility control
    - Use absolute positioning to stack editors
    - Only active editor should have `visible` class, others `invisible`
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Implement scroll position tracking and restoration
    - Add scroll event listener to each editor container
    - Store scroll position in editorStates when scrolling
    - Restore scroll position when switching to a tab
    - _Requirements: 1.2_

  - [ ]* 2.3 Write property test for editor state preservation round-trip
    - **Property 2: Editor State Preservation Round-Trip**
    - **Validates: Requirements 1.2**

  - [x] 2.4 Integrate MultiEditorWorkspace into StoryWorkspace
    - Replace single MinimalEditor with MultiEditorWorkspace
    - Connect to EditorTabsStore for state management
    - Handle editor change events to update store
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Buffer Switcher component
  - [x] 4.1 Create fuzzyMatch utility function
    - Create `apps/desktop/src/lib/fuzzy-match.ts`
    - Implement fuzzy string matching algorithm
    - Support case-insensitive matching
    - Return match score for sorting
    - _Requirements: 2.3_

  - [ ]* 4.2 Write property test for fuzzy search filtering
    - **Property 4: Fuzzy Search Filtering**
    - **Validates: Requirements 2.3**

  - [x] 4.3 Create BufferSwitcher dialog component
    - Create `apps/desktop/src/components/buffer-switcher.tsx`
    - Use Dialog component from shadcn/ui
    - Implement search input with filtering
    - Display tab list with title, chapter name, and type icon
    - Highlight currently active tab
    - _Requirements: 2.1, 2.7, 2.8_

  - [ ]* 4.4 Write property test for buffer switcher tab display
    - **Property 5: Buffer Switcher Tab Display**
    - **Validates: Requirements 2.7**

  - [x] 4.5 Implement keyboard navigation in BufferSwitcher
    - Handle Arrow Up/Down for list navigation
    - Handle Enter to select and close
    - Handle Escape to close without selection
    - Track selected index state
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 4.6 Add global keyboard shortcuts for BufferSwitcher
    - Add Ctrl+Tab handler to open buffer switcher (forward)
    - Add Ctrl+Shift+Tab handler to open buffer switcher (backward)
    - Integrate with existing keyboard shortcut system in __root.tsx
    - _Requirements: 2.1, 2.2_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement resizable sidebar
  - [x] 6.1 Create ResizeHandle component
    - Create `apps/desktop/src/components/ui/resize-handle.tsx`
    - Implement mouse drag handling with mousedown/mousemove/mouseup
    - Show resize cursor on hover
    - Visual feedback during drag
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Extend UnifiedSidebarStore for resize functionality
    - Add `wasCollapsedByDrag` and `previousWidth` to store state
    - Update `setWidth` to enforce min/max constraints (200px-600px)
    - Add auto-collapse logic when width < 150px
    - Add `restoreFromCollapse` action to restore previous width
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ]* 6.3 Write property test for sidebar width constraints
    - **Property 6: Sidebar Width Constraints**
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 6.4 Write property test for sidebar width persistence
    - **Property 7: Sidebar Width Persistence Round-Trip**
    - **Validates: Requirements 3.6, 3.7**

  - [x] 6.5 Integrate ResizeHandle into UnifiedSidebar
    - Add ResizeHandle to right edge of UnifiedSidebar
    - Connect resize events to store actions
    - Add smooth transition animation for width changes
    - Show restore button when collapsed by drag
    - _Requirements: 3.2, 3.5, 3.8_

  - [x] 6.6 Ensure width persistence on drag end
    - Zustand persist middleware handles localStorage automatically
    - Verify width is restored on application restart
    - _Requirements: 3.6, 3.7_

- [ ] 7. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

