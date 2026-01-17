# Design Document: File Tree Virtual Refactor

## Overview

This design refactors the file tree component to use a simpler, more performant architecture based on virtual scrolling. We replace react-arborist with @tanstack/react-virtual and implement our own tree logic using functional programming principles.

## Architecture

### Data Flow

```
NodeInterface[] (from DB)
    ↓
[pipes/node] flattenTree() → FlatTreeNode[]
    ↓
[hooks] useFileTree() → Virtual list config
    ↓
[views] FileTree → @tanstack/react-virtual
    ↓
[views] TreeNodeRow → shadcn/ui components
```

### Key Principles

1. **Virtual Scrolling**: Only render visible nodes
2. **Flat Data Structure**: Convert tree to flat array for virtual list
3. **Zustand State**: Single source of truth for expand/collapse
4. **Pure Functions**: All data transformations in pipes/
5. **Shadcn UI**: Consistent styling with rest of app

## Components

### 1. Data Types

```typescript
// types/node/node.interface.ts

/** Flattened tree node for virtual rendering */
export interface FlatTreeNode {
  readonly id: string
  readonly title: string
  readonly type: NodeType
  readonly depth: number          // Indentation level (0 = root)
  readonly hasChildren: boolean   // Does this folder have children?
  readonly isExpanded: boolean    // Is this folder expanded?
  readonly parentId: string | null
  readonly order: number
}
```

### 2. Pipes Layer

#### 2.1 Tree Flattening (`pipes/node/flatten-tree.pipe.ts`)

```typescript
/**
 * Flatten tree structure into linear array for virtual rendering
 * 
 * Algorithm:
 * 1. Start with root nodes (parent === null)
 * 2. For each node, add to result array
 * 3. If node is folder and expanded, recursively add children
 * 4. Track depth for indentation
 * 
 * @param nodes - All nodes from database
 * @param expandedFolders - Map of folder IDs to expanded state
 * @returns Flattened array of nodes with depth information
 */
export const flattenTree = (
  nodes: readonly NodeInterface[],
  expandedFolders: Record<string, boolean>,
): readonly FlatTreeNode[] => {
  // Implementation details in tasks
}
```

#### 2.2 Expand/Collapse Helpers (existing)

- `calculateExpandAllFolders()` - Already exists
- `calculateCollapseAllFolders()` - Already exists
- `calculateAncestorPath()` - Already exists
- `calculateExpandedAncestors()` - Already exists

### 3. Hooks Layer

#### 3.1 useFileTree Hook

```typescript
// hooks/use-file-tree.ts

export interface UseFileTreeParams {
  readonly nodes: readonly NodeInterface[]
  readonly selectedNodeId: string | null
  readonly onSelectNode: (nodeId: string) => void
  readonly onCreateFolder: (parentId: string | null) => void
  readonly onCreateFile: (parentId: string | null, type: NodeType) => void
  readonly onDeleteNode: (nodeId: string) => void
  readonly onRenameNode: (nodeId: string, newTitle: string) => void
}

export interface UseFileTreeReturn {
  readonly flatNodes: readonly FlatTreeNode[]
  readonly virtualizer: Virtualizer<HTMLDivElement, Element>
  readonly containerRef: React.RefObject<HTMLDivElement>
  readonly handlers: {
    readonly onToggleFolder: (nodeId: string) => void
    readonly onSelectNode: (nodeId: string) => void
  }
}

/**
 * Hook for file tree logic
 * 
 * Responsibilities:
 * - Flatten tree data using pipes
 * - Setup virtual scrolling
 * - Bind Zustand state
 * - Provide event handlers
 */
export function useFileTree(params: UseFileTreeParams): UseFileTreeReturn {
  // Implementation details in tasks
}
```

### 4. Views Layer

#### 4.1 FileTree Component

```typescript
// views/file-tree/file-tree.view.fn.tsx

/**
 * Main file tree component
 * 
 * Features:
 * - Virtual scrolling with @tanstack/react-virtual
 * - Expand/collapse all buttons
 * - Create file/folder buttons
 * - Empty states
 */
export function FileTree(props: FileTreeProps) {
  // Implementation details in tasks
}
```

#### 4.2 TreeNodeRow Component

```typescript
// views/file-tree/tree-node-row.view.fn.tsx

export interface TreeNodeRowProps {
  readonly node: FlatTreeNode
  readonly isSelected: boolean
  readonly onToggle: (nodeId: string) => void
  readonly onSelect: (nodeId: string) => void
  readonly onDelete: (nodeId: string) => void
  readonly onCreateFolder: (parentId: string) => void
  readonly onCreateFile: (parentId: string, type: NodeType) => void
}

/**
 * Single tree node row
 * 
 * Features:
 * - Indentation based on depth
 * - Expand/collapse chevron for folders
 * - Icon based on file type
 * - Selection highlight
 * - Context menu
 * - Hover actions
 */
export function TreeNodeRow(props: TreeNodeRowProps) {
  // Implementation details in tasks
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Flattening preserves tree structure

*For any* tree of nodes and expand state, flattening then reconstructing the tree hierarchy should produce an equivalent tree structure

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: Visible nodes match expand state

*For any* set of expanded folders, the flattened array should contain exactly the nodes that should be visible given the expand state

**Validates: Requirements 2.2, 2.3**

### Property 3: Depth calculation is correct

*For any* node in the flattened array, its depth should equal the number of ancestors from root to parent

**Validates: Requirements 2.5**

### Property 4: Node order is preserved

*For any* set of sibling nodes, their order in the flattened array should match their order field values

**Validates: Requirements 2.6**

### Property 5: Expand/collapse is idempotent

*For any* folder, toggling expand twice should return to the original state

**Validates: Requirements 3.1, 3.2**

### Property 6: Virtual list renders only visible items

*For any* scroll position, the number of DOM nodes should be less than or equal to visible items plus overscan

**Validates: Requirements 1.1, 1.2**

### Property 7: State changes trigger re-render

*For any* Zustand state change, the component should re-render with updated data

**Validates: Requirements 3.2**

### Property 8: Ancestor expansion is transitive

*For any* node, if it is visible then all its ancestors must be expanded

**Validates: Requirements 10.1, 10.3**

## Error Handling

### Invalid State
- If expandedFolders contains non-folder IDs, ignore them
- If node references missing parent, treat as root node
- If circular references detected, break cycle and log warning

### Performance Degradation
- If flattening takes > 100ms, log performance warning
- If virtual list stutters, increase overscan count
- If memory usage high, reduce overscan count

## Testing Strategy

### Unit Tests
- Test flattenTree with various tree structures
- Test depth calculation edge cases
- Test expand/collapse state updates
- Test node ordering

### Property-Based Tests
- Property 1: Tree structure preservation (round-trip)
- Property 2: Visible nodes correctness
- Property 3: Depth calculation
- Property 4: Order preservation
- Property 5: Idempotence

### Integration Tests
- Test full tree rendering with virtual scroll
- Test expand/collapse interactions
- Test create/delete/rename flows
- Test keyboard navigation
- Test context menu

### Performance Tests
- Benchmark with 1,000 nodes
- Benchmark with 10,000 nodes
- Measure frame rate during scroll
- Measure toggle response time

## Migration Strategy

### Phase 1: Preparation
1. Create new pipe functions
2. Create new types
3. Keep old implementation running

### Phase 2: Implementation
1. Implement new hooks
2. Implement new views
3. Test in isolation

### Phase 3: Integration
1. Switch FileTreePanel to use new implementation
2. Run parallel testing
3. Fix any issues

### Phase 4: Cleanup
1. Remove react-arborist dependency
2. Remove old files
3. Update documentation

## Dependencies

### New Dependencies
- `@tanstack/react-virtual` - Virtual scrolling

### Removed Dependencies
- `react-arborist` - Tree component (to be removed)

### Existing Dependencies
- `zustand` - State management
- `lucide-react` - Icons
- `shadcn/ui` - UI components
- `tailwindcss` - Styling

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial render (1k nodes) | < 200ms | Chrome DevTools Performance |
| Initial render (10k nodes) | < 500ms | Chrome DevTools Performance |
| Toggle folder | < 16ms | Chrome DevTools Performance |
| Scroll frame rate | 60fps | Chrome DevTools Performance |
| Memory usage (10k nodes) | < 50MB | Chrome DevTools Memory |

## File Structure

```
apps/desktop/src/
├── pipes/node/
│   ├── flatten-tree.pipe.ts          # NEW: Tree flattening logic
│   ├── flatten-tree.pipe.test.ts     # NEW: Unit tests
│   └── index.ts                       # UPDATE: Export new functions
├── hooks/
│   ├── use-file-tree.ts               # REFACTOR: Use virtual list
│   └── use-file-tree-panel.ts         # UPDATE: Minor changes
├── views/file-tree/
│   ├── file-tree.view.fn.tsx          # REFACTOR: Use virtual list
│   ├── tree-node-row.view.fn.tsx      # NEW: Single row component
│   ├── tree-node-row.view.fn.test.tsx # NEW: Row tests
│   └── file-tree.types.ts             # UPDATE: New types
└── types/node/
    └── node.interface.ts               # UPDATE: Add FlatTreeNode
```

## Open Questions

1. ~~Should we support drag-and-drop in the future?~~ No, not in this refactor
2. ~~What overscan count should we use?~~ Start with 5, tune based on performance
3. ~~Should we animate expand/collapse?~~ No, keep it simple for now
4. ~~How to handle very deep nesting (> 10 levels)?~~ Limit indentation at 10 levels

## References

- [VSCode Lists and Trees](https://github.com/microsoft/vscode/wiki/Lists-And-Trees)
- [@tanstack/react-virtual docs](https://tanstack.com/virtual/latest)
- [Grain Architecture](../../.kiro/steering/architecture.md)
