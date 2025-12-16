# Design Document: Wiki to Tagged Files Refactor

## Overview

This design document describes the refactoring of the wiki system from a separate database table and UI module into a simplified tag-based file system. Wiki entries will become regular file nodes stored in a `wiki/` folder with a "wiki" tag, leveraging the existing file tree infrastructure and tag system.

## Architecture

### Current Architecture (Before)

```
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│     nodes       │    contents     │      wikiEntries        │
│  (file tree)    │  (file content) │  (separate wiki table)  │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│  nodes.ts       │   tags.ts       │      wiki.ts            │
│                 │                 │  (WikiRepository)       │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
├─────────────────┬─────────────────┬─────────────────────────┤
│  FileTree       │  ActivityBar    │   WikiPanel (sidebar)   │
│  Panel          │  (wiki icon)    │   WikiIcon              │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Target Architecture (After)

```
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│     nodes       │    contents     │        tags             │
│  (+ wiki folder)│  (file content) │  (tag cache)            │
│  (+ wiki tag)   │                 │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│  nodes.ts       │   tags.ts       │   wiki-files.ts (new)   │
│  (+ wiki folder │  (+ getNodesByTag)│  (query wiki-tagged   │
│   creation)     │                 │   files for mentions)   │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
├─────────────────┬─────────────────┬─────────────────────────┤
│  FileTree       │  ActivityBar    │   MentionsPlugin        │
│  Panel          │  (no wiki icon) │   (uses wiki-tagged     │
│  (shows wiki/)  │                 │    files)               │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## Components and Interfaces

### 1. Wiki File Service (`wiki-files.ts`)

New service to query files with "wiki" tag for @ mentions:

```typescript
// apps/desktop/src/services/wiki-files.ts

export interface WikiFileEntry {
  id: string;           // Node ID
  name: string;         // File title (maps to WikiEntryInterface.name)
  alias: string[];      // From node metadata or empty
  content: string;      // File content for preview
  path: string;         // File path in tree (e.g., "wiki/Character.md")
}

// Get all files with "wiki" tag for a workspace
export function useWikiFiles(workspaceId: string | null): WikiFileEntry[];

// Create a new wiki file in the wiki/ folder with "wiki" tag
export async function createWikiFile(params: {
  workspaceId: string;
  name: string;
  content?: string;
}): Promise<NodeInterface>;

// Ensure wiki folder exists, create if not
export async function ensureWikiFolder(workspaceId: string): Promise<NodeInterface>;
```

### 2. Updated Mentions Plugin Interface

The editor's MentionsPlugin will accept the new `WikiFileEntry` interface:

```typescript
// packages/editor/src/plugins/mentions-plugin.tsx

// Rename WikiEntryInterface to MentionEntry for clarity
export interface MentionEntry {
  id: string;
  name: string;
  alias?: string[];
}

export interface MentionsPluginProps {
  mentionEntries?: MentionEntry[];  // Renamed from wikiEntries
}
```

### 3. Migration Service

One-time migration from `wikiEntries` table to file nodes:

```typescript
// apps/desktop/src/services/wiki-migration.ts

export async function migrateWikiEntriesToFiles(workspaceId: string): Promise<{
  migrated: number;
  errors: string[];
}>;

export async function checkMigrationNeeded(workspaceId: string): Promise<boolean>;
```

## Data Models

### Node with Wiki Tag

The existing `NodeInterface` already supports tags. Wiki files will use:

```typescript
interface NodeInterface {
  id: string;
  workspace: string;
  parent: string | null;  // Will be wiki folder ID
  type: "file";           // Wiki files are regular files
  title: string;          // Wiki entry name
  tags: string[];         // Will include "wiki"
  order: number;
  collapsed?: boolean;
  createDate: string;
  lastEdit: string;
}
```

### Wiki Folder Structure

```
workspace/
├── diary/           (existing)
│   └── 2024-01-01.md
├── wiki/            (new - auto-created)
│   ├── Character A.md
│   └── Location B.md
└── other files...
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Wiki folder initialization
*For any* workspace, after initialization, a `wiki/` folder SHALL exist at the root level with order greater than the `diary/` folder.
**Validates: Requirements 1.1, 1.3**

### Property 2: Wiki file creation with tag
*For any* wiki file created through `createWikiFile()`, the resulting node SHALL have:
- `parent` pointing to the wiki folder
- `type` equal to "file"
- `tags` array containing "wiki"
**Validates: Requirements 1.2**

### Property 3: Wiki tag inclusion in autocomplete
*For any* file node with "wiki" in its `tags` array, that file SHALL appear in the @ operator autocomplete results, regardless of its location in the file tree.
**Validates: Requirements 2.1, 6.1, 6.2, 6.4**

### Property 4: Wiki tag removal exclusion
*For any* file node, if the "wiki" tag is removed from its `tags` array, that file SHALL NOT appear in the @ operator autocomplete results.
**Validates: Requirements 6.3**

### Property 5: Migration data preservation (round-trip)
*For any* wiki entry in the `wikiEntries` table, after migration, there SHALL exist a file node where:
- `title` equals the original `name`
- content equals the original `content`
- `workspace` equals the original `project`
- `tags` contains "wiki"
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Migration cleanup
*For any* successfully migrated wiki entry, the original entry SHALL be removed from the `wikiEntries` table.
**Validates: Requirements 4.4**

### Property 7: Standard file operations for wiki files
*For any* wiki file (file with "wiki" tag), deletion using `deleteNode()` SHALL remove the node from the database.
**Validates: Requirements 1.5**

## Error Handling

### Migration Errors
- If a wiki entry fails to migrate, log the error with entry ID and continue
- Track failed migrations for potential retry
- Do not delete original entry if migration fails

### Wiki Folder Creation Errors
- If wiki folder creation fails, throw error and prevent wiki file creation
- Log detailed error for debugging

### Tag Query Errors
- If tag query fails, return empty array and log error
- UI should handle empty state gracefully

## Testing Strategy

### Property-Based Testing Library
Use `fast-check` for property-based testing in TypeScript/JavaScript.

### Unit Tests
- Test `ensureWikiFolder()` creates folder correctly
- Test `createWikiFile()` creates file with correct properties
- Test `useWikiFiles()` returns correct files
- Test migration function preserves data

### Property-Based Tests
Each correctness property will be implemented as a property-based test:

1. **Property 1 Test**: Generate random workspace, verify wiki folder exists after init
2. **Property 2 Test**: Generate random wiki file params, verify created node has correct structure
3. **Property 3 Test**: Generate random files with/without wiki tag, verify autocomplete results
4. **Property 4 Test**: Generate file with wiki tag, remove tag, verify exclusion
5. **Property 5 Test**: Generate random wiki entries, migrate, verify data preservation
6. **Property 6 Test**: Generate wiki entries, migrate, verify cleanup
7. **Property 7 Test**: Generate wiki files, delete, verify removal

### Test Configuration
- Minimum 100 iterations per property test
- Each test tagged with property reference: `**Feature: wiki-to-tagged-files, Property {N}: {description}**`


## Cleanup Strategy

### Database Cleanup

After migration is complete and verified, the following database changes are required:

1. **Remove `wikiEntries` table** from `database.ts`:
   - Remove table declaration: `wikiEntries!: Table<WikiEntryInterface, string>`
   - Remove index definition: `wikiEntries: "id, project, name"`
   - Remove from all schema versions

2. **Remove WikiEntryInterface** from `schema.ts`:
   - Delete the `WikiEntryInterface` type definition

3. **Remove Wiki model files**:
   - Delete `apps/desktop/src/db/models/wiki/` directory
   - Remove wiki exports from `apps/desktop/src/db/models/index.ts`

### Service Cleanup

1. **Delete wiki service**:
   - Remove `apps/desktop/src/services/wiki.ts`

2. **Update clear-data service**:
   - Remove `database.wikiEntries.clear()` from `clearAllData()`
   - Remove wikiEntries count from diagnostics

### Store Cleanup

1. **Check and clean unified-sidebar store**:
   - Remove any wiki panel references from `useUnifiedSidebarStore`
   - Remove "wiki" from panel type definitions if present

2. **Check and clean selection store**:
   - Remove any wiki-related selection state if present

### UI Component Cleanup

1. **Activity Bar**:
   - Remove `WikiIcon` import and usage
   - Remove wiki-related comments

2. **Editor Components**:
   - Update `wikiEntries` prop name to `mentionEntries` in:
     - `packages/editor/src/components/Editor.tsx`
     - `packages/editor/src/components/EditorInstance.tsx`
     - `packages/editor/src/components/MultiEditorContainer.tsx`
   - Update `WikiEntryInterface` to `MentionEntry` in mentions plugin

3. **Workspace Components**:
   - Update `story-workspace.tsx` to use new `useWikiFiles` hook instead of `useWikiEntriesByProject`

### Icon Theme Cleanup

1. **Remove wiki icon** from icon theme configuration:
   - Remove `wiki` from `activityBar` icons in theme files
