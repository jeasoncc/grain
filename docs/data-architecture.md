# Data Architecture Guide

This document describes the data management strategy for Novel Editor, establishing clear guidelines for when to use each data management tool.

## Overview

Novel Editor follows a **data-driven architecture** where:
- **Data is the single source of truth** - Components render data, they don't own it
- **Clear separation of concerns** - Each tool has a specific purpose
- **Reactive updates** - Data changes automatically trigger UI updates

## Data Management Tools

### 1. Dexie (IndexedDB) - Persistent Data

**Use for:** All data that needs to survive app restarts

| Data Type | Table | Description |
|-----------|-------|-------------|
| Workspaces | `workspaces` | Project/workspace metadata |
| Nodes | `nodes` | File tree structure (folders, files, canvas, diary, drawing) |
| Contents | `contents` | Document content (Lexical JSON) - separate for performance |
| Wiki Entries | `wikiEntries` | Character/location/item definitions |
| Users | `users` | User profiles |
| Attachments | `attachments` | File attachments metadata |

> **Note:** Excalidraw drawings are stored as nodes with `type: "drawing"` in the `nodes` table. The drawing content (Excalidraw JSON) is stored in the node's `content` field.

**Access Pattern:**
```typescript
// Use repository functions for CRUD operations
import { NodeRepository } from "@/db/models/node";

await NodeRepository.add(node);
await NodeRepository.update(nodeId, { title: "New Title" });
await NodeRepository.delete(nodeId);
```

### 2. dexie-react-hooks (useLiveQuery) - Reactive Data Subscriptions

**Use for:** Reading persistent data in React components

**Why:** Automatically re-renders when data changes - no manual subscription management needed.

```typescript
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

function NodeList({ workspaceId }: { workspaceId: string }) {
  // Automatically updates when nodes change
  const nodes = useLiveQuery(
    () => db.nodes.where("workspace").equals(workspaceId).toArray(),
    [workspaceId]
  );
  
  return <ul>{nodes?.map(n => <li key={n.id}>{n.title}</li>)}</ul>;
}
```

### 3. Zustand - UI State Only

**Use for:** Temporary UI state that doesn't need persistence OR session state

| Store | Purpose | Persisted? |
|-------|---------|------------|
| `useUIStore` | Right sidebar, tab position | Yes (preferences) |
| `useUnifiedSidebarStore` | Left sidebar state, panel selection | Yes |
| `useSelectionStore` | Currently selected project/node | No |
| `useEditorTabsStore` | Open tabs list | Yes (tabs only) |
| `useSaveStore` | Save status indicator | No |
| `useWritingStore` | Focus mode, writing goals | Partial |
| `useThemeStore` | Theme preferences | Yes |
| `useFontSettings` | Font preferences | Yes |

**Key Principle:** Zustand stores should NOT contain business data. If data needs to be queried, filtered, or shared across the app, it belongs in Dexie.

```typescript
// ✅ Good - UI state in Zustand
const isOpen = useUIStore(s => s.rightSidebarOpen);

// ❌ Bad - Business data in Zustand
const projects = useProjectStore(s => s.projects); // Should use Dexie
```

### 4. In-Memory State (React useState/useRef)

**Use for:** Component-local state that doesn't need to be shared

```typescript
// Editor scroll position - local to component
const [scrollTop, setScrollTop] = useState(0);

// Form input state
const [title, setTitle] = useState("");
```

## Decision Tree

```
Need to store data?
├── Does it need to survive app restart?
│   ├── YES → Use Dexie
│   │   └── Need reactive updates in components? → Use useLiveQuery
│   └── NO → Is it shared across components?
│       ├── YES → Use Zustand
│       └── NO → Use React useState/useRef
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Layer                          │
│  (React Components - render only, no business state)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Hook Layer                              │
│  useLiveQuery (persistent)  │  useZustandStore (UI state)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│  (Business logic, validation, data transformation)          │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    Dexie (IndexedDB)    │     │   Zustand (Memory)      │
│    Persistent Data      │     │   UI State              │
└─────────────────────────┘     └─────────────────────────┘
```

## Why NOT TanStack Query?

TanStack Query is designed for **server state** (HTTP API caching). For a local-first app using IndexedDB:

| Feature | TanStack Query | dexie-react-hooks |
|---------|---------------|-------------------|
| Primary Use | Server data caching | Local DB subscriptions |
| Data Source | HTTP APIs | IndexedDB |
| Cache Strategy | stale-while-revalidate | Real-time subscription |
| Auto Updates | Requires configuration | Automatic on DB change |
| Offline Support | Requires extra setup | Native |

**Conclusion:** `useLiveQuery` provides everything we need for local data without the complexity of TanStack Query.

## Editor State Management

Editor tabs have a special hybrid approach:

```typescript
// editor-tabs.ts
{
  tabs: EditorTab[],        // Persisted - restore open tabs on restart
  activeTabId: string,      // Persisted - remember which tab was active
  editorStates: Record<...> // NOT persisted - runtime only for performance
}
```

**Why?**
- Tab list should survive restart (user expectation)
- Editor states (scroll position, selection) are transient and can be large
- Content is already persisted in Dexie's `contents` table

## Best Practices

### 1. Keep Stores Focused
Each Zustand store should have a single responsibility:
- `useUIStore` - UI layout preferences
- `useSelectionStore` - Current selection state
- `useSaveStore` - Save operation status

### 2. Use Builders for Object Creation
```typescript
const node = new NodeBuilder()
  .workspace(workspaceId)
  .type("file")
  .title("Chapter 1")
  .build(); // Validates with Zod
```

### 3. Validate at Boundaries
Use Zod schemas when:
- Creating new entities
- Importing data
- Receiving external input

### 4. Separate Content from Metadata
The `contents` table is separate from `nodes` for performance:
- Loading file tree doesn't load all document content
- Content is loaded on-demand when opening a file
- Reduces memory usage for large projects

## Migration Notes

When refactoring existing code:

1. **Move persistent state from Zustand to Dexie**
   - If data is queried/filtered, it belongs in Dexie
   - If data is shared across unrelated components, consider Dexie

2. **Consolidate related UI stores**
   - `ui.ts` and `ui-settings.ts` → merged into `ui.ts`
   - Reduces complexity and localStorage keys

3. **Use model hooks instead of direct queries**
   ```typescript
   // Before
   const nodes = useLiveQuery(() => db.nodes.where(...).toArray());
   
   // After
   const nodes = useNodesByWorkspace(workspaceId);
   ```

## Requirements Reference

This architecture satisfies:
- **Req 1.5**: Clear documentation for data management tools
- **Req 4.1**: Dexie for persistent data
- **Req 4.2**: useLiveQuery for reactive subscriptions
- **Req 4.3**: Zustand for UI state only
- **Req 4.4**: TanStack Query not needed for local data
