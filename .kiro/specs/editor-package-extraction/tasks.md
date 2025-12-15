# Implementation Plan
 
## Phase 1: Package Setup

- [x] 1. Create editor package structure
  - [x] 1.1 Create `packages/editor` directory with package.json
    - Set name to `@novel-editor/editor`
    - Configure peer dependencies: react, react-dom, lexical, @lexical/react, @lexical/code, @lexical/hashtag, @lexical/link, @lexical/list, @lexical/markdown, @lexical/overflow, @lexical/rich-text, @lexical/table
    - Configure build scripts
    - _Requirements: 1.1, 1.4, 5.4_
  - [x] 1.2 Create tsconfig.json for the editor package
    - Extend from root tsconfig if exists, or create standalone config
    - Configure declaration output for .d.ts files
    - _Requirements: 1.3, 5.3_
  - [x] 1.3 Create vite.config.ts for building the package
    - Configure library mode output
    - Configure external dependencies (peer deps)
    - Output ESM format
    - _Requirements: 5.3_

## Phase 2: Core Components Migration

- [-] 2. Migrate core editor components
  - [x] 2.1 Create `src/types/index.ts` with shared type definitions
    - Define EditorTab, EditorInstanceState interfaces
    - Export SerializedEditorState from lexical
    - _Requirements: 1.3, 2.2_
  - [x] 2.2 Create `src/themes/PlaygroundEditorTheme.ts`
    - Copy from `apps/desktop/src/components/editor/themes/PlaygroundEditorTheme.ts`
    - _Requirements: 1.2_
  - [x] 2.3 Create `src/themes/PlaygroundEditorTheme.css`
    - Copy from `apps/desktop/src/components/editor/themes/PlaygroundEditorTheme.css`
    - _Requirements: 1.2_
  - [x] 2.4 Create `src/themes/index.ts` to export theme
    - _Requirements: 2.2_

## Phase 3: Nodes Migration

- [-] 3. Migrate custom nodes
  - [x] 3.1 Create `src/nodes/mention-node.tsx`
    - Copy from `apps/desktop/src/components/editor/nodes/mention-node.tsx`
    - Export MentionNode, $createMentionNode, $isMentionNode, SerializedMentionNode
    - _Requirements: 1.2, 2.3_
  - [x] 3.2 Create `src/nodes/tag-node.tsx`
    - Copy from `apps/desktop/src/components/editor/nodes/tag-node.tsx`
    - Export TagNode, $createTagNode, $isTagNode, SerializedTagNode
    - _Requirements: 1.2, 2.3_
  - [x] 3.3 Create `src/nodes/index.ts`
    - Export EditorNodes array with all node types
    - Re-export all node classes and helper functions
    - _Requirements: 2.2, 2.3_
  - [ ]* 3.4 Write property test for custom node API completeness
    - **Property 2: Custom Node API Completeness**
    - **Validates: Requirements 2.3**

## Phase 4: Plugins Migration

- [-] 4. Migrate editor plugins
  - [x] 4.1 Create `src/plugins/mentions-plugin.tsx`
    - Copy from `apps/desktop/src/components/editor/plugins/mentions-plugin.tsx`
    - Update import paths
    - _Requirements: 1.2, 2.4_
  - [x] 4.2 Create `src/plugins/mention-tooltip-plugin.tsx`
    - Copy from `apps/desktop/src/components/editor/plugins/mention-tooltip-plugin.tsx`
    - Update import paths
    - _Requirements: 1.2, 2.4_
  - [x] 4.3 Create `src/plugins/tag-picker-plugin.tsx`
    - Copy from `apps/desktop/src/components/editor/plugins/tag-picker-plugin.tsx`
    - Update import paths
    - _Requirements: 1.2, 2.4_
  - [x] 4.4 Create `src/plugins/tag-transform-plugin.tsx`
    - Copy from `apps/desktop/src/components/editor/plugins/tag-transform-plugin.tsx`
    - Update import paths
    - _Requirements: 1.2, 2.4_
  - [x] 4.5 Create `src/plugins/index.ts`
    - Export all custom plugins
    - Re-export commonly used Lexical plugins
    - _Requirements: 2.2, 2.4_

## Phase 5: Editor Components Migration

- [x] 5. Migrate editor components
  - [x] 5.1 Create `src/components/Editor.tsx`
    - Copy from `apps/desktop/src/components/editor/Editor.tsx`
    - Update import paths for nodes, plugins, themes
    - _Requirements: 1.2, 1.5_
  - [x] 5.2 Create `src/components/EditorInstance.tsx`
    - Copy from `apps/desktop/src/components/editor/EditorInstance.tsx`
    - Update import paths
    - _Requirements: 1.2, 3.1, 3.2_
  - [x] 5.3 Create `src/components/MultiEditorContainer.tsx`
    - Copy from `apps/desktop/src/components/editor/MultiEditorContainer.tsx`
    - Remove dependency on `@/stores/editor-tabs`
    - Use local type definitions from `src/types`
    - _Requirements: 1.2, 3.1, 3.3, 3.4_
  - [x] 5.4 Create `src/components/index.ts` to export all components
    - _Requirements: 2.2_

## Phase 6: Main Entry Point

- [x] 6. Create main entry point and build
  - [x] 6.1 Create `src/index.ts` main entry point
    - Re-export all public APIs from components, nodes, plugins, themes, types
    - _Requirements: 1.2, 2.2_
  - [x] 6.2 Verify package builds successfully
    - Run build command
    - Check dist output contains .js and .d.ts files
    - _Requirements: 5.3_
  - [ ]* 6.3 Write property test for package export completeness
    - **Property 1: Package Export Completeness**
    - **Validates: Requirements 1.2**

- [ ] 7. Checkpoint - Verify package builds correctly
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Desktop App Integration

- [x] 8. Update desktop app to use editor package
  - [x] 8.1 Add `@novel-editor/editor` dependency to desktop app
    - Use `workspace:*` protocol in package.json
    - _Requirements: 4.1, 4.2, 5.4_
  - [x] 8.2 Update imports in `story-workspace.tsx`
    - Replace `@/components/editor/MultiEditorContainer` with `@novel-editor/editor`
    - Replace `@/components/editor/Editor` with `@novel-editor/editor`
    - _Requirements: 4.1, 4.3_
  - [x] 8.3 Update other files importing from editor
    - Search for imports from `@/components/editor`
    - Update to use `@novel-editor/editor` where appropriate
    - _Requirements: 4.1_
  - [x] 8.4 Verify desktop app builds and runs correctly
    - Run desktop dev server
    - Test editor functionality
    - _Requirements: 4.3_

## Phase 8: Turborepo Configuration

- [x] 9. Configure Turborepo for editor package
  - [x] 9.1 Update turbo.json if needed
    - Ensure build task includes packages/editor
    - Verify dependency chain is correct
    - _Requirements: 5.1, 5.2_
  - [x] 9.2 Test incremental builds
    - Make a change in editor package
    - Verify only affected packages rebuild
    - _Requirements: 5.2_

## Phase 9: Property Tests (Optional)

- [ ]* 10. Write property tests for multi-editor state management
  - [ ]* 10.1 Write property test for editor state independence
    - **Property 3: Editor State Independence**
    - **Validates: Requirements 3.1**
  - [ ]* 10.2 Write property test for scroll position preservation
    - **Property 4: Scroll Position Preservation**
    - **Validates: Requirements 3.2**
  - [ ]* 10.3 Write property test for content change callback
    - **Property 5: Content Change Callback**
    - **Validates: Requirements 3.3**
  - [ ]* 10.4 Write property test for undo/redo history independence
    - **Property 6: Undo/Redo History Independence**
    - **Validates: Requirements 3.4**

- [ ] 11. Final Checkpoint - Verify all tests pass
  - Ensure all tests pass, ask the user if questions arise.
