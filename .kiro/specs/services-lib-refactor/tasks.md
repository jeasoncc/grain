# Implementation Plan

- [x] 1. Refactor services/drawings.ts to use Repository pattern
  - [x] 1.1 Replace direct database access with DrawingRepository
    - Replace `database.drawings.get()` with `DrawingRepository.getById()`
    - Replace `database.drawings.where()` with `DrawingRepository.getByWorkspace()`
    - Update imports to use `@/db/models`
    - _Requirements: 1.2, 4.1_
  - [x] 1.2 Extract pure functions to drawings.utils.ts
    - Extract `computeDrawingUpdates` to `services/drawings.utils.ts`
    - Ensure no side effects in extracted functions
    - _Requirements: 1.1, 3.1, 3.2, 3.3_
  - [x] 1.3 Write property test for drawings utils
    - **Property 2: Pure Functions Do Not Mutate Input**
    - **Validates: Requirements 3.3**

- [x] 2. Refactor services/search.ts
  - [x] 2.1 Extract pure functions to search.utils.ts
    - Extract `extractTextFromContent`, `extractTextFromLexical`, `generateExcerpt`, `extractHighlights`, `calculateSimpleScore`
    - Create `services/search.utils.ts`
    - _Requirements: 1.1, 3.1, 3.2, 3.3_
  - [x] 2.2 Replace direct database access with Repository
    - Replace `database.nodes.toArray()` with `NodeRepository.getByWorkspace()`
    - Replace `database.workspaces.get()` with `WorkspaceRepository.getById()`
    - _Requirements: 1.2, 4.1_
  - [x] 2.3 Write property test for search utils
    - **Property 1: Pure Functions Produce Consistent Output**
    - **Property 3: Text Extraction Round Trip Consistency**
    - **Validates: Requirements 3.1, 3.2**

- [-] 3. Refactor services/export.ts
  - [ ] 3.1 Extract pure functions to export.utils.ts
    - Extract `extractTextFromContent`, `extractTextFromNode`, `escapeHtml`, `generatePrintHtml`, `generateEpubChapterHtml`
    - Create `services/export.utils.ts`
    - _Requirements: 1.1, 3.1, 3.2, 3.3_
  - [ ]* 3.2 Write property test for export utils
    - **Property 1: Pure Functions Produce Consistent Output**
    - **Property 2: Pure Functions Do Not Mutate Input**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Refactor services/save.ts
  - [x] 5.1 Extract pure functions to save.utils.ts
    - Extract `extractTagsFromContent` to `services/save.utils.ts`
    - _Requirements: 1.1, 3.1, 3.2, 3.3_
  - [ ]* 5.2 Write property test for save utils
    - **Property 1: Pure Functions Produce Consistent Output**
    - **Validates: Requirements 3.1, 3.2**

- [x] 6. Audit and fix lib/icon-themes.ts
  - [x] 6.1 Remove unused imports
    - Remove unused `Workflow` import
    - Run linter to check for other unused imports
    - _Requirements: 2.6, 6.6_

- [x] 7. Rename lib/fuzzy-match.ts to follow naming convention
  - [x] 7.1 Rename file to fuzzy-match.utils.ts
    - Rename `lib/fuzzy-match.ts` to `lib/fuzzy-match.utils.ts`
    - Update all imports across the codebase
    - _Requirements: 2.2, 3.5_

- [x] 8. Audit remaining services for compliance
  - [x] 8.1 Audit services/backup.ts
    - Check for direct database access
    - Check for pure functions that should be extracted
    - Verify JSDoc documentation
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 8.2 Audit services/workspaces.ts
    - Check for React hooks that should be moved
    - Verify Repository usage
    - _Requirements: 5.1, 5.3_
  - [x] 8.3 Audit services/diary-v2.ts
    - Check for direct database access
    - Check for pure functions
    - _Requirements: 5.1, 5.2_
  - [x] 8.4 Audit services/import-export.ts
    - Check for direct database access
    - Check for pure functions
    - _Requirements: 5.1, 5.2_

- [x] 9. Audit remaining lib files for compliance
  - [x] 9.1 Audit lib/diagram-presets.ts
    - Verify pure functions have no side effects
    - Check naming convention
    - _Requirements: 6.2, 6.5_
  - [x] 9.2 Audit lib/themes.ts
    - Check for unused exports
    - Verify config structure
    - _Requirements: 6.3, 6.6_
  - [x] 9.3 Audit lib/next-dynamic.tsx
    - Determine if should be in components or hooks
    - _Requirements: 6.1, 6.4_

- [ ] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
