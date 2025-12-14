# Implementation Plan

## Phase 1: Create Independent Content Table (Core Performance Optimization)

- [ ] 1. Design and create Content table in Dexie
  - [ ] 1.1 Add Dexie v7 migration with new `contents` table
    - Add `contents` table: `"id, nodeId, contentType, lastEdit"`
    - Keep `nodes` table but remove `content` field in new records
    - Ensure backward compatibility with existing data
    - _Requirements: 5.1, 5.2, 6.3_
  - [ ] 1.2 Create Content data model files
    - Create `db/models/content/content.interface.ts`
    - Create `db/models/content/content.schema.ts`
    - Create `db/models/content/content.builder.ts`
    - Create `db/models/content/index.ts`
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  - [ ] 1.3 Create Content CRUD operations in db/curd.ts
    - Add `addContent`, `updateContent`, `getContent`, `getContentByNodeId`
    - Implement lazy loading pattern for content
    - _Requirements: 5.2_
  - [ ] 1.4 Create Content hooks for React components
    - Create `useContentByNodeId` hook with useLiveQuery
    - Implement on-demand content loading
    - _Requirements: 3.3, 5.2_

- [ ] 2. Migrate existing Node content to Content table
  - [ ] 2.1 Create migration script for existing data
    - Read all nodes with content field
    - Create corresponding content records
    - Update node records to remove content field
    - _Requirements: 6.3_
  - [ ] 2.2 Update Node interface to remove content field
    - Modify `db/models/node/node.interface.ts`
    - Update NodeBuilder to not include content
    - _Requirements: 2.1_

- [ ] 3. Checkpoint - Verify migration and content loading
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Reorganize Data Model Files

- [ ] 4. Create organized data model directory structure
  - [ ] 4.1 Create `db/models/` directory structure
    - Create folder structure for all entities
    - Each entity: `xxx.interface.ts`, `xxx.schema.ts`, `xxx.builder.ts`
    - _Requirements: 2.1_
  - [ ] 4.2 Create Node data model files (without content field)
    - Create `db/models/node/node.interface.ts`
    - Create `db/models/node/node.schema.ts`
    - Create `db/models/node/node.builder.ts`
    - Create `db/models/node/index.ts`
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  - [ ]* 4.3 Write property test for Node schema and builder
    - **Property 2: Schema Validation Correctness**
    - **Property 3: Builder Produces Valid Objects**
    - **Validates: Requirements 2.2, 2.3, 3.1, 3.2**
  - [ ] 4.4 Create Workspace data model files
    - Create `db/models/workspace/workspace.interface.ts`
    - Create `db/models/workspace/workspace.schema.ts`
    - Create `db/models/workspace/workspace.builder.ts`
    - Create `db/models/workspace/index.ts`
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  - [ ] 4.5 Create WikiEntry data model files
    - Create `db/models/wiki/wiki.interface.ts`
    - Create `db/models/wiki/wiki.schema.ts`
    - Create `db/models/wiki/wiki.builder.ts`
    - Create `db/models/wiki/index.ts`
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  - [ ] 4.6 Create Drawing data model files
    - Create `db/models/drawing/drawing.interface.ts`
    - Create `db/models/drawing/drawing.schema.ts`
    - Create `db/models/drawing/drawing.builder.ts`
    - Create `db/models/drawing/index.ts`
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  - [ ] 4.7 Create shared types and barrel exports
    - Create `db/models/shared/base.interface.ts`
    - Create `db/models/shared/base.schema.ts`
    - Create `db/models/index.ts`
    - _Requirements: 2.1_
  - [ ]* 4.8 Write property test for Builder fluent API
    - **Property 4: Builder Fluent API**
    - **Validates: Requirements 3.1, 3.3**

- [ ] 5. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Update Database Layer

- [ ] 6. Refactor db/curd.ts to use new patterns
  - [ ] 6.1 Update addNode to use NodeBuilder (no content)
    - Use NodeBuilder for node creation
    - Content is now separate operation
    - _Requirements: 2.3, 3.4_
  - [ ] 6.2 Update addProject to use WorkspaceBuilder
    - Use WorkspaceBuilder for workspace creation
    - _Requirements: 2.3, 3.4_
  - [ ] 6.3 Update addWikiEntry to use WikiEntryBuilder
    - Use WikiEntryBuilder for wiki entry creation
    - _Requirements: 2.3, 3.4_
  - [ ] 6.4 Update addDrawing to use DrawingBuilder
    - Use DrawingBuilder for drawing creation
    - _Requirements: 2.3, 3.4_
  - [ ]* 6.5 Write property test for data round-trip
    - **Property 1: Data Round-Trip Consistency**
    - **Validates: Requirements 1.3, 5.1**

- [ ] 7. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Update Service Layer

- [ ] 8. Refactor services to use new Content table
  - [ ] 8.1 Update nodes.ts service
    - Separate node metadata operations from content operations
    - Add `getNodeWithContent`, `saveNodeContent` functions
    - _Requirements: 6.2_
  - [ ] 8.2 Update save.ts service
    - Update `saveDocument` to write to contents table
    - Implement debounced save for content
    - _Requirements: 5.3_
  - [ ] 8.3 Update search.ts service
    - Update search to query contents table for full-text search
    - _Requirements: 6.2_
  - [ ] 8.4 Update export.ts service
    - Update export to include contents table data
    - _Requirements: 6.2_
  - [ ] 8.5 Update backup.ts service
    - Include contents table in backup/restore
    - _Requirements: 6.2, 6.3_

- [ ] 9. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Update Hooks and Components

- [ ] 10. Update React hooks for new data structure
  - [ ] 10.1 Create useContent hook
    - Implement `useContentByNodeId` with useLiveQuery
    - Support lazy loading pattern
    - _Requirements: 3.3, 5.2_
  - [ ] 10.2 Update useNodes hook
    - Remove content from node queries (faster tree loading)
    - _Requirements: 5.2_
  - [ ] 10.3 Update editor components
    - Load content separately when opening a file
    - Save content to contents table
    - _Requirements: 5.2_

## Phase 6: Consolidate State Management

- [ ] 11. Audit and refactor Zustand stores
  - [ ] 11.1 Review editor-tabs.ts for state separation
    - Keep tab list in Zustand (session state)
    - Keep editorStates in memory (performance)
    - _Requirements: 4.3, 4.4_
  - [ ] 11.2 Consolidate UI state stores
    - Merge ui.ts, ui-settings.ts into unified structure
    - _Requirements: 4.3_
  - [ ] 11.3 Document data management strategy
    - Create `docs/data-architecture.md`
    - _Requirements: 1.5, 4.1, 4.2, 4.3, 4.4_

## Phase 7: Performance Optimization

- [ ] 12. Implement editor content optimization
  - [ ] 12.1 Add debounced save for editor content
    - Implement 500ms debounce for content saves
    - _Requirements: 5.3_
  - [ ] 12.2 Implement LRU cache for editor states
    - Limit cached editor states to 10 most recent
    - _Requirements: 5.2, 5.4_
  - [ ]* 12.3 Write property test for editor state preservation
    - **Property 5: Editor State Preservation**
    - **Validates: Requirements 5.4**

- [ ] 13. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Backward Compatibility and Migration

- [ ] 14. Ensure backward compatibility
  - [ ] 14.1 Update db/schema.ts for backward compatibility
    - Re-export all interfaces from new locations
    - Add deprecation comments
    - _Requirements: 6.3_
  - [ ] 14.2 Handle old data format on read
    - If node has content field, migrate to contents table
    - _Requirements: 6.3_
  - [ ]* 14.3 Write property test for backward compatibility
    - **Property 6: Backward Compatibility**
    - **Validates: Requirements 6.3**

- [ ] 15. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

