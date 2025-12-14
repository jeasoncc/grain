# Implementation Plan

- [x] 1. Database Schema Update
  - [x] 1.1 Add NodeInterface to schema.ts
    - Add `NodeType` type definition ('folder' | 'file' | 'canvas')
    - Add `NodeInterface` with id, workspace, parent, type, title, order, content, collapsed, createDate, lastEdit
    - _Requirements: 1.1, 1.2, 3.1_

  - [x] 1.2 Update Dexie database version
    - Add version 5 with nodes table: "id, workspace, parent, type, order"
    - Add `nodes` table to NovelEditorDB class
    - _Requirements: 3.1_

  - [x] 1.3 Implement Node CRUD operations
    - Add `addNode()` method
    - Add `updateNode()` method
    - Add `deleteNode()` method with recursive child deletion
    - Add `getNode()` method
    - Add `getNodesByWorkspace()` method
    - Add `getNodesByParent()` method
    - _Requirements: 1.1, 1.2, 1.5, 3.3_

  - [ ]* 1.4 Write property test for workspace node isolation
    - **Property 4: Workspace Node Isolation**
    - **Validates: Requirements 3.3**

- [x] 2. Node Service Layer
  - [x] 2.1 Create node service file
    - Create `apps/desktop/src/services/nodes.ts`
    - Define `TreeNode` interface for UI consumption
    - _Requirements: 2.1_

  - [x] 2.2 Implement buildTree function
    - Implement recursive tree building from flat node list
    - Handle sorting by order field
    - Calculate depth for each node
    - _Requirements: 2.1_

  - [ ]* 2.3 Write property test for tree structure integrity
    - **Property 1: Tree Structure Integrity**
    - **Validates: Requirements 2.1**

  - [x] 2.4 Implement getNodePath function
    - Return array of nodes from root to target node
    - Used for breadcrumb navigation
    - _Requirements: 2.1_

  - [x] 2.5 Implement moveNode function
    - Update parent reference
    - Reorder siblings at old and new locations
    - Detect and prevent circular references
    - _Requirements: 1.4_

  - [ ]* 2.6 Write property test for node move integrity
    - **Property 3: Node Move Preserves Tree Integrity**
    - **Validates: Requirements 1.4**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. FileTree UI Components
  - [x] 4.1 Create FileTree component
    - Create `apps/desktop/src/components/file-tree/file-tree.tsx`
    - Accept workspaceId, selectedNodeId, and handler props
    - Use useNodesByWorkspace hook to fetch nodes
    - Build tree structure using buildTree function
    - _Requirements: 2.1_

  - [x] 4.2 Create FileTreeItem component
    - Create `apps/desktop/src/components/file-tree/file-tree-item.tsx`
    - Implement recursive rendering for nested nodes
    - Show expand/collapse chevron for folders
    - Show appropriate icon based on node type
    - Highlight selected node
    - _Requirements: 2.1, 2.2_

  - [x] 4.3 Implement folder expand/collapse
    - Toggle collapsed state on folder click
    - Persist collapsed state to database
    - _Requirements: 2.2_

  - [x] 4.4 Implement file selection
    - Call onSelectNode when file is clicked
    - Update selectedNodeId state
    - _Requirements: 2.3_

  - [x] 4.5 Create context menu for nodes
    - Create `apps/desktop/src/components/file-tree/file-tree-context-menu.tsx`
    - Add "New Folder" option
    - Add "New File" option
    - Add "Rename" option
    - Add "Delete" option
    - _Requirements: 2.4_

  - [x] 4.6 Implement drag and drop reordering
    - Allow dragging nodes within same parent
    - Allow moving nodes to different parent
    - Update order and parent on drop
    - _Requirements: 2.5, 1.4_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integration with Existing UI
  - [x] 6.1 Create useNodesByWorkspace hook
    - Create `apps/desktop/src/hooks/use-nodes.ts`
    - Use Dexie's useLiveQuery for reactive updates
    - _Requirements: 3.3_

  - [x] 6.2 Update BooksPanel to use FileTree
    - Replace ChaptersPanel content with FileTree component
    - Connect node selection to editor tabs
    - _Requirements: 2.1, 2.3_

  - [x] 6.3 Update editor tabs integration
    - Modify openTab to work with NodeInterface
    - Update tab title and type from node data
    - _Requirements: 2.3, 4.3_

  - [x] 6.4 Update workspace selection
    - Ensure workspace selection loads correct nodes
    - Clear selection when switching workspaces
    - _Requirements: 3.3_

- [x] 7. Create/Edit Dialogs
  - [x] 7.1 Create NewNodeDialog component
    - Create `apps/desktop/src/components/file-tree/new-node-dialog.tsx`
    - Support creating folder or file
    - Accept parent node ID
    - _Requirements: 1.1, 1.2_

  - [x] 7.2 Create RenameNodeDialog component
    - Create `apps/desktop/src/components/file-tree/rename-node-dialog.tsx`
    - Pre-fill current title
    - Validate non-empty title
    - _Requirements: 1.5_

  - [ ]* 7.3 Write property test for node rename
    - **Property 5: Node Rename Idempotence**
    - **Validates: Requirements 1.5**

- [ ] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
