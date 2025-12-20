# Implementation Plan

## Phase 1: Create Domain Modules

- [x] 1. Create Selection Domain Module
  - [x] 1.1 Create `src/domain/selection/selection.interface.ts` with SelectionState and SelectionActions interfaces
    - Define readonly state properties: selectedWorkspaceId, selectedNodeId
    - Define action types for state mutations
    - _Requirements: 1.1, 3.1, 3.2_
  - [x] 1.2 Create `src/domain/selection/selection.store.ts` with Zustand + Immer implementation
    - Implement store with persist middleware
    - Use partialize to persist only selectedWorkspaceId
    - Provide selector hooks: useSelectedWorkspaceId, useSelectedNodeId
    - _Requirements: 1.2, 6.1, 6.3, 6.5_
  - [x] 1.3 Create `src/domain/selection/index.ts` with grouped exports
    - Export types, store, and hooks
    - _Requirements: 1.5, 7.5_
  - [ ]* 1.4 Write property test for selection store persistence
    - **Property 8: Store State Persistence Round Trip**
    - **Validates: Requirements 6.3**

- [x] 2. Create UI Domain Module
  - [x] 2.1 Create `src/domain/ui/ui.interface.ts` with UIState and UIActions interfaces
    - Define types: RightPanelView, TabPosition
    - Define readonly state properties
    - _Requirements: 1.1, 3.1, 3.2_
  - [x] 2.2 Create `src/domain/ui/ui.store.ts` with Zustand + Immer implementation
    - Implement store with persist middleware
    - Partialize: rightSidebarOpen, tabPosition, locale
    - Provide selector hooks
    - _Requirements: 1.2, 6.1, 6.3, 6.5_
  - [x] 2.3 Create `src/domain/ui/index.ts` with grouped exports
    - _Requirements: 1.5, 7.5_
  - [ ]* 2.4 Write property test for UI store persistence
    - **Property 9: Store Partialize Controls Persistence**
    - **Validates: Requirements 6.5**

- [x] 3. Create Theme Domain Module
  - [x] 3.1 Create `src/domain/theme/theme.interface.ts` with ThemeState and ThemeActions interfaces
    - Define ThemeMode type
    - Define readonly state properties
    - _Requirements: 1.1, 3.1, 3.2_
  - [x] 3.2 Create `src/domain/theme/theme.utils.ts` with pure utility functions
    - Extract getSystemTheme() as pure function
    - Extract applyThemeWithTransition() logic
    - _Requirements: 1.4, 5.1, 5.2_
  - [x] 3.3 Create `src/domain/theme/theme.store.ts` with Zustand + Immer implementation
    - Implement store with persist middleware
    - Include initializeTheme() function
    - Include useTheme() convenience hook
    - _Requirements: 1.2, 6.1, 6.3_
  - [x] 3.4 Create `src/domain/theme/index.ts` with grouped exports
    - _Requirements: 1.5, 7.5_
  - [x] 3.5 Write property test for theme utility functions
    - **Property 1: Pure Functions Produce Consistent Output**
    - **Validates: Requirements 5.1**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create Font Domain Module
  - [x] 5.1 Create `src/domain/font/font.interface.ts` with FontState and FontActions interfaces
    - Define readonly state properties for all font settings
    - Define configuration constants: DEFAULT_EDITOR_FONT, DEFAULT_UI_FONT, etc.
    - _Requirements: 1.1, 3.1, 3.2, 3.3_
  - [x] 5.2 Create `src/domain/font/font.store.ts` with Zustand + Immer implementation
    - Implement store with persist middleware
    - Include value clamping in setters (fontSize, lineHeight, etc.)
    - Include reset() action
    - _Requirements: 1.2, 6.1, 6.3_
  - [x] 5.3 Create `src/domain/font/index.ts` with grouped exports
    - _Requirements: 1.5, 7.5_
  - [x] 5.4 Write property test for font value clamping
    - **Property 10: Store Migration Preserves Functionality**
    - **Validates: Requirements 2.7**

- [x] 6. Create Writing Domain Module
  - [x] 6.1 Create `src/domain/writing/writing.interface.ts` with WritingState and WritingActions interfaces
    - Define WritingGoal and WritingSession interfaces
    - Define readonly state properties
    - _Requirements: 1.1, 3.1, 3.2_
  - [x] 6.2 Create `src/domain/writing/writing.utils.ts` with pure utility functions
    - Extract getTodayDate() as pure function
    - Extract word count calculation logic
    - _Requirements: 1.4, 5.1, 5.2_
  - [x] 6.3 Create `src/domain/writing/writing.store.ts` with Zustand + Immer implementation
    - Implement store with persist middleware
    - Partialize: typewriterMode, writingGoal, todayWordCount, todayDate, minimalToolbar
    - _Requirements: 1.2, 6.1, 6.3, 6.5_
  - [x] 6.4 Create `src/domain/writing/index.ts` with grouped exports
    - _Requirements: 1.5, 7.5_
  - [ ] 6.5 Write property test for writing utility functions
    - **Property 2: Utility Functions Do Not Mutate Input**
    - **Validates: Requirements 5.2**

- [x] 7. Create Sidebar Domain Module
  - [x] 7.1 Create `src/domain/sidebar/sidebar.interface.ts` with SidebarState and SidebarActions interfaces
    - Define SidebarPanel type
    - Define SearchPanelState, DrawingsPanelState, FileTreeState interfaces
    - Define sidebar width constants
    - _Requirements: 1.1, 3.1, 3.2, 3.3_
  - [x] 7.2 Create `src/domain/sidebar/sidebar.store.ts` with Zustand + Immer implementation
    - Implement store with persist middleware
    - Include all panel-specific actions
    - Include resizeSidebar with auto-collapse logic
    - _Requirements: 1.2, 6.1, 6.3_
  - [x] 7.3 Create `src/domain/sidebar/index.ts` with grouped exports
    - _Requirements: 1.5, 7.5_
  - [ ]* 7.4 Write property test for sidebar width constraints
    - **Property 3: Immutable Updates Return New References**
    - **Validates: Requirements 5.3**

- [x] 8. Checkpoint - Ensure all tests pass
  - All 14 tests passed (2 test files)
  - Renamed scroll-behavior.test.ts to scroll-behavior.manual.ts (not a vitest test)

## Phase 2: Update Imports and Remove Legacy Code

- [x] 9. Update all component imports
  - [x] 9.1 Find and update all imports from `@/stores/selection` to `@/domain/selection`
    - Use grep to find all usages
    - Update import paths
    - _Requirements: 8.2_
  - [x] 9.2 Find and update all imports from `@/stores/ui` to `@/domain/ui`
    - _Requirements: 8.2_
  - [x] 9.3 Find and update all imports from `@/stores/theme` to `@/domain/theme`
    - _Requirements: 8.2_
  - [x] 9.4 Find and update all imports from `@/stores/font` to `@/domain/font`
    - _Requirements: 8.2_
  - [x] 9.5 Find and update all imports from `@/stores/writing` to `@/domain/writing`
    - _Requirements: 8.2_
  - [x] 9.6 Find and update all imports from `@/stores/unified-sidebar` to `@/domain/sidebar`
    - _Requirements: 8.2_
  - [x] 9.7 Find and update all imports from `@/stores/editor-tabs` to `@/domain/editor-tabs`
    - _Requirements: 8.2_

- [x] 10. Remove legacy store files
  - [x] 10.1 Delete `src/stores/selection.ts`
    - _Requirements: 2.8, 8.1_
  - [x] 10.2 Delete `src/stores/ui.ts` and `src/stores/ui-settings.ts`
    - _Requirements: 2.8, 8.1_
  - [x] 10.3 Delete `src/stores/theme.ts`
    - _Requirements: 2.8, 8.1_
  - [x] 10.4 Delete `src/stores/font.ts`
    - _Requirements: 2.8, 8.1_
  - [x] 10.5 Delete `src/stores/writing.ts`
    - _Requirements: 2.8, 8.1_
  - [x] 10.6 Delete `src/stores/unified-sidebar.ts`
    - _Requirements: 2.8, 8.1_
  - [x] 10.7 Delete `src/stores/editor-tabs.ts` (duplicate)
    - _Requirements: 8.3_
  - [x] 10.8 Delete remaining files in `src/stores/` directory if any
    - _Requirements: 8.1_

- [ ] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Property-Based Tests for Builders (Optional)

- [ ]* 12. Write property tests for existing editor-tabs builders
  - [ ]* 12.1 Write property test for EditorTabBuilder method chaining
    - **Property 4: Builder Method Chaining**
    - **Validates: Requirements 4.2**
  - [ ]* 12.2 Write property test for EditorTabBuilder from() method
    - **Property 5: Builder From Method Round Trip**
    - **Validates: Requirements 4.3**
  - [ ]* 12.3 Write property test for EditorTabBuilder validation
    - **Property 6: Builder Validation**
    - **Validates: Requirements 4.4**
  - [ ]* 12.4 Write property test for EditorTabBuilder immutability
    - **Property 7: Builder Produces Immutable Objects**
    - **Validates: Requirements 4.5**
