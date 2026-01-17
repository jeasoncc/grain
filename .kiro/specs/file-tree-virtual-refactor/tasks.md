# Implementation Plan: File Tree Virtual Refactor

## Overview

Refactor file tree to use @tanstack/react-virtual with functional architecture. Replace react-arborist with simpler, more performant implementation.

## Tasks

- [x] 1. Setup and Dependencies
  - Install @tanstack/react-virtual
  - Update package.json
  - _Requirements: 1.4, 6.1_

- [x] 2. Create Tree Flattening Pipe
  - [x] 2.1 Create `flatten-tree.pipe.ts` with `flattenTree` function
    - Accept nodes array and expandedFolders map
    - Return FlatTreeNode array with depth information
    - Handle collapsed folders (exclude children)
    - Handle expanded folders (include children)
    - Preserve node order
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [ ]* 2.2 Write property test for tree structure preservation
    - **Property 1: Flattening preserves tree structure**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 2.3 Write property test for visible nodes correctness
    - **Property 2: Visible nodes match expand state**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 2.4 Write property test for depth calculation
    - **Property 3: Depth calculation is correct**
    - **Validates: Requirements 2.5**

  - [ ]* 2.5 Write property test for order preservation
    - **Property 4: Node order is preserved**
    - **Validates: Requirements 2.6**

  - [x] 2.6 Export from `pipes/node/index.ts`
    - _Requirements: 2.4_

- [x] 3. Update Type Definitions
  - [x] 3.1 Add `FlatTreeNode` interface to `types/node/node.interface.ts`
    - Include id, title, type, depth, hasChildren, isExpanded, parentId, order
    - Use readonly modifiers
    - _Requirements: 7.4_

  - [x] 3.2 Export from `types/node/index.ts`
    - _Requirements: 7.4_

- [x] 4. Create TreeNodeRow Component
  - [x] 4.1 Create `tree-node-row.view.fn.tsx`
    - Accept FlatTreeNode and event handlers
    - Render indentation based on depth (depth * 12px)
    - Render chevron for folders (expand/collapse)
    - Render icon based on file type
    - Render title text
    - Handle click to select
    - Handle click on chevron to toggle
    - Apply selection highlight
    - Use shadcn/ui Button for interactive elements
    - Use Lucide icons
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 5.3_

  - [ ]* 4.2 Write unit tests for TreeNodeRow
    - Test file node rendering
    - Test folder node rendering
    - Test selection state
    - Test click handlers
    - Test indentation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.3 Add hover action menu
    - Hover or selection shows ⋯ button
    - Click opens Popover menu
    - Menu items: New File, New Folder (folders only), Rename, Delete
    - Uses shadcn/ui Popover component
    - _Requirements: 5.5_

- [-] 5. Refactor useFileTree Hook
  - [x] 5.1 Update `use-file-tree.ts` to use virtual list
    - Remove react-arborist dependencies
    - Use flattenTree pipe to get flat nodes
    - Setup @tanstack/react-virtual virtualizer
    - Calculate container height
    - Provide toggle handler that updates Zustand
    - Return flat nodes and virtualizer
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 3.1, 3.2, 7.3_

  - [ ] 5.2 Remove old tree building logic
    - Remove buildTreeData function
    - Remove TreeData type usage
    - _Requirements: 6.2, 6.3_

  - [ ] 5.3 Update return type
    - Return flatNodes instead of treeData
    - Return virtualizer instance
    - _Requirements: 1.4_

- [x] 6. Refactor FileTree Component
  - [x] 6.1 Update `file-tree.view.fn.tsx` to use virtual list
    - Remove react-arborist Tree component
    - Use @tanstack/react-virtual
    - Render virtualizer.getVirtualItems()
    - Map each virtual item to TreeNodeRow
    - Keep expand/collapse all buttons
    - Keep create file/folder buttons
    - Keep empty states
    - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 5.4, 6.2, 6.3, 9.3, 9.4_

  - [x] 6.2 Update FileTreeProps interface
    - Remove onToggleCollapsed (handled internally)
    - Keep other props
    - _Requirements: 3.1, 3.2_

  - [x] 6.3 Implement keyboard navigation
    - Arrow up/down to navigate
    - Arrow right to expand folder
    - Arrow left to collapse folder
    - Enter to select/open
    - Space to toggle folder
    - _Requirements: 5.6_

- [x] 7. Update use-file-tree-panel Hook
  - [x] 7.1 Remove onToggleCollapsed handler
    - Toggle is now handled internally by useFileTree
    - _Requirements: 3.1_

  - [x] 7.2 Keep auto-expand logic for new files
    - Use calculateAncestorPath
    - Use calculateExpandedAncestors
    - Update Zustand state
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 7.3 Implement scroll to new node
    - Use virtualizer.scrollToIndex
    - Find index of new node in flat array
    - _Requirements: 10.2, 10.4_

- [ ] 8. Checkpoint - Test Virtual List Implementation
  - Ensure all tests pass
  - Test with 1,000 nodes
  - Test with 10,000 nodes
  - Verify expand/collapse works
  - Verify selection works
  - Verify create/delete works
  - Ask user if questions arise

- [ ] 9. Property-Based Tests for State Management
  - [ ]* 9.1 Write property test for expand/collapse idempotence
    - **Property 5: Expand/collapse is idempotent**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 9.2 Write property test for state change re-render
    - **Property 7: State changes trigger re-render**
    - **Validates: Requirements 3.2**

  - [ ]* 9.3 Write property test for ancestor expansion
    - **Property 8: Ancestor expansion is transitive**
    - **Validates: Requirements 10.1, 10.3**

- [ ] 10. Performance Testing
  - [ ]* 10.1 Benchmark initial render with 1,000 nodes
    - Target: < 200ms
    - _Requirements: 8.1_

  - [ ]* 10.2 Benchmark initial render with 10,000 nodes
    - Target: < 500ms
    - _Requirements: 8.2_

  - [ ]* 10.3 Benchmark toggle folder response time
    - Target: < 16ms
    - _Requirements: 8.3_

  - [ ]* 10.4 Benchmark scroll frame rate
    - Target: 60fps
    - _Requirements: 8.4_

- [ ] 11. Remove react-arborist
  - [ ] 11.1 Remove react-arborist from package.json
    - Run `bun remove react-arborist`
    - _Requirements: 6.1_

  - [ ] 11.2 Verify no imports remain
    - Search codebase for "react-arborist"
    - Remove any remaining imports
    - _Requirements: 6.2_

  - [ ] 11.3 Delete old tree-related files if unused
    - Check if any old files can be removed
    - _Requirements: 6.3_

- [ ] 12. Integration Testing
  - [ ]* 12.1 Test full file tree rendering
    - Create test workspace with nested folders
    - Verify all nodes render correctly
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ]* 12.2 Test expand/collapse interactions
    - Click folders to expand/collapse
    - Use expand all / collapse all buttons
    - Verify state updates correctly
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ]* 12.3 Test create/delete/rename flows
    - Create new file
    - Create new folder
    - Delete node
    - Rename node
    - Verify auto-expand and scroll
    - _Requirements: 9.1, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 12.4 Test keyboard navigation
    - Arrow keys to navigate
    - Enter to select
    - Space to toggle
    - _Requirements: 5.6_

  - [ ]* 12.5 Test context menu
    - Right-click on nodes
    - Verify menu appears
    - Test menu actions
    - _Requirements: 9.6_

- [ ] 13. Final Checkpoint - Verify All Requirements
  - Ensure all tests pass
  - Verify performance targets met
  - Verify no regressions
  - Verify visual design maintained
  - Ask user for final approval

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Performance tests validate non-functional requirements

## Success Criteria

- ✅ All unit tests pass
- ✅ All property tests pass
- ✅ All integration tests pass
- ✅ Performance targets met
- ✅ react-arborist removed
- ✅ No visual regressions
- ✅ Code follows functional architecture
