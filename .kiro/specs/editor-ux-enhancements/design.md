# Design Document

## Overview

This design document outlines enhancements to the editor module's mention and tag plugins, sidebar interaction improvements, and internationalization updates. The changes focus on improving usability, visual feedback, and language consistency across the application.

The editor module (`@novel-editor/editor`) is a shared package used by the desktop application. Changes to the editor plugins will benefit all consumers of this package. The desktop application will receive sidebar enhancements and language setting updates.

## Architecture

### Component Hierarchy

```
Desktop Application (apps/desktop)
├── Editor Module (@novel-editor/editor)
│   ├── MentionsPlugin (@ autocomplete)
│   ├── TagPickerPlugin (#[ autocomplete) - TO BE REMOVED
│   └── TagTransformPlugin (#[tag] conversion)
├── FileTree Component (sidebar)
├── UI Store (language settings)
└── MCP Configuration (testing)
```

### Data Flow

1. **Mention Selection Flow**:
   - User types `@` → MentionsPlugin triggers
   - Menu displays with keyboard/mouse navigation
   - Selection via click or Enter key → MentionNode inserted

2. **Tag Insertion Flow**:
   - User types `#[tagname]` → TagTransformPlugin converts to TagNode
   - No menu interaction required

3. **Sidebar Hover Flow**:
   - Mouse enters sidebar → CSS transitions apply
   - All items fade to full opacity
   - Breathing effect animates on hovered item
   - Mouse leaves → Non-selected items fade back

4. **Language Setting Flow**:
   - Application initializes → Check stored locale
   - No locale found → Default to "en"
   - UI renders with English strings

## Components and Interfaces

### 1. MentionsPlugin Enhancement

**File**: `packages/editor/src/plugins/mentions-plugin.tsx`

**Changes**:
- Add `onClick` handler to `MentionsTypeaheadMenuItem`
- Remove animation classes from menu container
- Ensure z-index is set to 99999 or higher
- Update helper text to English

**Interface** (no changes to public API):
```typescript
export interface MentionsPluginProps {
  mentionEntries?: MentionEntry[];
  wikiEntries?: MentionEntry[]; // deprecated
}
```

### 2. TagPickerPlugin Removal

**File**: `packages/editor/src/plugins/tag-picker-plugin.tsx`

**Action**: Remove this file entirely

**Rationale**: The TagTransformPlugin already handles automatic conversion of `#[tag]` syntax. The picker menu adds unnecessary UI complexity for a feature that works well with direct text input.

### 3. TagTransformPlugin (No Changes)

**File**: `packages/editor/src/plugins/tag-transform-plugin.tsx`

**Status**: This plugin remains unchanged and will be the sole handler for tag functionality.

### 4. FileTree Component Enhancement

**File**: `apps/desktop/src/components/file-tree/file-tree.tsx`

**Changes**:
- Add hover state management to parent container
- Apply breathing animation to hovered items
- Adjust opacity transitions for non-selected items
- Update Chinese text to English

**CSS Additions**:
```css
/* Breathing glow effect */
@keyframes breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.file-tree-item:hover {
  animation: breathe 1.5s ease-in-out infinite;
}

/* Opacity transitions */
.file-tree-container:hover .file-tree-item {
  opacity: 1;
  transition: opacity 200ms ease-in-out;
}

.file-tree-container:not(:hover) .file-tree-item:not(.selected) {
  opacity: 0.6;
  transition: opacity 200ms ease-in-out;
}
```

### 5. UI Store Language Default

**File**: `apps/desktop/src/stores/ui.ts`

**Changes**:
- Add `locale` field to UIState interface
- Set default value to `"en"`
- Persist locale in storage

**Updated Interface**:
```typescript
interface UIState {
  // ... existing fields
  locale: string;
  setLocale: (locale: string) => void;
}
```

### 6. MCP Configuration

**File**: `.kiro/settings/mcp.json` or `~/.kiro/settings/mcp.json`

**Configuration**:
```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "env": {
        "PUPPETEER_BROWSER_URL": "http://localhost:1420"
      }
    }
  }
}
```

## Data Models

### MentionEntry (Existing)

```typescript
export interface MentionEntry {
  id: string;
  name: string;
  alias?: string[];
  tags?: string[];
}
```

### TreeData (Existing)

```typescript
interface TreeData {
  id: string;
  name: string;
  type: NodeType;
  collapsed: boolean;
  children?: TreeData[];
}
```

### UIState (Enhanced)

```typescript
interface UIState {
  rightPanelView: RightPanelView;
  setRightPanelView: (view: RightPanelView) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  tabPosition: TabPosition;
  setTabPosition: (position: TabPosition) => void;
  locale: string; // NEW
  setLocale: (locale: string) => void; // NEW
}
```

## Error Handling

### Mention Plugin Errors

- **No entries available**: Display empty state message in English
- **Click handler fails**: Fall back to keyboard selection
- **Menu positioning fails**: Use default portal positioning

### Tag Transform Errors

- **Invalid tag format**: Leave text unchanged
- **Regex match fails**: No transformation occurs

### Sidebar Hover Errors

- **CSS animation not supported**: Gracefully degrade to instant transitions
- **Performance issues**: Reduce animation duration or disable on low-end devices

### Language Setting Errors

- **Locale not found**: Default to "en"
- **Invalid locale value**: Reset to "en"
- **Storage failure**: Use in-memory fallback

## Testing Strategy

### Unit Tests

Unit tests will verify specific behaviors and edge cases:

1. **Mention Plugin Click Handler**:
   - Test that clicking an option inserts the mention
   - Test that clicking closes the menu
   - Test that hover updates selection state

2. **Tag Transform Plugin**:
   - Test valid tag patterns are converted
   - Test invalid patterns are ignored
   - Test multiple tags in one text node

3. **UI Store Locale**:
   - Test default locale is "en"
   - Test locale persistence
   - Test locale updates trigger re-renders

4. **FileTree Internationalization**:
   - Test all Chinese strings are replaced with English
   - Test menu items display correct English labels

### Property-Based Tests

Property-based tests will verify universal behaviors across many inputs using a PBT library. For TypeScript/React projects, we will use **fast-check** as the property-based testing framework.

**Configuration**: Each property test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Mention Plugin Properties

**Property 1: Click selection inserts mention**
*For any* mention option in the typeahead menu, clicking that option should insert the corresponding MentionNode into the editor and close the menu.
**Validates: Requirements 1.1, 1.2**

**Property 2: Hover updates selection state**
*For any* mention option in the typeahead menu, hovering over that option should update the selection state to highlight that option.
**Validates: Requirements 1.3**

**Property 3: Selection state consistency**
*For any* sequence of mouse hovers and keyboard navigation events, the highlighted menu option should always match the current selection index.
**Validates: Requirements 1.4**

**Property 4: Menu layering**
*For any* editor state where the mention menu is displayed, the menu element should have a z-index value that ensures it renders above all editor content.
**Validates: Requirements 2.2**

### Tag Plugin Properties

**Property 5: Tag transformation without menu**
*For any* valid tag name (alphanumeric, Chinese characters, underscores), typing `#[tagname]` should convert to a TagNode without displaying a typeahead menu.
**Validates: Requirements 4.1, 4.3**

### Sidebar Properties

**Property 6: Hover breathing effect**
*For any* sidebar item, hovering over that item should apply a pulsing animation effect.
**Validates: Requirements 5.1**

**Property 7: Sidebar hover opacity**
*For any* file tree state, hovering over the sidebar container should set all items to full opacity (1.0).
**Validates: Requirements 5.2**

**Property 8: Non-hover opacity reduction**
*For any* file tree state with a selected item, when not hovering the sidebar, non-selected items should have reduced opacity.
**Validates: Requirements 5.3**

**Property 9: Selected item persistence**
*For any* selected file tree item, that item should maintain its highlight styling regardless of whether the sidebar is being hovered.
**Validates: Requirements 5.4**

### Examples (Specific Test Cases)

The following are specific examples that verify exact values or configurations:

**Example 1: Menu z-index value**
Verify that the mention menu element has `z-index: 99999` or higher.
**Validates: Requirements 2.1, 2.3**

**Example 2: No animation classes**
Verify that the mention menu element does not have CSS classes: `animate-in`, `fade-in-0`, `zoom-in-95`, or any `duration-*` classes.
**Validates: Requirements 3.1, 3.2, 3.3**

**Example 3: TagPickerPlugin removed**
Verify that the TagPickerPlugin is not imported or registered in the editor configuration.
**Validates: Requirements 4.2**

**Example 4: Breathing animation duration**
Verify that the sidebar hover animation has a duration between 1-2 seconds.
**Validates: Requirements 5.5**

**Example 5: MCP configuration**
Verify that MCP server can connect to browser on port 1420 for automation testing.
**Validates: Requirements 6.1**

**Example 6: Diary creation automation**
Verify that automated test can create a diary entry successfully.
**Validates: Requirements 6.2**

**Example 7: Wiki creation automation**
Verify that automated test can create a wiki entry successfully.
**Validates: Requirements 6.3**

**Example 8: Editor text input automation**
Verify that automated test can input text into the editor.
**Validates: Requirements 6.4**

**Example 9: Mention menu automation**
Verify that automated test can trigger the mention menu.
**Validates: Requirements 6.5**

**Example 10: English UI labels**
Verify that FileTree component displays English labels: "Explorer", "Create new folder", "Create new file", "No files yet", "Create File".
**Validates: Requirements 7.1**

**Example 11: English mention helper text**
Verify that mention menu displays: "↑↓ Select · ↵ Confirm · Esc Cancel".
**Validates: Requirements 7.2**

**Example 12: English error messages**
Verify that error messages are displayed in English.
**Validates: Requirements 7.4**

**Example 13: Default locale is English**
Verify that on first application launch, the locale is set to "en", and when no locale is stored, the system defaults to "en".
**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

