# Type Check Errors Report

**Generated:** Task 52.2 - 运行类型检查
**Date:** 2025-12-22
**Command:** `bun run check` + `bunx tsc --noEmit`

## Summary

- **Total TypeScript Errors:** 95 errors in 29 files
- **Total Biome Errors:** 83 errors
- **Total Biome Warnings:** 77 warnings
- **Total Biome Infos:** 5 infos

## Critical Issues by Category

### 1. Missing Module Errors (High Priority 🔴)

These are blocking errors that prevent the application from running.

#### 1.1 `@/db/models` Import Errors (14 files)

Files trying to import from the old `@/db/models` path:

```typescript
// ❌ Error: Cannot find module '@/db/models'
```

**Affected Files:**
1. `src/components/workspace/story-workspace.tsx:30`
2. `src/domain/diary/diary.service.ts:9`
3. `src/domain/export/export.service.ts:23`
4. `src/domain/export/export.utils.ts:8`
5. `src/domain/file-creator/file-creator.service.ts:16`
6. `src/domain/import-export/import-export.service.ts:21`
7. `src/domain/save/save.service.ts:14`
8. `src/domain/search/search.service.ts:14`
9. `src/domain/wiki/wiki-migration.service.ts:15`
10. `src/domain/wiki/wiki.service.ts:17`
11. `src/services/__tests__/drawings.property.test.ts:12`
12. `src/services/drawings.ts:19`
13. `src/services/drawings.utils.ts:10`
14. `src/services/nodes.ts:23`
15. `src/services/tags.ts:17`
16. `src/services/workspaces.ts:9`

**Fix Required:** Replace with new paths:
- `@/db/models` → `@/types/node`, `@/types/workspace`, etc.

#### 1.2 `@/services/*` Import Errors (7 files)

Files trying to import from non-existent services:

```typescript
// ❌ Error: Cannot find module '@/services/export'
// ❌ Error: Cannot find module '@/services/import-export'
// ❌ Error: Cannot find module '@/services/save'
// ❌ Error: Cannot find module '@/services/wiki-files'
// ❌ Error: Cannot find module '@/services/keyboard-shortcuts'
// ❌ Error: Cannot find module '@/services/export-path'
// ❌ Error: Cannot find module '@/services/updater'
// ❌ Error: Cannot find module '@/services/clear-data'
```

**Affected Files:**
1. `src/components/blocks/export-dialog.tsx:33` - `@/services/export`
2. `src/components/blocks/export-dialog.tsx:40` - `@/services/import-export`
3. `src/components/blocks/update-checker.tsx:25` - `@/services/updater`
4. `src/components/export/export-button.tsx:21` - `@/services/export`
5. `src/components/workspace/story-workspace.tsx:37` - `@/services/save`
6. `src/components/workspace/story-workspace.tsx:38` - `@/services/wiki-files`
7. `src/hooks/use-manual-save.ts:11` - `@/services/keyboard-shortcuts`
8. `src/hooks/use-manual-save.ts:12` - `@/services/save`
9. `src/routes/settings/export.tsx:21` - `@/services/export-path`
10. `src/routes/test-clear-data.tsx:15` - `@/services/clear-data`

**Fix Required:** Migrate these services to new architecture:
- `@/services/export` → `@/fn/export/` + `@/actions/`
- `@/services/import-export` → `@/fn/import/` + `@/fn/export/`
- `@/services/save` → `@/fn/save/`
- `@/services/wiki-files` → `@/fn/wiki/`
- `@/services/keyboard-shortcuts` → `@/fn/keyboard/`
- `@/services/export-path` → `@/fn/export/`
- `@/services/updater` → `@/fn/updater/`
- `@/services/clear-data` → Already migrated to `@/db/clear-data.db.fn.ts`

### 2. DrawingBuilder Read-only Property Errors (High Priority 🔴)

**File:** `src/types/drawing/drawing.builder.ts`

**Issue:** Attempting to assign to readonly properties of `DrawingInterface`

**Errors (13 occurrences):**
```typescript
// ❌ Error: Cannot assign to 'id' because it is a read-only property
this.data.id = id;           // Line 51
this.data.project = projectId; // Line 61
this.data.name = name;       // Line 71
this.data.content = content; // Line 81
this.data.width = width;     // Line 91
this.data.height = height;   // Line 101
this.data.createDate = timestamp; // Line 123
this.data.updatedAt = timestamp;  // Line 133
// ... and more
```

**Root Cause:** `private data: DrawingInterface` should be `private data: Partial<DrawingInterface>`

**Fix Required:**
```typescript
// Change from:
private data: DrawingInterface = { /* ... */ };

// To:
private data: Partial<DrawingInterface> = {};
```

### 3. Test File Type Errors (Medium Priority 🟡)

#### 3.1 `createdAt` vs `createDate` (4 files)

**Issue:** Test files using wrong property name

**Affected Files:**
1. `src/db/drawing.db.fn.test.ts:35` - `createdAt` should be `createDate`
2. `src/db/tag.db.fn.test.ts:31` - `createdAt` should be `createDate`
3. `src/fn/tag/tag.extract.fn.test.ts:38` - `createdAt` should be `createDate`

**Fix Required:**
```typescript
// Change from:
createdAt: overrides.createdAt ?? new Date().toISOString()

// To:
createDate: overrides.createDate ?? dayjs().toISOString()
```

#### 3.2 UserPlan Type Errors (8 occurrences)

**File:** `src/db/user.db.fn.test.ts`

**Issue:** Using string `"pro"` instead of proper `UserPlan` enum

**Errors:**
```typescript
// ❌ Type '"pro"' is not assignable to type 'UserPlan | undefined'
plan: "pro"  // Lines 195, 427, 429, 433, 438, 469, 482
```

**Fix Required:** Import and use the correct `UserPlan` type from `@/types/user`

#### 3.3 Other Test Errors

1. `src/db/tag.db.fn.test.ts:533` - `undefined` not assignable to `string`
2. `src/db/user.db.fn.test.ts:521` - `UserFeatures` type mismatch
3. `src/routes/test-manual-save.tsx:107` - Missing props for `SaveStatusIndicator`

### 4. Implicit `any` Type Errors (Medium Priority 🟡)

**Total:** 30+ occurrences across multiple files

**Common Patterns:**

#### 4.1 Array Methods Without Type Annotations
```typescript
// ❌ Parameter 'n' implicitly has an 'any' type
nodes.map((n) => n.id)
nodes.filter((n) => n.parent === parentId)
nodes.sort((a, b) => a.order - b.order)
```

**Affected Files:**
- `src/domain/export/export.service.ts`
- `src/domain/import-export/import-export.service.ts`
- `src/domain/search/search.service.ts`
- `src/domain/wiki/wiki.service.ts`
- `src/services/nodes.ts`
- `src/services/drawings.ts`

#### 4.2 Callback Functions
```typescript
// ❌ Parameter 'progress' implicitly has an 'any' type
await downloadAndInstall((progress) => { /* ... */ })
```

**Affected Files:**
- `src/components/blocks/update-checker.tsx:73`
- `src/routes/settings/export.tsx:66`

### 5. Type Mismatch Errors (Medium Priority 🟡)

#### 5.1 WikiHoverPreview Props Mismatch

**File:** `src/components/workspace/story-workspace.tsx:295`

**Issue:** Missing `onFetchData` prop in type definition

```typescript
// ❌ Property 'onFetchData' is missing in type
WikiHoverPreview={WikiHoverPreview}
```

**Fix Required:** Update the type definition in `MultiEditorContainer` to include `onFetchData`

#### 5.2 Content Type Mismatches

**Files:**
- `src/domain/export/export.service.ts` - `Map<unknown, unknown>` vs `Map<string, string>`
- `src/domain/import-export/import-export.service.ts` - `{}` vs `string`
- `src/domain/search/search.service.ts` - `{}` vs `string`
- `src/domain/wiki/wiki.service.ts` - `{}` vs `string`

**Issue:** Content maps and strings not properly typed

### 6. Biome Lint Errors (Low Priority 🟢)

#### 6.1 Unused Imports (Fixable)
```typescript
// src/components/blocks/emptyProject.tsx:3
import { ArrowUpRightIcon, CalendarCheck } from "lucide-react";
```

#### 6.2 Template Literals (Fixable)
```typescript
// src/components/activity-bar.tsx:292
// ❌ Use template literal instead of string concatenation
location.pathname.startsWith(path + "/")
// ✅ Should be:
location.pathname.startsWith(`${path}/`)
```

#### 6.3 Unused Variables (Fixable)
```typescript
// src/components/activity-bar.tsx:138
const openTab = useEditorTabsStore((s) => s.openTab); // Unused
```

#### 6.4 Explicit `any` Types (10 occurrences)
```typescript
// src/components/blocks/canvas-editor.tsx
const sanitizeAppState = (appState: any): any => { /* ... */ }
```

#### 6.5 Array Index as Key (2 occurrences)
```typescript
// src/components/blocks/keyboard-shortcuts-help.tsx:74, 83
{items.map((shortcut, index) => (
  <div key={index}>  // ❌ Should use unique ID
))}
```

#### 6.6 Exhaustive Dependencies (6 occurrences)
```typescript
// src/components/activity-bar.tsx:59
useEffect(() => {
  // Uses selectedWorkspaceId, setSelectedWorkspaceId, etc.
}, [workspacesRaw]); // ❌ Missing dependencies
```

## Error Distribution by File

| File | TS Errors | Biome Issues |
|------|-----------|--------------|
| `src/types/drawing/drawing.builder.ts` | 13 | 0 |
| `src/domain/import-export/import-export.service.ts` | 11 | 0 |
| `src/db/user.db.fn.test.ts` | 8 | 0 |
| `src/services/drawings.ts` | 7 | 0 |
| `src/services/nodes.ts` | 7 | 0 |
| `src/domain/export/export.service.ts` | 6 | 0 |
| `src/components/workspace/story-workspace.tsx` | 5 | 0 |
| `src/domain/wiki/wiki.service.ts` | 5 | 0 |
| `src/domain/search/search.service.ts` | 4 | 0 |
| `src/components/activity-bar.tsx` | 0 | 8 |
| `src/components/blocks/canvas-editor.tsx` | 0 | 11 |
| Others | 29 | 158 |

## Recommended Fix Order

### Phase 1: Critical Blockers (Must Fix First)
1. ✅ Fix `DrawingBuilder` readonly property errors (Task 64)
2. ⏳ Migrate `@/services/export` module (Task 66)
3. ⏳ Migrate `@/services/import-export` module (Task 67)
4. ⏳ Migrate `@/services/save` module (Task 68)
5. ⏳ Migrate `@/services/wiki-files` module (Task 69)
6. ⏳ Migrate `@/services/keyboard-shortcuts` module (Task 70)
7. ⏳ Migrate `@/services/export-path` module (Task 71)
8. ⏳ Update all `@/db/models` imports (Task 65)

### Phase 2: Test Fixes (Should Fix Soon)
9. ⏳ Fix test file `createdAt` → `createDate` (Task 73)
10. ⏳ Fix `UserPlan` type usage in tests (Task 73)

### Phase 3: Type Safety Improvements (Can Fix Later)
11. ⏳ Add type annotations to array methods
12. ⏳ Fix WikiHoverPreview props (Task 72)
13. ⏳ Fix content type mismatches

### Phase 4: Lint Cleanup (Low Priority)
14. ⏳ Remove unused imports (Task 74)
15. ⏳ Use template literals (Task 75)
16. ⏳ Fix `any` types (Task 76)
17. ⏳ Fix label associations (Task 77)
18. ⏳ Fix exhaustive dependencies

## Next Steps

1. **Immediate:** Start with Phase 1 tasks (64-71) to unblock development
2. **Soon:** Fix test errors (Task 73) to enable testing
3. **Later:** Address type safety and lint issues for code quality

## Notes

- Many errors are interconnected - fixing module imports will cascade fixes
- The refactor is ~80% complete, but these remaining errors block execution
- Priority should be on getting the app running first, then improving type safety
