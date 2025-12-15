# Implementation Plan

## 最终文件结构

```
apps/desktop/src/db/
├── index.ts                          # 统一导出
├── database.ts                       # Dexie 数据库类定义
│
└── models/
    ├── index.ts                      # 统一导出所有模型
    │
    ├── node/
    │   ├── node.interface.ts         # Node 接口（无 content）
    │   ├── node.schema.ts            # Zod 验证
    │   ├── node.builder.ts           # Builder 类
    │   ├── node.repository.ts        # CRUD 操作
    │   ├── node.hooks.ts             # React hooks
    │   └── index.ts
    │
    ├── content/                      # 新增！独立内容表
    │   ├── content.interface.ts
    │   ├── content.schema.ts
    │   ├── content.builder.ts
    │   ├── content.repository.ts
    │   ├── content.hooks.ts
    │   └── index.ts
    │
    ├── workspace/
    │   ├── workspace.interface.ts
    │   ├── workspace.schema.ts
    │   ├── workspace.builder.ts
    │   ├── workspace.repository.ts
    │   ├── workspace.hooks.ts
    │   └── index.ts
    │
    ├── wiki/
    │   ├── wiki.interface.ts
    │   ├── wiki.schema.ts
    │   ├── wiki.builder.ts
    │   ├── wiki.repository.ts
    │   ├── wiki.hooks.ts
    │   └── index.ts
    │
    ├── drawing/
    │   ├── drawing.interface.ts
    │   ├── drawing.schema.ts
    │   ├── drawing.builder.ts
    │   ├── drawing.repository.ts
    │   ├── drawing.hooks.ts
    │   └── index.ts
    │
    ├── user/
    │   ├── user.interface.ts
    │   ├── user.schema.ts
    │   ├── user.builder.ts
    │   ├── user.repository.ts
    │   ├── user.hooks.ts
    │   └── index.ts
    │
    ├── attachment/
    │   ├── attachment.interface.ts
    │   ├── attachment.schema.ts
    │   ├── attachment.builder.ts
    │   ├── attachment.repository.ts
    │   ├── attachment.hooks.ts
    │   └── index.ts
    │
    └── shared/
        ├── base.interface.ts         # 共享接口（id, timestamps）
        ├── base.schema.ts            # 共享 Zod schemas
        └── index.ts
```

---

## Phase 1: Database Foundation

- [x] 1. Create database infrastructure
  - [x] 1.1 Create `db/database.ts` with Dexie class
    - Define all tables: nodes, contents, workspaces, wikiEntries, drawings, users, attachments
    - Table indexes: `nodes: "id, workspace, parent, type, order"`, `contents: "id, nodeId, contentType"`
    - _Requirements: 5.1, 5.2_
  - [x] 1.2 Create `db/index.ts` for unified exports
    - Export database instance
    - Export all models
    - _Requirements: 2.1_

- [ ] 2. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Shared Types

- [x] 3. Create shared types and utilities
  - [x] 3.1 Create `db/models/shared/base.interface.ts`
    - Define BaseEntity with id, createDate, lastEdit
    - Define common types (UUID, ISODateString)
    - _Requirements: 2.1_
  - [x] 3.2 Create `db/models/shared/base.schema.ts`
    - Define Zod schemas for common fields
    - Define UUID schema, datetime schema
    - _Requirements: 2.2_
  - [x] 3.3 Create `db/models/shared/index.ts`
    - Export all shared types and schemas
    - _Requirements: 2.1_

## Phase 3: Content Model (Core Performance Feature)

- [x] 4. Create Content model (independent content table)
  - [x] 4.1 Create `db/models/content/content.interface.ts`
    - Define ContentInterface: id, nodeId, content, contentType, lastEdit
    - Define ContentType: "lexical" | "excalidraw" | "text"
    - _Requirements: 2.1, 5.1_
  - [x] 4.2 Create `db/models/content/content.schema.ts`
    - Define ContentSchema with Zod
    - Define ContentCreateSchema, ContentUpdateSchema
    - _Requirements: 2.2_
  - [x] 4.3 Create `db/models/content/content.builder.ts`
    - Implement ContentBuilder with fluent API
    - Methods: nodeId(), content(), contentType(), build()
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  - [x] 4.4 Create `db/models/content/content.repository.ts`
    - Implement CRUD: add, update, delete, getByNodeId
    - _Requirements: 5.2_
  - [x] 4.5 Create `db/models/content/content.hooks.ts`
    - Implement useContentByNodeId with useLiveQuery
    - Support lazy loading pattern
    - _Requirements: 3.3, 5.2_
  - [x] 4.6 Create `db/models/content/index.ts`
    - Export all content-related types and functions
    - _Requirements: 2.1_
  - [ ]* 4.7 Write property test for Content schema and builder
    - **Property 2: Schema Validation Correctness**
    - **Property 3: Builder Produces Valid Objects**
    - **Validates: Requirements 2.2, 2.3, 3.1, 3.2**

- [ ] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Node Model

- [x] 6. Create Node model (without content field)
  - [x] 6.1 Create `db/models/node/node.interface.ts`
    - Define NodeInterface: id, workspace, parent, type, title, order, collapsed, createDate, lastEdit
    - Define NodeType: "folder" | "file" | "canvas" | "diary"
    - NO content field (moved to Content table)
    - _Requirements: 2.1_
  - [x] 6.2 Create `db/models/node/node.schema.ts`
    - Define NodeSchema with Zod
    - _Requirements: 2.2_
  - [x] 6.3 Create `db/models/node/node.builder.ts`
    - Implement NodeBuilder with fluent API
    - _Requirements: 3.1, 3.2_
  - [x] 6.4 Create `db/models/node/node.repository.ts`
    - Implement CRUD operations
    - Implement tree operations: getByWorkspace, getByParent, move, reorder
    - _Requirements: 5.2_
  - [x] 6.5 Create `db/models/node/node.hooks.ts`
    - Implement useNodesByWorkspace, useNode, useChildNodes
    - _Requirements: 3.3_
  - [x] 6.6 Create `db/models/node/index.ts`
    - Export all node-related types and functions
    - _Requirements: 2.1_
  - [ ]* 6.7 Write property test for Node schema and builder
    - **Property 2: Schema Validation Correctness**
    - **Property 3: Builder Produces Valid Objects**
    - **Validates: Requirements 2.2, 2.3, 3.1, 3.2**

- [ ] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Workspace Model

- [x] 8. Create Workspace model
  - [x] 8.1 Create `db/models/workspace/workspace.interface.ts`
    - Define WorkspaceInterface: id, title, author, description, etc.
    - _Requirements: 2.1_
  - [x] 8.2 Create `db/models/workspace/workspace.schema.ts`
    - Define WorkspaceSchema with Zod
    - _Requirements: 2.2_
  - [x] 8.3 Create `db/models/workspace/workspace.builder.ts`
    - Implement WorkspaceBuilder with fluent API
    - _Requirements: 3.1, 3.2_
  - [x] 8.4 Create `db/models/workspace/workspace.repository.ts`
    - Implement CRUD operations
    - _Requirements: 5.2_
  - [x] 8.5 Create `db/models/workspace/workspace.hooks.ts`
    - Implement useAllWorkspaces, useWorkspace
    - _Requirements: 3.3_
  - [x] 8.6 Create `db/models/workspace/index.ts`
    - _Requirements: 2.1_

## Phase 6: Wiki Model

- [x] 9. Create Wiki model
  - [x] 9.1 Create `db/models/wiki/wiki.interface.ts`
    - _Requirements: 2.1_
  - [x] 9.2 Create `db/models/wiki/wiki.schema.ts`
    - _Requirements: 2.2_
  - [x] 9.3 Create `db/models/wiki/wiki.builder.ts`
    - _Requirements: 3.1, 3.2_
  - [x] 9.4 Create `db/models/wiki/wiki.repository.ts`
    - _Requirements: 5.2_
  - [x] 9.5 Create `db/models/wiki/wiki.hooks.ts`
    - _Requirements: 3.3_
  - [x] 9.6 Create `db/models/wiki/index.ts`
    - _Requirements: 2.1_

## Phase 7: Drawing Model

- [x] 10. Create Drawing model
  - [x] 10.1 Create `db/models/drawing/drawing.interface.ts`
    - _Requirements: 2.1_
  - [x] 10.2 Create `db/models/drawing/drawing.schema.ts`
    - _Requirements: 2.2_
  - [x] 10.3 Create `db/models/drawing/drawing.builder.ts`
    - _Requirements: 3.1, 3.2_
  - [x] 10.4 Create `db/models/drawing/drawing.repository.ts`
    - _Requirements: 5.2_
  - [x] 10.5 Create `db/models/drawing/drawing.hooks.ts`
    - _Requirements: 3.3_
  - [x] 10.6 Create `db/models/drawing/index.ts`
    - _Requirements: 2.1_

## Phase 8: User and Attachment Models

- [x] 11. Create User model
  - [x] 11.1 Create `db/models/user/` files (interface, schema, builder, repository, hooks, index)
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [x] 12. Create Attachment model
  - [x] 12.1 Create `db/models/attachment/` files (interface, schema, builder, repository, hooks, index)
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [ ] 13. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Phase 9: Models Index and Integration

- [x] 14. Create unified exports
  - [x] 14.1 Create `db/models/index.ts`
    - Export all models from single entry point
    - _Requirements: 2.1_
  - [ ]* 14.2 Write property test for Builder fluent API
    - **Property 4: Builder Fluent API**
    - **Validates: Requirements 3.1, 3.3**
  - [ ]* 14.3 Write property test for data round-trip
    - **Property 1: Data Round-Trip Consistency**
    - **Validates: Requirements 1.3, 5.1**

- [ ] 15. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Phase 10: Update Services

- [x] 16. Update service layer to use new models
  - [x] 16.1 Delete old `db/curd.ts` and `db/schema.ts`
    - Remove deprecated files
    - _Requirements: 6.2_
  - [x] 16.2 Update `services/nodes.ts`
    - Import from new model locations
    - Use NodeBuilder and ContentRepository
    - _Requirements: 6.2_
  - [x] 16.3 Update `services/save.ts`
    - Use ContentRepository for saving
    - Implement debounced save
    - _Requirements: 5.3, 6.2_
  - [x] 16.4 Update `services/search.ts`
    - Query contents table for full-text search
    - _Requirements: 6.2_
  - [x] 16.5 Update `services/backup.ts`
    - Include contents table in backup/restore
    - _Requirements: 6.2_
  - [x] 16.6 Update `services/wiki.ts`
    - Use WikiBuilder and WikiRepository
    - _Requirements: 6.2_
  - [x] 16.7 Update `services/projects.ts` (rename to workspaces.ts)
    - Use WorkspaceBuilder and WorkspaceRepository
    - _Requirements: 6.2_

- [ ] 17. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Phase 11: Update Hooks

- [-] 18. Remove old hooks and update imports
  - [x] 18.1 Delete `hooks/use-nodes.ts`
    - Hooks now in `db/models/node/node.hooks.ts`
    - _Requirements: 6.4_
  - [x] 18.2 Update all component imports
    - Change imports to use new model locations
    - _Requirements: 6.4_

## Phase 12: Consolidate Zustand Stores

- [x] 19. Audit and refactor Zustand stores
  - [x] 19.1 Review editor-tabs.ts
    - Keep tab list in Zustand (session state)
    - Keep editorStates in memory
    - _Requirements: 4.3, 4.4_
  - [x] 19.2 Consolidate UI state stores
    - Merge ui.ts, ui-settings.ts
    - _Requirements: 4.3_
  - [x] 19.3 Create `docs/data-architecture.md`
    - Document data management strategy
    - _Requirements: 1.5, 4.1, 4.2, 4.3, 4.4_

## Phase 13: Performance Optimization

- [x] 20. Implement performance optimizations
  - [x] 20.1 Add debounced save for editor content
    - 500ms debounce for content saves
    - _Requirements: 5.3_
  - [x] 20.2 Implement LRU cache for editor states
    - Limit to 10 most recent
    - _Requirements: 5.2, 5.4_
  - [ ]* 20.3 Write property test for editor state preservation
    - **Property 5: Editor State Preservation**
    - **Validates: Requirements 5.4**

- [ ] 21. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

