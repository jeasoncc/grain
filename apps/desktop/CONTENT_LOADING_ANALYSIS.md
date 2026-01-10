# Content Loading Flow Analysis

## Overview
This document analyzes the content loading flow for file creation and opening in the desktop app.

## File Creation Flow

### 1. UI Trigger (FileTreePanel)
- Location: `apps/desktop/src/views/panels/file-tree-panel/file-tree-panel.container.fn.tsx`
- Handler: `handleCreateFile(parentId, type)`
- Creates content based on type:
  - `type === "drawing"`: `JSON.stringify({ elements: [], appState: {}, files: {} })`
  - Other types: Empty string `""`

**Issue Found**: Regular files are created with empty content, not with template content!

### 2. Create File Action
- Location: `apps/desktop/src/flows/file/create-file.action.ts`
- Function: `createFileAsync(params)`
- Flow:
  1. Get next sort order
  2. Create node with content via `nodeRepo.createNode()`
  3. Open tab via `openTabFlow()`
  4. Parse content as JSON and set editor state via `updateEditorStateFlow()`

**Issue Found**: Content is only set if it's provided in params. Empty string results in no editor state being set.

### 3. Node Creation (API Layer)
- Location: `apps/desktop/src/io/api/node.api.ts`
- Function: `createNode(input, initialContent, tags)`
- Encodes the request and calls Rust backend
- Backend creates both node and content records

### 4. Editor State Update
- Location: `apps/desktop/src/flows/editor-tabs/editor-tabs.flow.ts`
- Function: `updateEditorStateFlow(tabId, { serializedState: parsed })`
- Sets the `serializedState` property on the editor instance state
- This should trigger the Lexical editor to render the content

## File Opening Flow

### 1. Open File Action
- Location: `apps/desktop/src/flows/file/open-file.action.ts`
- Function: `openFileAsync(params)`
- Flow:
  1. Check if tab already exists
  2. Load content from DB via `contentRepo.getContentByNodeId()`
  3. Create tab via `openTabFlow()`
  4. Parse content and set editor state via `updateEditorStateFlow()`

**Potential Issue**: If content doesn't exist in DB, editor state is not set, resulting in empty editor.

## Root Cause Analysis

### Problem 1: No Template Content for Regular Files
When creating a regular file (not drawing), the `handleCreateFile` function passes an empty string as content:

```typescript
const content = type === "drawing" 
  ? JSON.stringify({ elements: [], appState: {}, files: {} })
  : "";
```

This means:
- No template content is generated
- Empty string is saved to database
- When file is opened, empty content is loaded
- Editor shows blank state

### Problem 2: Template System Not Integrated
The template system exists in `apps/desktop/src/pipes/content/content.template.fn.ts` but is NOT used in the regular file creation flow. It's only used for:
- Diary files (via `createDiaryCompatAsync`)
- Templated files (via `createTemplatedFile`)

### Problem 3: Content Parsing
The content must be valid JSON representing a Lexical `SerializedEditorState`. An empty string `""` is not valid JSON, so it fails to parse and no editor state is set.

## Expected Flow (Not Implemented)

For regular file creation, the flow should be:

1. User clicks "Create File"
2. System generates template content using `generateContentByType("file")`
3. Template content (valid Lexical JSON) is passed to `createFileAsync`
4. Content is saved to database
5. Editor state is set with template content
6. User sees template content in editor

## Recommendations for Fix (Subtask 2.3)

1. **Generate Template Content**: Modify `handleCreateFile` to generate proper template content for all file types
2. **Use Content Generation Functions**: Integrate `generateContentByType()` or similar functions
3. **Ensure Valid JSON**: All content must be valid Lexical SerializedEditorState JSON
4. **Add Fallback**: If content generation fails, use a minimal valid Lexical document

## Debug Logs Added

Added comprehensive logging to track the flow:
- `[FileTreePanel]` - UI layer
- `[CreateFile]` - Create file action
- `[OpenFile]` - Open file action  
- `[NodeAPI]` - Node API layer
- `[ContentAPI]` - Content API layer

These logs will help verify the fix in subtask 2.3.
