# Layout Restoration - Quick Start Guide

## Task 1 Complete ✅

Dependencies are installed and verified. You're ready to start implementation!

---

## Available Tools

### 1. react-resizable-panels (v3.0.6)

```typescript
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Basic usage
<PanelGroup direction="horizontal" autoSaveId="grain-main-layout">
  <Panel id="sidebar" defaultSize={20} minSize={15} maxSize={40}>
    {/* Sidebar content */}
  </Panel>
  <PanelResizeHandle />
  <Panel id="main" defaultSize={80}>
    {/* Main content */}
  </Panel>
</PanelGroup>
```

**Key Features**:
- Auto-save layout state with `autoSaveId`
- Drag-to-resize with `PanelResizeHandle`
- Min/max size constraints
- Collapse detection
- Keyboard navigation support

### 2. fast-check (v4.5.3)

```typescript
import fc from 'fast-check';

// Property-based testing
describe('Layout State Persistence', () => {
  it('should round-trip layout state', () => {
    fc.assert(
      fc.property(
        fc.record({
          isSidebarOpen: fc.boolean(),
          activePanel: fc.constantFrom('files', 'search', 'drawings', 'tags', null),
          sidebarWidth: fc.integer({ min: 15, max: 40 }),
        }),
        (layoutState) => {
          // Test logic
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Key Features**:
- Generate random test data
- Property-based testing
- Shrinking on failure
- Configurable test runs

---

## Next Task: Task 2 - 创建类型定义

Create type definitions in the following order:

1. **Task 2.1**: `types/layout.interface.ts`
   - LayoutState
   - SidebarPanel
   - LayoutActions

2. **Task 2.2**: `types/global-ui.interface.ts`
   - GlobalUIState
   - GlobalUIActions

3. **Task 2.3**: `types/theme.interface.ts`
   - ThemeMode
   - ThemeState
   - ThemeActions

---

## Architecture Reminder

Follow the Grain functional architecture:

```
types/ → utils/ → io/ → pipes/ → state/ → flows/ → hooks/ → views/
```

**Key Principles**:
- Types first (no dependencies)
- Pure functions in pipes/
- Side effects in io/ and flows/
- State management in state/
- React bindings in hooks/
- UI components in views/

---

## File Naming Conventions

| Type | Suffix | Example |
|------|--------|---------|
| Types | `.interface.ts` | `layout.interface.ts` |
| State | `.state.ts` | `layout.state.ts` |
| Flows | `.flow.ts` | `init-layout.flow.ts` |
| Hooks | `use-*.ts` | `use-layout.ts` |
| Views | `.view.fn.tsx` | `app-layout.view.fn.tsx` |
| Containers | `.container.fn.tsx` | `activity-bar.container.fn.tsx` |

---

## Testing Strategy

- **Unit tests**: For pure functions (pipes/, utils/)
- **Property tests**: For correctness properties (using fast-check)
- **Integration tests**: For component interactions
- **E2E tests**: For complete user flows

---

## Resources

- [react-resizable-panels docs](https://github.com/bvaughn/react-resizable-panels)
- [fast-check docs](https://fast-check.dev/)
- [Design Document](.kiro/specs/layout-restoration/design.md)
- [Requirements](.kiro/specs/layout-restoration/requirements.md)
- [Tasks](.kiro/specs/layout-restoration/tasks.md)
