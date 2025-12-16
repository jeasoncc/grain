    # Implementation Plan

## Wiki to Tagged Files Refactor

- [x] 1. Create wiki file service and folder initialization
  - [x] 1.1 Create `wiki-files.ts` service with `WikiFileEntry` interface
    - Define `WikiFileEntry` interface with id, name, alias, content, path
    - Implement `useWikiFiles(workspaceId)` hook to query files with "wiki" tag
    - Implement `ensureWikiFolder(workspaceId)` to create wiki folder if not exists
    - Implement `createWikiFile(params)` to create file in wiki folder with "wiki" tag
    - _Requirements: 1.1, 1.2, 2.1_
  - [ ]* 1.2 Write property test for wiki folder initialization
    - **Property 1: Wiki folder initialization**
    - **Validates: Requirements 1.1, 1.3**
  - [ ]* 1.3 Write property test for wiki file creation
    - **Property 2: Wiki file creation with tag**
    - **Validates: Requirements 1.2**

- [x] 2. Update mentions plugin to use wiki-tagged files
  - [x] 2.1 Rename `WikiEntryInterface` to `MentionEntry` in mentions plugin
    - Update `packages/editor/src/plugins/mentions-plugin.tsx`
    - Update prop name from `wikiEntries` to `mentionEntries`
    - _Requirements: 5.3, 5.4_
  - [x] 2.2 Update Editor component props
    - Update `packages/editor/src/components/Editor.tsx` prop names
    - Update `packages/editor/src/components/EditorInstance.tsx` prop names
    - Update `packages/editor/src/components/MultiEditorContainer.tsx` prop names
    - Update `packages/editor/src/index.ts` exports
    - _Requirements: 5.3_
  - [x] 2.3 Update story-workspace to use new wiki files hook
    - Replace `useWikiEntriesByProject` with `useWikiFiles`
    - Map `WikiFileEntry` to `MentionEntry` format
    - _Requirements: 2.1, 5.4_
  - [ ]* 2.4 Write property test for wiki tag inclusion in autocomplete
    - **Property 3: Wiki tag inclusion in autocomplete**
    - **Validates: Requirements 2.1, 6.1, 6.2, 6.4**
  - [ ]* 2.5 Write property test for wiki tag removal exclusion
    - **Property 4: Wiki tag removal exclusion**
    - **Validates: Requirements 6.3**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create migration service for existing wiki entries
  - [x] 4.1 Create `wiki-migration.ts` service
    - Implement `checkMigrationNeeded(workspaceId)` to detect existing wiki entries
    - Implement `migrateWikiEntriesToFiles(workspaceId)` to migrate entries to file nodes
    - Preserve title, content, project association
    - Apply "wiki" tag to migrated files
    - Handle errors gracefully, log and continue
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - [x] 4.2 Add migration trigger on workspace initialization
    - Call migration check in workspace initialization flow
    - Run migration if needed before normal operations
    - _Requirements: 4.1_
  - [ ]* 4.3 Write property test for migration data preservation
    - **Property 5: Migration data preservation (round-trip)**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  - [ ]* 4.4 Write property test for migration cleanup
    - **Property 6: Migration cleanup**
    - **Validates: Requirements 4.4**

- [x] 5. Remove wiki UI components from activity bar
  - [x] 5.1 Remove wiki icon from activity bar
    - Remove `WikiIcon` import from `activity-bar.tsx`
    - Remove wiki-related comments
    - _Requirements: 3.1_
  - [x] 5.2 Remove wiki from icon theme configuration
    - Remove `wiki` from `activityBar` icons in theme files
    - _Requirements: 3.1_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Clean up database and services
  - [x] 7.1 Remove wikiEntries table from database
    - Remove table declaration from `database.ts`
    - Remove index definitions from all schema versions
    - _Requirements: 5.1_
  - [x] 7.2 Remove WikiEntryInterface from schema
    - Remove type definition from `schema.ts`
    - _Requirements: 5.1_
  - [x] 7.3 Delete wiki model files
    - Delete `apps/desktop/src/db/models/wiki/` directory if exists
    - Remove wiki exports from `apps/desktop/src/db/models/index.ts`
    - _Requirements: 5.2_
  - [x] 7.4 Delete wiki service
    - Remove `apps/desktop/src/services/wiki.ts`
    - _Requirements: 5.2_
  - [x] 7.5 Update clear-data service
    - Remove `database.wikiEntries.clear()` from `clearAllData()`
    - Remove wikiEntries count from diagnostics
    - _Requirements: 5.2_

- [x] 8. Clean up stores and remaining references
  - [x] 8.1 Check and clean unified-sidebar store
    - Remove any wiki panel references if present
    - Remove "wiki" from panel type definitions if present
    - _Requirements: 3.2_
  - [x] 8.2 Verify no remaining wiki references
    - Search codebase for remaining `wiki` references (except migration code)
    - Clean up any remaining imports or usages
    - _Requirements: 5.5_
  - [ ]* 8.3 Write property test for standard file operations
    - **Property 7: Standard file operations for wiki files**
    - **Validates: Requirements 1.5**

- [ ] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
