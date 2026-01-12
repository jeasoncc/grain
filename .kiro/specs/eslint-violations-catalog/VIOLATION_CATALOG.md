# Complete ESLint Violations Catalog

**Generated**: 2026-01-12 12:28:51  
**Total Violations**: 5,466 (5,023 errors, 443 warnings)  
**Total Files**: 512

## Summary by Rule

| Rank | Rule | Count | % | Priority |
|------|------|-------|---|----------|
| 1 | `functional/prefer-readonly-type` | 1,488 | 27.2% | P1 |
| 2 | `functional/immutable-data` | 735 | 13.4% | P1 |
| 3 | `grain/no-mutation` | 667 | 12.2% | P1 |
| 4 | `check-file/filename-naming-convention` | 476 | 8.7% | P2 |
| 5 | `no-undef` | 408 | 7.5% | P0 |
| 6 | `functional/no-this-expressions` | 337 | 6.2% | P1 |
| 7 | `grain/no-date-constructor` | 311 | 5.7% | P1 |
| 8 | `grain/no-try-catch` | 288 | 5.3% | P1 |
| 9 | `grain/layer-dependencies` | 225 | 4.1% | P0 |
| 10 | `arrow-body-style` | 194 | 3.5% | P2 |
| 11 | `grain/no-console-log` | 108 | 2.0% | P2 |
| 12 | `@typescript-eslint/no-unused-vars` | 103 | 1.9% | P0 |
| 13 | `grain/no-side-effects-in-pipes` | 98 | 1.8% | P0 |
| 14 | `@typescript-eslint/no-explicit-any` | 9 | 0.2% | P0 |
| 15 | `functional/prefer-property-signatures` | 7 | 0.1% | P2 |
| 16 | `prefer-arrow-callback` | 6 | 0.1% | P2 |
| 17 | `no-irregular-whitespace` | 2 | 0.0% | P2 |
| 18 | `prefer-const` | 1 | 0.0% | P2 |
| 19 | `no-empty` | 1 | 0.0% | P2 |
| 20 | `no-empty-pattern` | 1 | 0.0% | P2 |
| 21 | `no-param-reassign` | 1 | 0.0% | P1 |

## Top 50 Files by Violation Count

| Rank | File | Errors | Warnings | Total |
|------|------|--------|----------|-------|
| 1 | `src/pipes/content/content.generate.fn.ts` | 190 | 0 | 190 |
| 2 | `src/types/rust-api.ts` | 170 | 0 | 170 |
| 3 | `src/types/editor-tab/editor-tab.builder.ts` | 112 | 0 | 112 |
| 4 | `src/io/api/client.api.ts` | 106 | 0 | 106 |
| 5 | `src/types/user/user.builder.ts` | 102 | 0 | 102 |
| 6 | `src/flows/search/search-engine.flow.ts` | 88 | 0 | 88 |
| 7 | `src/flows/export/export-project.flow.ts` | 87 | 0 | 87 |
| 8 | `src/pipes/import/import.markdown.fn.ts` | 73 | 0 | 73 |
| 9 | `src/types/tag/tag.builder.ts` | 73 | 0 | 73 |
| 10 | `src/flows/log/async-log.flow.ts` | 68 | 0 | 68 |
| 11 | `src/types/node/node.builder.ts` | 67 | 0 | 67 |
| 12 | `src/types/workspace/workspace.builder.ts` | 67 | 0 | 67 |
| 13 | `src/views/panels/tag-graph-panel/tag-graph-panel.view.fn.tsx` | 24 | 41 | 65 |
| 14 | `src/flows/migration/dexie-to-sqlite.migration.fn.ts` | 62 | 0 | 62 |
| 15 | `src/views/panels/file-tree-panel/file-tree-panel.container.fn.tsx` | 56 | 2 | 58 |
| 16 | `src/state/font.state.ts` | 34 | 22 | 56 |
| 17 | `src/utils/keyboard.util.ts` | 55 | 0 | 55 |
| 18 | `src/flows/save/save-service-manager.flow.ts` | 54 | 0 | 54 |
| 19 | `src/views/excalidraw-editor/excalidraw-editor.container.fn.tsx` | 39 | 15 | 54 |
| 20 | `src/types/attachment/attachment.builder.ts` | 51 | 0 | 51 |
| 21 | `src/types/icon-theme/icon-theme.interface.ts` | 51 | 0 | 51 |
| 22 | `src/types/theme/theme.types.ts` | 48 | 0 | 48 |
| 23 | `src/pipes/export/export.markdown.fn.ts` | 46 | 0 | 46 |
| 24 | `src/io/storage/settings.storage.ts` | 45 | 0 | 45 |
| 25 | `src/types/error/error.types.ts` | 45 | 0 | 45 |
| 26 | `src/pipes/search/search.engine.fn.test.ts` | 44 | 0 | 44 |
| 27 | `src/state/sidebar.state.ts` | 22 | 20 | 42 |
| 28 | `src/types/content/content.builder.ts` | 42 | 0 | 42 |
| 29 | `src/flows/log/performance-test.ts` | 41 | 0 | 41 |
| 30 | `src/hooks/queries/attachment.queries.ts` | 36 | 5 | 41 |
| 31 | `src/views/ui/sidebar.tsx` | 16 | 25 | 41 |
| 32 | `src/flows/backup/clear-data.flow.ts` | 39 | 0 | 39 |
| 33 | `src/pipes/export/export.orgmode.fn.ts` | 39 | 0 | 39 |
| 34 | `src/state/editor-tabs.state.ts` | 27 | 12 | 39 |
| 35 | `src/flows/log/batch-log.flow.ts` | 38 | 0 | 38 |
| 36 | `src/state/theme.state.ts` | 23 | 15 | 38 |
| 37 | `src/utils/file-tree-navigation.util.ts` | 37 | 0 | 37 |
| 38 | `src/flows/log/test-logger.flow.ts` | 36 | 0 | 36 |
| 39 | `src/state/save.state.ts` | 19 | 17 | 36 |
| 40 | `src/types/selection/selection.builder.ts` | 35 | 0 | 35 |
| 41 | `src/views/activity-bar/activity-bar.container.fn.tsx` | 29 | 6 | 35 |
| 42 | `src/flows/log/config.flow.ts` | 34 | 0 | 34 |
| 43 | `src/pipes/export/export.bundle.fn.ts` | 33 | 0 | 33 |
| 44 | `src/pipes/node/node.tree.fn.ts` | 33 | 0 | 33 |
| 45 | `src/flows/log/query-optimization.flow.ts` | 32 | 0 | 32 |
| 46 | `src/pipes/log/log.format.pipe.ts` | 32 | 0 | 32 |
| 47 | `src/flows/export/export-path.flow.ts` | 31 | 0 | 31 |
| 48 | `src/flows/wiki/migrate-wiki.flow.ts` | 31 | 0 | 31 |
| 49 | `src/hooks/use-optimistic-collapse.ts` | 27 | 4 | 31 |
| 50 | `src/pipes/log/log-creation.pipe.ts` | 31 | 0 | 31 |

## Violation Categories

### P0 - Critical (Architecture & Type Safety)

**Total**: 1,043 violations (19.1%)

- `no-undef`: 408 - Undefined variables (type safety issue)
- `grain/layer-dependencies`: 225 - Architecture violations
- `@typescript-eslint/no-unused-vars`: 103 - Unused code
- `grain/no-side-effects-in-pipes`: 98 - Side effects in pure layers
- `@typescript-eslint/no-explicit-any`: 9 - Type safety

### P1 - High (Functional Programming)

**Total**: 3,827 violations (70.0%)

- `functional/prefer-readonly-type`: 1,488 - Missing readonly modifiers
- `functional/immutable-data`: 735 - Mutable data operations
- `grain/no-mutation`: 667 - Direct mutations
- `functional/no-this-expressions`: 337 - Using `this` keyword
- `grain/no-date-constructor`: 311 - Direct Date constructor usage
- `grain/no-try-catch`: 288 - Try-catch instead of functional error handling
- `no-param-reassign`: 1 - Parameter reassignment

### P2 - Medium (Code Style & Conventions)

**Total**: 596 violations (10.9%)

- `check-file/filename-naming-convention`: 476 - File naming issues
- `arrow-body-style`: 194 - Arrow function style
- `grain/no-console-log`: 108 - Console.log usage
- `functional/prefer-property-signatures`: 7 - Property signature style
- `prefer-arrow-callback`: 6 - Callback style
- `no-irregular-whitespace`: 2 - Whitespace issues
- `prefer-const`: 1 - Variable declaration
- `no-empty`: 1 - Empty blocks
- `no-empty-pattern`: 1 - Empty patterns

## Fix Strategy by Priority

### Phase 1: P0 - Critical Issues (Week 1)

Focus on architecture and type safety violations that could cause runtime errors.

**Estimated Impact**: Fix 1,043 violations (19.1%)

1. Fix `no-undef` (408) - Add missing imports/types
2. Fix `grain/layer-dependencies` (225) - Refactor architecture violations
3. Fix `@typescript-eslint/no-unused-vars` (103) - Remove unused code
4. Fix `grain/no-side-effects-in-pipes` (98) - Move side effects to flows
5. Fix `@typescript-eslint/no-explicit-any` (9) - Add proper types

### Phase 2: P1 - Functional Programming (Weeks 2-3)

Focus on immutability and functional patterns.

**Estimated Impact**: Fix 3,827 violations (70.0%)

1. Fix `functional/prefer-readonly-type` (1,488) - Add readonly modifiers
2. Fix `functional/immutable-data` (735) - Use immutable operations
3. Fix `grain/no-mutation` (667) - Replace mutations with immutable updates
4. Fix `functional/no-this-expressions` (337) - Remove `this` usage
5. Fix `grain/no-date-constructor` (311) - Use dayjs
6. Fix `grain/no-try-catch` (288) - Use TaskEither

### Phase 3: P2 - Code Style (Week 4)

Focus on code style and conventions.

**Estimated Impact**: Fix 596 violations (10.9%)

1. Fix `check-file/filename-naming-convention` (476) - Rename files
2. Fix `arrow-body-style` (194) - Consistent arrow functions
3. Fix `grain/no-console-log` (108) - Use logger
4. Fix remaining style issues (18)

## Detailed Reports

For complete line-by-line details, see:
- `apps/desktop/eslint-report.json` - Machine-readable JSON
- `apps/desktop/ESLINT_DETAILED_REPORT.md` - Human-readable markdown
