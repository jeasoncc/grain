# Implementation Plan

## Priority 1: Fix Diary Save (CRITICAL)

- [x] 1. Fix diary file save functionality
  - [x] 1.1 Update save service to support node type
    - Modify `apps/desktop/src/services/save.ts` to accept documentType parameter
    - Add logic to save to nodes table when documentType is "node"
    - Use `db.updateNode()` instead of `db.updateScene()` for node types
    - _Requirements: 6.2, 6.3_

  - [x] 1.2 Update story workspace save logic
    - Modify `apps/desktop/src/components/workspace/story-workspace.tsx`
    - Check active tab type before saving
    - Route to appropriate save function based on type (node vs scene)
    - _Requirements: 6.2, 6.3_

  - [x] 1.3 Update manual save hook to support node type
    - Modify `apps/desktop/src/hooks/use-manual-save.ts`
    - Pass document type to save service
    - _Requirements: 6.2_

  - [ ]* 1.4 Write property test for node content save round-trip
    - **Property 4: Node Content Save Round-Trip**
    - **Validates: Requirements 6.2, 6.3**

- [ ] 2. Checkpoint - Ensure diary save works
  - Ensure all tests pass, ask the user if questions arise.

## Priority 2: Add Calendar Icon to ActivityBar

- [x] 3. Add Calendar icon to ActivityBar for quick diary creation
  - Add Calendar icon button to ActivityBar navigation section
  - Wire up to createDiaryInFileTree function
  - Auto-open created diary in editor
  - Show error toast if no workspace selected
  - _Requirements: 2.1, 2.2_

- [ ] 4. Checkpoint - Ensure Calendar icon works
  - Ensure all tests pass, ask the user if questions arise.

## Completed Tasks

- [x] 5. Create Diary V2 Service
  - [x] 5.1 Create diary-v2.ts service file
    - Create `apps/desktop/src/services/diary-v2.ts`
    - Implement `getDiaryFolderStructure(date)` function
    - Implement zodiac, Chinese era, Chinese hour calculations
    - _Requirements: 1.1, 5.1_

  - [x] 5.2 Implement diary content generator
    - Generate org-mode style metadata in Lexical JSON format
    - Include TITLE, AUTHOR, DATE, YEAR, CREATE_TIME, DEVICE, TAGS
    - Include TODO section with Action items
    - Include Content section
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 5.3 Implement createDiaryInFileTree function
    - Get or create diary root folder (📔 日记)
    - Get or create year folder (year-YYYY-Zodiac)
    - Get or create month folder (month-MM-MonthName)
    - Get or create day folder (day-DD-Weekday)
    - Create diary file node with generated content
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 5.4 Write property test for diary folder structure
    - **Property 1: Diary Folder Auto-Creation**
    - **Validates: Requirements 1.2**

  - [ ]* 5.5 Write property test for diary filename format
    - **Property 2: Diary Filename Format**
    - **Validates: Requirements 5.1**

- [x] 6. Update FileTree Component
  - [x] 6.1 Add "New Diary" button to FileTree header
    - Add Calendar icon button next to folder/file buttons
    - Wire up to createDiaryInFileTree function
    - Auto-open created diary in editor
    - _Requirements: 3.1_

  - [x] 6.2 Update FileTreeProps interface
    - Add `onCreateDiary: () => void` prop
    - Pass handler from FileTreePanel
    - _Requirements: 3.1_

- [x] 7. Update FileTreePanel
  - [x] 7.1 Implement diary creation handler
    - Call createDiaryInFileTree with current workspaceId
    - Show success/error toast
    - Auto-select and open the new diary file
    - _Requirements: 1.1, 1.5_

- [x] 8. Simplify ActivityBar
  - [x] 8.1 Remove Library button
    - Remove "books" panel button from ActivityBar
    - Remove BooksPanel from unified-sidebar
    - _Requirements: 2.1, 2.5_

  - [x] 8.2 Remove Diary panel button
    - Remove "diary" panel button from ActivityBar
    - Remove DiaryPanel from unified-sidebar
    - _Requirements: 2.5, 3.2_

  - [x] 8.3 Add workspace selection to "..." menu
    - Add workspace dropdown/list to PopoverContent
    - Show all available workspaces
    - Highlight currently selected workspace
    - Handle workspace selection
    - _Requirements: 2.3, 2.4_

  - [x] 8.4 Add "New Workspace" option to "..." menu
    - Add button to create new workspace
    - Show dialog for workspace name input
    - _Requirements: 2.3_

- [x] 9. Create UI Settings Store
  - [x] 9.1 Create ui-settings store
    - Create `apps/desktop/src/stores/ui-settings.ts`
    - Add `tabPosition` state with "top" | "right-sidebar" type
    - Default to "right-sidebar"
    - Persist to localStorage
    - _Requirements: 4.1, 4.4_

  - [ ]* 9.2 Write property test for tab position persistence
    - **Property 3: Tab Position Persistence**
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [x] 10. Implement Tab Position Configuration
  - [x] 10.1 Add tab position setting to settings page
    - Add radio group or select for tab position
    - Options: "Top" and "Right Sidebar"
    - _Requirements: 4.1_

  - [x] 10.2 Update workspace layout to respect tab position
    - Read tabPosition from ui-settings store
    - Conditionally render tabs at top or in right sidebar
    - _Requirements: 4.2, 4.3_

- [x] 11. Cleanup Old Diary Code
  - [x] 11.1 Remove old diary panel
    - Delete `apps/desktop/src/components/panels/diary-panel.tsx`
    - Remove diary panel from unified-sidebar.tsx
    - _Requirements: 3.2_

  - [x] 11.2 Update unified-sidebar store
    - Remove "diary" from UnifiedSidebarPanel type
    - Remove diary-related state
    - _Requirements: 3.2_

- [ ] 12. Final Checkpoint - Ensure all changes work
  - Ensure all tests pass, ask the user if questions arise.
