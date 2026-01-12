# ESLint 详细错误报告

**生成时间**: 2026/1/12 12:28:51

## 摘要

- **总文件数**: 512
- **总错误数**: 5023
- **总警告数**: 443
- **总问题数**: 5466

## 按规则分类

| 排名 | 规则 | 数量 |
|------|------|------|
| 1 | `functional/prefer-readonly-type` | 1488 |
| 2 | `functional/immutable-data` | 735 |
| 3 | `grain/no-mutation` | 667 |
| 4 | `check-file/filename-naming-convention` | 476 |
| 5 | `no-undef` | 408 |
| 6 | `functional/no-this-expressions` | 337 |
| 7 | `grain/no-date-constructor` | 311 |
| 8 | `grain/no-try-catch` | 288 |
| 9 | `grain/layer-dependencies` | 225 |
| 10 | `arrow-body-style` | 194 |
| 11 | `grain/no-console-log` | 108 |
| 12 | `@typescript-eslint/no-unused-vars` | 103 |
| 13 | `grain/no-side-effects-in-pipes` | 98 |
| 14 | `@typescript-eslint/no-explicit-any` | 9 |
| 15 | `functional/prefer-property-signatures` | 7 |
| 16 | `prefer-arrow-callback` | 6 |
| 17 | `no-irregular-whitespace` | 2 |
| 18 | `prefer-const` | 1 |
| 19 | `no-empty` | 1 |
| 20 | `no-empty-pattern` | 1 |

## 按文件分类 (Top 50)

| 排名 | 文件 | 错误 | 警告 | 总计 |
|------|------|------|------|------|
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

## 详细错误列表

### 按文件组织

#### src/pipes/content/content.generate.fn.ts

**问题数**: 190

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 13 | 1 | error | `check-file/filename-naming-convention` | The filename "content.generate.fn.ts" does not match the "+(.+).pipe.ts" pattern | manual |
| 24 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 25 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 26 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 27 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 28 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 29 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 30 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 37 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 38 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 39 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 40 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 41 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 42 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 43 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 44 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 51 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 51 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 52 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 53 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 54 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 55 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 56 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 63 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 63 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 64 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 65 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 66 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 67 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 68 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 69 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 76 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 76 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 77 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 78 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 79 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 80 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 81 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 82 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 83 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 90 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 90 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 91 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 92 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 93 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 94 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 95 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 96 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 97 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 98 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |

*... 还有 140 个问题*

#### src/types/rust-api.ts

**问题数**: 170

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 12 | 1 | error | `check-file/filename-naming-convention` | The filename "rust-api.ts" does not match the "+(.+).@(interface\|schema\|types).ts" pattern | manual |
| 14 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 16 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 18 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 20 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 22 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 24 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 24 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 26 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 32 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 34 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 36 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 38 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 40 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 42 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 44 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 44 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 46 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 52 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 54 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 56 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 58 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 60 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 62 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 64 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 66 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 68 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 70 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 70 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 72 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 96 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 98 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 100 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 102 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 104 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 104 | 9 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 106 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 112 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 114 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 116 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 118 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 118 | 9 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 124 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 126 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 132 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 134 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 136 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 138 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 140 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 142 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |

*... 还有 120 个问题*

#### src/types/editor-tab/editor-tab.builder.ts

**问题数**: 112

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 7 | 1 | error | `check-file/filename-naming-convention` | The filename "editor-tab.builder.ts" does not match the "+(.+).@(interface\|schema\|types).ts" pattern | manual |
| 28 | 16 | error | `grain/no-date-constructor` | ❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。

✅ 正确做法：
  import dayjs from "dayjs";
  const timestamp = dayjs().valueOf();
  const unixTimestamp = dayjs().unix(); | manual |
| 36 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 37 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 38 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 39 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 40 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 49 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _workspaceId: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._workspaceId = newValue; }); | manual |
| 49 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 49 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 50 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 54 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _nodeId: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._nodeId = newValue; }); | manual |
| 54 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 54 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 55 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 59 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _title: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._title = newValue; }); | manual |
| 59 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 59 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 60 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 64 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _type: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._type = newValue; }); | manual |
| 64 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 64 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 65 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 69 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _isDirty: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._isDirty = newValue; }); | manual |
| 69 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 69 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 70 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 77 | 24 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _workspaceId: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._workspaceId = newValue; }); | manual |
| 77 | 24 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 77 | 24 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 78 | 19 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _nodeId: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._nodeId = newValue; }); | manual |
| 78 | 19 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 78 | 19 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 79 | 18 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _title: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._title = newValue; }); | manual |
| 79 | 18 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 79 | 18 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 80 | 17 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _type: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._type = newValue; }); | manual |
| 80 | 17 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 80 | 17 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 81 | 34 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, _isDirty: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft._isDirty = newValue; }); | manual |
| 81 | 34 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 81 | 34 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 82 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 86 | 8 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 89 | 8 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 92 | 8 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 97 | 8 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 98 | 17 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 99 | 12 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 100 | 11 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |

*... 还有 62 个问题*

#### src/io/api/client.api.ts

**问题数**: 106

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 18 | 1 | error | `check-file/filename-naming-convention` | The filename "client.api.ts" does not match the "+(.+).api.ts" pattern | manual |
| 20 | 1 | error | `grain/layer-dependencies` | ❌ 架构层级违规！io 层不能依赖 io 层。

🏗️ 架构规则：
  io 只能依赖：types

✅ 建议：
  - 将此功能移动到合适的层级
  - 或通过允许的层级间接访问

📚 架构文档: 查看项目架构设计文档了解层级职责 | manual |
| 20 | 16 | error | `@typescript-eslint/no-unused-vars` | 'debug' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 20 | 23 | error | `@typescript-eslint/no-unused-vars` | 'warn' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 20 | 29 | error | `@typescript-eslint/no-unused-vars` | 'error' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 55 | 17 | error | `no-undef` | 'window' is not defined. | manual |
| 56 | 2 | error | `no-undef` | 'window' is not defined. | manual |
| 100 | 27 | error | `no-undef` | 'fetch' is not defined. | manual |
| 110 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 throw 语句！请返回 TaskEither.left() 表示错误。

✅ 正确做法：
  return TE.left({ type: "VALIDATION_ERROR", message: "Invalid input" }); | manual |
| 130 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 130 | 47 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 131 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 134 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 137 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 141 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 144 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 146 | 31 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 147 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 148 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 148 | 63 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 149 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 151 | 31 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 152 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 155 | 31 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 156 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 159 | 31 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 160 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 160 | 62 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 161 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 165 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 168 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 172 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 176 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 177 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 181 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 181 | 26 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 182 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 182 | 30 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 185 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 188 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 191 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 194 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 195 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 196 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 196 | 45 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 197 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 198 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 201 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 202 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 205 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |

*... 还有 56 个问题*

#### src/types/user/user.builder.ts

**问题数**: 102

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 11 | 1 | error | `check-file/filename-naming-convention` | The filename "user.builder.ts" does not match the "+(.+).@(interface\|schema\|types).ts" pattern | manual |
| 28 | 20 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 42 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 47 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 47 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 62 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, id: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.id = newValue; }); | manual |
| 62 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 62 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 63 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 72 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, username: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.username = newValue; }); | manual |
| 72 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 72 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 73 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 82 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, displayName: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.displayName = newValue; }); | manual |
| 82 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 82 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 83 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 92 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, avatar: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.avatar = newValue; }); | manual |
| 92 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 92 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 93 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 102 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, email: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.email = newValue; }); | manual |
| 102 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 102 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 103 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 112 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastLogin: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastLogin = newValue; }); | manual |
| 112 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 112 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 113 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 122 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, createDate: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.createDate = newValue; }); | manual |
| 122 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 122 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 123 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 132 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, plan: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.plan = newValue; }); | manual |
| 132 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 132 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 133 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 142 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, planStartDate: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.planStartDate = newValue; }); | manual |
| 142 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 142 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 143 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 152 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, planExpiresAt: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.planExpiresAt = newValue; }); | manual |
| 152 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 152 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 153 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 162 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, trialExpiresAt: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.trialExpiresAt = newValue; }); | manual |
| 162 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 162 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 163 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 172 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, token: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.token = newValue; }); | manual |

*... 还有 52 个问题*

#### src/flows/search/search-engine.flow.ts

**问题数**: 88

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 11 | 1 | error | `check-file/filename-naming-convention` | The filename "search-engine.flow.ts" does not match the "+(.+).flow.ts" pattern | manual |
| 19 | 10 | error | `@typescript-eslint/no-unused-vars` | 'info' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 19 | 16 | error | `@typescript-eslint/no-unused-vars` | 'debug' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 19 | 23 | error | `@typescript-eslint/no-unused-vars` | 'warn' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 19 | 29 | error | `@typescript-eslint/no-unused-vars` | 'error' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 50 | 23 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 57 | 19 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 73 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 74 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 74 | 23 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 75 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 75 | 24 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 76 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 76 | 26 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 77 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 83 | 7 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 84 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, isIndexing: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.isIndexing = newValue; }); | manual |
| 84 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 84 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 86 | 3 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 89 | 17 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 99 | 4 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 99 | 4 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 101 | 5 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 101 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 106 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 109 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, nodeIndex: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.nodeIndex = newValue; }); | manual |
| 109 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 109 | 4 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 110 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 111 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 112 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 113 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 114 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 115 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 121 | 6 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 131 | 4 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 131 | 4 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 133 | 5 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 133 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 137 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 140 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, isIndexing: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.isIndexing = newValue; }); | manual |
| 140 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 140 | 4 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 147 | 45 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 150 | 13 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 161 | 5 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 161 | 5 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 172 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 185 | 13 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |

*... 还有 38 个问题*

#### src/flows/export/export-project.flow.ts

**问题数**: 87

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 9 | 1 | error | `check-file/filename-naming-convention` | The filename "export-project.flow.ts" does not match the "+(.+).flow.ts" pattern | manual |
| 49 | 2 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 52 | 4 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 93 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 94 | 14 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 96 | 4 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 96 | 12 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 96 | 33 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 96 | 48 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 97 | 17 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 97 | 25 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 97 | 46 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 97 | 61 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 102 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 102 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 109 | 19 | error | `grain/no-mutation` | ❌ 禁止使用 array.sort()！请使用 [...array].sort() 或 fp-ts/Array 的 sort 函数。

✅ 正确做法：
  const sorted = [...array].sort();
  const customSort = [...array].sort((a, b) => a.name.localeCompare(b.name));
  // 或使用 fp-ts
  import * as A from "fp-ts/Array";
  const sorted = A.sort(Ord.contramap((item: Item) => item.name)(Ord.ordString))(array); | manual |
| 109 | 19 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 114 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 114 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 125 | 9 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 126 | 13 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 127 | 14 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 207 | 16 | error | `grain/no-try-catch` | ❌ 禁止使用 throw 语句！请返回 TaskEither.left() 表示错误。

✅ 正确做法：
  return TE.left({ type: "VALIDATION_ERROR", message: "Invalid input" }); | manual |
| 216 | 18 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 221 | 2 | error | `grain/no-mutation` | ❌ 禁止使用 array.sort()！请使用 [...array].sort() 或 fp-ts/Array 的 sort 函数。

✅ 正确做法：
  const sorted = [...array].sort();
  const customSort = [...array].sort((a, b) => a.name.localeCompare(b.name));
  // 或使用 fp-ts
  import * as A from "fp-ts/Array";
  const sorted = A.sort(Ord.contramap((item: Item) => item.name)(Ord.ordString))(array); | manual |
| 221 | 2 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 240 | 15 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 243 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 243 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 244 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 244 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 248 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 248 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 249 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 249 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 253 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 253 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 254 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 254 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 262 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 262 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 263 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 263 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 264 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 264 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 266 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 266 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 267 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 267 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 273 | 6 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |

*... 还有 37 个问题*

#### src/pipes/import/import.markdown.fn.ts

**问题数**: 73

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 13 | 1 | error | `check-file/filename-naming-convention` | The filename "import.markdown.fn.ts" does not match the "+(.+).pipe.ts" pattern | manual |
| 58 | 11 | error | `grain/no-side-effects-in-pipes` | ❌ 禁止在 pipes/ 中访问全局对象 document！纯函数不能有副作用。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 建议：
  - 将副作用操作移动到 io/ 层
  - 通过参数传递所需的数据
  - 返回数据而不是直接执行副作用

📚 更多信息: 查看函数式编程指南 | manual |
| 98 | 4 | error | `functional/prefer-readonly-type` | Only readonly tuples allowed. | auto-fixable |
| 113 | 2 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 117 | 21 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 124 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 124 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 130 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, currentKey: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.currentKey = newValue; }); | manual |
| 130 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 146 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, key: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.key = newValue; }); | manual |
| 146 | 6 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 153 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, currentKey: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.currentKey = newValue; }); | manual |
| 153 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 157 | 4 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 176 | 4 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 177 | 15 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 206 | 18 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 207 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 208 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 209 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 216 | 4 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 216 | 4 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 226 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastIndex: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastIndex = newValue; }); | manual |
| 226 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 241 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, format: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.format = newValue; }); | manual |
| 241 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 242 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 242 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 252 | 2 | error | `grain/no-mutation` | ❌ 禁止使用 array.sort()！请使用 [...array].sort() 或 fp-ts/Array 的 sort 函数。

✅ 正确做法：
  const sorted = [...array].sort();
  const customSort = [...array].sort((a, b) => a.name.localeCompare(b.name));
  // 或使用 fp-ts
  import * as A from "fp-ts/Array";
  const sorted = A.sort(Ord.contramap((item: Item) => item.name)(Ord.ordString))(array); | manual |
| 252 | 2 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 261 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 261 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 264 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 264 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 272 | 4 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 272 | 4 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 278 | 3 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 278 | 3 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 317 | 4 | error | `functional/prefer-readonly-type` | Only readonly tuples allowed. | auto-fixable |
| 372 | 18 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 380 | 4 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 380 | 4 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 388 | 4 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 388 | 4 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 397 | 17 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 397 | 25 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 397 | 39 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 405 | 5 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 405 | 5 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 418 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, checked: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.checked = newValue; }); | manual |

*... 还有 23 个问题*

#### src/types/tag/tag.builder.ts

**问题数**: 73

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 11 | 1 | error | `check-file/filename-naming-convention` | The filename "tag.builder.ts" does not match the "+(.+).@(interface\|schema\|types).ts" pattern | manual |
| 19 | 19 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 33 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 38 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 38 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 51 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, id: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.id = newValue; }); | manual |
| 51 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 51 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 52 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 61 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, name: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.name = newValue; }); | manual |
| 61 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 61 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 63 | 8 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 64 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, id: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.id = newValue; }); | manual |
| 64 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 64 | 4 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 66 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 75 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, workspace: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.workspace = newValue; }); | manual |
| 75 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 75 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 76 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 85 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, count: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.count = newValue; }); | manual |
| 85 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 85 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 86 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 95 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastUsed: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastUsed = newValue; }); | manual |
| 95 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 95 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 96 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 105 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, createDate: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.createDate = newValue; }); | manual |
| 105 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 105 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 106 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 115 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 115 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 115 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 116 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 125 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, count: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.count = newValue; }); | manual |
| 125 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 125 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 125 | 22 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 126 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastUsed: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastUsed = newValue; }); | manual |
| 126 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 126 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 127 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 136 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, count: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.count = newValue; }); | manual |
| 136 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 136 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 136 | 34 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 137 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |

*... 还有 23 个问题*

#### src/flows/log/async-log.flow.ts

**问题数**: 68

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 9 | 1 | error | `check-file/filename-naming-convention` | The filename "async-log.flow.ts" does not match the "+(.+).flow.ts" pattern | manual |
| 35 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 36 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 37 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 38 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 39 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 46 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 47 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 48 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 49 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 50 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 58 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 60 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 62 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 64 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 64 | 23 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 74 | 15 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 83 | 20 | error | `grain/no-date-constructor` | ❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。

✅ 正确做法：
  import dayjs from "dayjs";
  const timestamp = dayjs().valueOf();
  const unixTimestamp = dayjs().unix(); | manual |
| 90 | 21 | error | `no-undef` | 'NodeJS' is not defined. | manual |
| 144 | 15 | error | `grain/no-date-constructor` | ❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。

✅ 正确做法：
  import dayjs from "dayjs";
  const timestamp = dayjs().valueOf();
  const unixTimestamp = dayjs().unix(); | manual |
| 145 | 21 | error | `grain/no-date-constructor` | ❌ 禁止使用 new Date()！请使用 dayjs 进行时间处理。

✅ 正确做法：
  import dayjs from "dayjs";
  const now = dayjs();
  const specificDate = dayjs("2023-01-01");
  const timestamp = dayjs().valueOf();

📚 dayjs 文档: https://day.js.org/docs/en/installation/installation | manual |
| 166 | 37 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |
| 172 | 29 | error | `grain/no-mutation` | ❌ 禁止使用 array.sort()！请使用 [...array].sort() 或 fp-ts/Array 的 sort 函数。

✅ 正确做法：
  const sorted = [...array].sort();
  const customSort = [...array].sort((a, b) => a.name.localeCompare(b.name));
  // 或使用 fp-ts
  import * as A from "fp-ts/Array";
  const sorted = A.sort(Ord.contramap((item: Item) => item.name)(Ord.ordString))(array); | manual |
| 172 | 29 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 179 | 34 | error | `grain/no-date-constructor` | ❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。

✅ 正确做法：
  import dayjs from "dayjs";
  const timestamp = dayjs().valueOf();
  const unixTimestamp = dayjs().unix(); | manual |
| 182 | 20 | error | `grain/no-date-constructor` | ❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。

✅ 正确做法：
  import dayjs from "dayjs";
  const timestamp = dayjs().valueOf();
  const unixTimestamp = dayjs().unix(); | manual |
| 187 | 7 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 187 | 7 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 190 | 7 | error | `grain/no-mutation` | ❌ 禁止使用 array.sort()！请使用 [...array].sort() 或 fp-ts/Array 的 sort 函数。

✅ 正确做法：
  const sorted = [...array].sort();
  const customSort = [...array].sort((a, b) => a.name.localeCompare(b.name));
  // 或使用 fp-ts
  import * as A from "fp-ts/Array";
  const sorted = A.sort(Ord.contramap((item: Item) => item.name)(Ord.ordString))(array); | manual |
| 190 | 7 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 198 | 9 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 198 | 9 | error | `no-undef` | 'console' is not defined. | manual |
| 219 | 20 | error | `no-undef` | 'setInterval' is not defined. | manual |
| 229 | 5 | error | `no-undef` | 'clearInterval' is not defined. | manual |
| 246 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, isProcessing: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.isProcessing = newValue; }); | manual |
| 246 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 247 | 23 | error | `grain/no-date-constructor` | ❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。

✅ 正确做法：
  import dayjs from "dayjs";
  const timestamp = dayjs().valueOf();
  const unixTimestamp = dayjs().unix(); | manual |
| 249 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 252 | 21 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 274 | 9 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 275 | 9 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 278 | 9 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 282 | 27 | error | `grain/no-date-constructor` | ❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。

✅ 正确做法：
  import dayjs from "dayjs";
  const timestamp = dayjs().valueOf();
  const unixTimestamp = dayjs().unix(); | manual |
| 283 | 7 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, averageProcessTime: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.averageProcessTime = newValue; }); | manual |
| 283 | 7 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 285 | 7 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastProcessTime: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastProcessTime = newValue; }); | manual |
| 285 | 7 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 285 | 40 | error | `grain/no-date-constructor` | ❌ 禁止使用 Date.now()！请使用 dayjs 获取时间戳。

✅ 正确做法：
  import dayjs from "dayjs";
  const timestamp = dayjs().valueOf();
  const unixTimestamp = dayjs().unix(); | manual |
| 287 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 288 | 7 | error | `grain/no-console-log` | ❌ 禁止使用 console.warn！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.warn("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |

*... 还有 18 个问题*

#### src/types/node/node.builder.ts

**问题数**: 67

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 11 | 1 | error | `check-file/filename-naming-convention` | The filename "node.builder.ts" does not match the "+(.+).@(interface\|schema\|types).ts" pattern | manual |
| 20 | 20 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 34 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 39 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 39 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 57 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, workspace: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.workspace = newValue; }); | manual |
| 57 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 57 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 58 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 67 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, parent: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.parent = newValue; }); | manual |
| 67 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 67 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 68 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 77 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, type: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.type = newValue; }); | manual |
| 77 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 77 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 78 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 87 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, title: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.title = newValue; }); | manual |
| 87 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 87 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 88 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 97 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, order: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.order = newValue; }); | manual |
| 97 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 97 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 98 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 107 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, collapsed: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.collapsed = newValue; }); | manual |
| 107 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 107 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 108 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 117 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, id: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.id = newValue; }); | manual |
| 117 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 117 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 118 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 127 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, createDate: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.createDate = newValue; }); | manual |
| 127 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 127 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 128 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 137 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastEdit: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastEdit = newValue; }); | manual |
| 137 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 137 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 138 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 146 | 13 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 147 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, tags: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.tags = newValue; }); | manual |
| 147 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 147 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 148 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 157 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 157 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 157 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 158 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |

*... 还有 17 个问题*

#### src/types/workspace/workspace.builder.ts

**问题数**: 67

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 11 | 1 | error | `check-file/filename-naming-convention` | The filename "workspace.builder.ts" does not match the "+(.+).@(interface\|schema\|types).ts" pattern | manual |
| 20 | 25 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 34 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 39 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 39 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 57 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, id: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.id = newValue; }); | manual |
| 57 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 57 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 58 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 67 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, title: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.title = newValue; }); | manual |
| 67 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 67 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 68 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 77 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, author: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.author = newValue; }); | manual |
| 77 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 77 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 78 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 87 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, description: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.description = newValue; }); | manual |
| 87 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 87 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 88 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 97 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, publisher: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.publisher = newValue; }); | manual |
| 97 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 97 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 98 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 107 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, language: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.language = newValue; }); | manual |
| 107 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 107 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 108 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 117 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastOpen: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastOpen = newValue; }); | manual |
| 117 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 117 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 118 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 127 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, createDate: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.createDate = newValue; }); | manual |
| 127 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 127 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 128 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 136 | 19 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 137 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, members: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.members = newValue; }); | manual |
| 137 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 137 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 138 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 147 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, owner: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.owner = newValue; }); | manual |
| 147 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 147 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 148 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 157 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 157 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 157 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 158 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |

*... 还有 17 个问题*

#### src/views/panels/tag-graph-panel/tag-graph-panel.view.fn.tsx

**问题数**: 65

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 12 | 1 | error | `check-file/filename-naming-convention` | The filename "tag-graph-panel.view.fn.tsx" does not match the "+(.+).@(view\|container).fn.tsx" pattern | manual |
| 14 | 1 | error | `grain/layer-dependencies` | ❌ 视图组件架构违规！普通视图组件不能直接依赖 views 层。

🏗️ 组件分离原则：
  - 视图组件(.view.fn.tsx)：只能依赖 hooks/ 和 types/
  - 容器组件(.container.fn.tsx)：可以依赖更多层级

✅ 建议：
  - 将此组件改为容器组件(.container.fn.tsx)
  - 或通过 hooks 间接访问数据
  - 或将逻辑移动到容器组件中 | manual |
| 18 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 19 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 20 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 21 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 22 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 23 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 24 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 25 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 29 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 30 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 31 | 2 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 51 | 38 | warning | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 52 | 38 | warning | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 77 | 20 | warning | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 92 | 20 | warning | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 120 | 7 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 121 | 7 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 122 | 7 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 123 | 7 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 141 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 142 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 143 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 144 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 151 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 152 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 153 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 154 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 165 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 165 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 165 | 28 | error | `no-undef` | 'requestAnimationFrame' is not defined. | manual |
| 168 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 168 | 4 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 168 | 27 | error | `no-undef` | 'requestAnimationFrame' is not defined. | manual |
| 172 | 6 | error | `no-undef` | 'cancelAnimationFrame' is not defined. | manual |
| 193 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, strokeStyle: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.strokeStyle = newValue; }); | manual |
| 193 | 4 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 194 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lineWidth: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lineWidth = newValue; }); | manual |
| 194 | 4 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 211 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, fillStyle: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.fillStyle = newValue; }); | manual |
| 211 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 213 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, strokeStyle: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.strokeStyle = newValue; }); | manual |
| 213 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 214 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lineWidth: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lineWidth = newValue; }); | manual |
| 214 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 218 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, fillStyle: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.fillStyle = newValue; }); | manual |
| 218 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 219 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, font: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.font = newValue; }); | manual |
| 219 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |

*... 还有 15 个问题*

#### src/flows/migration/dexie-to-sqlite.migration.fn.ts

**问题数**: 62

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 23 | 1 | error | `check-file/filename-naming-convention` | The filename "dexie-to-sqlite.migration.fn.ts" does not match the "+(.+).flow.ts" pattern | manual |
| 32 | 16 | error | `@typescript-eslint/no-unused-vars` | 'debug' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 32 | 29 | error | `@typescript-eslint/no-unused-vars` | 'error' is defined but never used. Allowed unused vars must match /^_/u. | manual |
| 58 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 58 | 14 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 59 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 59 | 9 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 60 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 60 | 9 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 67 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 68 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 69 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 70 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 71 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 72 | 3 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 74 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 74 | 10 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 75 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 76 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 77 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 84 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 84 | 14 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 85 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 85 | 9 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 86 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 86 | 12 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 87 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 87 | 9 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 100 | 2 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 101 | 18 | error | `no-undef` | 'localStorage' is not defined. | manual |
| 106 | 4 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 115 | 2 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 116 | 3 | error | `no-undef` | 'localStorage' is not defined. | manual |
| 117 | 4 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 126 | 2 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 127 | 3 | error | `no-undef` | 'localStorage' is not defined. | manual |
| 128 | 4 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 233 | 9 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 234 | 30 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 234 | 45 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 234 | 54 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 251 | 6 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 266 | 14 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 267 | 15 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 268 | 30 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 268 | 45 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 268 | 54 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |
| 290 | 6 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 308 | 9 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 309 | 20 | error | `functional/prefer-readonly-type` | Only readonly types allowed. | auto-fixable |

*... 还有 12 个问题*

#### src/views/panels/file-tree-panel/file-tree-panel.container.fn.tsx

**问题数**: 58

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 10 | 1 | error | `check-file/filename-naming-convention` | The filename "file-tree-panel.container.fn.tsx" does not match the "+(.+).@(view\|container).fn.tsx" pattern | manual |
| 26 | 1 | error | `grain/layer-dependencies` | ❌ 架构层级违规！container component 层不能依赖 pipes 层。

🏗️ 架构规则：
  container component 只能依赖：hooks, flows, state, types

✅ 建议：
  - 将此功能移动到合适的层级
  - 或通过允许的层级间接访问

📚 架构文档: 查看项目架构设计文档了解层级职责 | manual |
| 34 | 1 | error | `grain/layer-dependencies` | ❌ 架构层级违规！container component 层不能依赖 utils 层。

🏗️ 架构规则：
  container component 只能依赖：hooks, flows, state, types

✅ 建议：
  - 将此功能移动到合适的层级
  - 或通过允许的层级间接访问

📚 架构文档: 查看项目架构设计文档了解层级职责 | manual |
| 35 | 1 | error | `grain/layer-dependencies` | ❌ 架构层级违规！container component 层不能依赖 views 层。

🏗️ 架构规则：
  container component 只能依赖：hooks, flows, state, types

✅ 建议：
  - 将此功能移动到合适的层级
  - 或通过允许的层级间接访问

📚 架构文档: 查看项目架构设计文档了解层级职责 | manual |
| 36 | 1 | error | `grain/layer-dependencies` | ❌ 架构层级违规！container component 层不能依赖 views 层。

🏗️ 架构规则：
  container component 只能依赖：hooks, flows, state, types

✅ 建议：
  - 将此功能移动到合适的层级
  - 或通过允许的层级间接访问

📚 架构文档: 查看项目架构设计文档了解层级职责 | manual |
| 62 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 65 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 98 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 98 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 146 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 170 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 171 | 6 | error | `grain/no-console-log` | ❌ 禁止使用 console.error！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.error("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 171 | 6 | error | `no-undef` | 'console' is not defined. | manual |
| 187 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 204 | 6 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 204 | 6 | error | `no-undef` | 'console' is not defined. | manual |
| 221 | 6 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 221 | 6 | error | `no-undef` | 'console' is not defined. | manual |
| 243 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 244 | 6 | error | `grain/no-console-log` | ❌ 禁止使用 console.error！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.error("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 244 | 6 | error | `no-undef` | 'console' is not defined. | manual |
| 279 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 283 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 throw 语句！请返回 TaskEither.left() 表示错误。

✅ 正确做法：
  return TE.left({ type: "VALIDATION_ERROR", message: "Invalid input" }); | manual |
| 295 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 296 | 6 | error | `grain/no-console-log` | ❌ 禁止使用 console.error！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.error("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 296 | 6 | error | `no-undef` | 'console' is not defined. | manual |
| 308 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 315 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 throw 语句！请返回 TaskEither.left() 表示错误。

✅ 正确做法：
  return TE.left({ type: "VALIDATION_ERROR", message: "Invalid input" }); | manual |
| 317 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 318 | 6 | error | `grain/no-console-log` | ❌ 禁止使用 console.error！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.error("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 318 | 6 | error | `no-undef` | 'console' is not defined. | manual |
| 328 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 336 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 throw 语句！请返回 TaskEither.left() 表示错误。

✅ 正确做法：
  return TE.left({ type: "VALIDATION_ERROR", message: "Invalid input" }); | manual |
| 338 | 7 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 339 | 6 | error | `grain/no-console-log` | ❌ 禁止使用 console.error！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.error("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 339 | 6 | error | `no-undef` | 'console' is not defined. | manual |
| 359 | 4 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 375 | 6 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 376 | 5 | error | `grain/no-console-log` | ❌ 禁止使用 console.error！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.error("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 376 | 5 | error | `no-undef` | 'console' is not defined. | manual |
| 387 | 23 | error | `no-undef` | 'performance' is not defined. | manual |
| 388 | 5 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 388 | 5 | error | `no-undef` | 'console' is not defined. | manual |
| 391 | 17 | error | `grain/no-date-constructor` | ❌ 禁止使用 new Date()！请使用 dayjs 进行时间处理。

✅ 正确做法：
  import dayjs from "dayjs";
  const now = dayjs();
  const specificDate = dayjs("2023-01-01");
  const timestamp = dayjs().valueOf();

📚 dayjs 文档: https://day.js.org/docs/en/installation/installation | manual |
| 394 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 398 | 22 | error | `no-undef` | 'performance' is not defined. | manual |
| 402 | 6 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 402 | 6 | error | `no-undef` | 'console' is not defined. | manual |
| 406 | 18 | error | `grain/no-date-constructor` | ❌ 禁止使用 new Date()！请使用 dayjs 进行时间处理。

✅ 正确做法：
  import dayjs from "dayjs";
  const now = dayjs();
  const specificDate = dayjs("2023-01-01");
  const timestamp = dayjs().valueOf();

📚 dayjs 文档: https://day.js.org/docs/en/installation/installation | manual |
| 412 | 7 | error | `grain/no-console-log` | ❌ 禁止使用 console.warn！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.warn("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |

*... 还有 8 个问题*

#### src/state/font.state.ts

**问题数**: 56

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 9 | 1 | error | `check-file/filename-naming-convention` | The filename "font.state.ts" does not match the "+(.+).state.ts" pattern | manual |
| 52 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, fontFamily: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.fontFamily = newValue; }); | manual |
| 52 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 58 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, fontSize: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.fontSize = newValue; }); | manual |
| 58 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 68 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lineHeight: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lineHeight = newValue; }); | manual |
| 68 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 78 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, letterSpacing: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.letterSpacing = newValue; }); | manual |
| 78 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 88 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, uiFontFamily: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.uiFontFamily = newValue; }); | manual |
| 88 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 94 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, uiFontSize: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.uiFontSize = newValue; }); | manual |
| 94 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 104 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, uiScale: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.uiScale = newValue; }); | manual |
| 104 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 110 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, cardSize: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.cardSize = newValue; }); | manual |
| 110 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 116 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, cardBorderRadius: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.cardBorderRadius = newValue; }); | manual |
| 116 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 126 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, paragraphSpacing: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.paragraphSpacing = newValue; }); | manual |
| 126 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 136 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, firstLineIndent: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.firstLineIndent = newValue; }); | manual |
| 136 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 146 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, fontFamily: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.fontFamily = newValue; }); | manual |
| 146 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 147 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, fontSize: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.fontSize = newValue; }); | manual |
| 147 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 148 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lineHeight: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lineHeight = newValue; }); | manual |
| 148 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 149 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, letterSpacing: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.letterSpacing = newValue; }); | manual |
| 149 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 150 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, uiFontFamily: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.uiFontFamily = newValue; }); | manual |
| 150 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 151 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, uiFontSize: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.uiFontSize = newValue; }); | manual |
| 151 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 152 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, uiScale: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.uiScale = newValue; }); | manual |
| 152 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 153 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, cardSize: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.cardSize = newValue; }); | manual |
| 153 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 154 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, cardBorderRadius: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.cardBorderRadius = newValue; }); | manual |
| 154 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 155 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, paragraphSpacing: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.paragraphSpacing = newValue; }); | manual |
| 155 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 156 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, firstLineIndent: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.firstLineIndent = newValue; }); | manual |
| 156 | 6 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 173 | 44 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |
| 180 | 42 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |
| 187 | 44 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |
| 194 | 47 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |
| 201 | 46 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |

*... 还有 6 个问题*

#### src/utils/keyboard.util.ts

**问题数**: 55

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 12 | 1 | error | `check-file/filename-naming-convention` | The filename "keyboard.util.ts" does not match the "+(.+).util.ts" pattern | manual |
| 13 | 2 | error | `functional/prefer-property-signatures` | Use a property signature instead of a method signature | manual |
| 14 | 2 | error | `functional/prefer-property-signatures` | Use a property signature instead of a method signature | manual |
| 18 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 19 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 20 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 21 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 22 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 29 | 66 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |
| 34 | 15 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 36 | 21 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 36 | 21 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 37 | 21 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 37 | 21 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 38 | 22 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 38 | 22 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 39 | 20 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 39 | 20 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 41 | 2 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |
| 41 | 2 | error | `functional/immutable-data` | Modifying an array is not allowed. | manual |
| 46 | 68 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |
| 59 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 60 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 63 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, handleKeyDown: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.handleKeyDown = newValue; }); | manual |
| 63 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 63 | 24 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 63 | 48 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 67 | 3 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 67 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 69 | 8 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 70 | 4 | error | `no-undef` | 'window' is not defined. | manual |
| 70 | 39 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 71 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, isListening: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.isListening = newValue; }); | manual |
| 71 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 71 | 4 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 76 | 3 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 76 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 78 | 7 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 78 | 36 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 79 | 4 | error | `no-undef` | 'window' is not defined. | manual |
| 79 | 42 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 80 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, isListening: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.isListening = newValue; }); | manual |
| 80 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 80 | 4 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 94 | 19 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 103 | 7 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 104 | 4 | error | `no-undef` | 'window' is not defined. | manual |
| 104 | 42 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 105 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, isListening: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.isListening = newValue; }); | manual |
| 105 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |

*... 还有 5 个问题*

#### src/flows/save/save-service-manager.flow.ts

**问题数**: 54

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 16 | 1 | error | `check-file/filename-naming-convention` | The filename "save-service-manager.flow.ts" does not match the "+(.+).flow.ts" pattern | manual |
| 52 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 54 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 56 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 58 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 60 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 62 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 64 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 68 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 70 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 72 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 74 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 76 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 100 | 36 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 130 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, pendingContent: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.pendingContent = newValue; }); | manual |
| 130 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 135 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, isSaving: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.isSaving = newValue; }); | manual |
| 135 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 139 | 3 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 147 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastSavedContent: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastSavedContent = newValue; }); | manual |
| 147 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 148 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, pendingContent: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.pendingContent = newValue; }); | manual |
| 148 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 159 | 5 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 164 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, isSaving: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.isSaving = newValue; }); | manual |
| 164 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 192 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, tabId: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.tabId = newValue; }); | manual |
| 192 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 193 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, setTabDirty: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.setTabDirty = newValue; }); | manual |
| 193 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 194 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, onSaving: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.onSaving = newValue; }); | manual |
| 194 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 195 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, onSaved: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.onSaved = newValue; }); | manual |
| 195 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 196 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, onError: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.onError = newValue; }); | manual |
| 196 | 5 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 200 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, debouncedSave: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.debouncedSave = newValue; }); | manual |
| 200 | 6 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 201 | 6 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, autoSaveDelay: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.autoSaveDelay = newValue; }); | manual |
| 201 | 6 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 221 | 4 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 228 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, pendingContent: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.pendingContent = newValue; }); | manual |
| 228 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 254 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, lastSavedContent: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.lastSavedContent = newValue; }); | manual |
| 254 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 275 | 5 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 283 | 4 | error | `functional/immutable-data` | Modifying a map is not allowed. | manual |
| 286 | 26 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 287 | 19 | error | `functional/prefer-readonly-type` | Only readonly arrays allowed. | auto-fixable |
| 293 | 6 | error | `grain/no-mutation` | ❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。

✅ 正确做法：
  const newArray = [...array, newItem];
  const multipleItems = [...array, item1, item2]; | manual |

*... 还有 4 个问题*

#### src/views/excalidraw-editor/excalidraw-editor.container.fn.tsx

**问题数**: 54

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 18 | 1 | error | `check-file/filename-naming-convention` | The filename "excalidraw-editor.container.fn.tsx" does not match the "+(.+).@(view\|container).fn.tsx" pattern | manual |
| 24 | 1 | error | `grain/layer-dependencies` | ❌ 架构层级违规！container component 层不能依赖 utils 层。

🏗️ 架构规则：
  container component 只能依赖：hooks, flows, state, types

✅ 建议：
  - 将此功能移动到合适的层级
  - 或通过允许的层级间接访问

📚 架构文档: 查看项目架构设计文档了解层级职责 | manual |
| 62 | 2 | error | `grain/no-try-catch` | ❌ 禁止使用 try-catch！请使用 TaskEither 进行函数式错误处理。

✅ 正确做法：
  import * as TE from "fp-ts/TaskEither";
  const result = TE.tryCatch(
    () => riskyOperation(),
    (error) => ({ type: "ERROR", message: String(error) })
  );

📚 更多信息: https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html | manual |
| 74 | 4 | error | `grain/no-try-catch` | ❌ 禁止使用 catch 子句！请使用 TaskEither.orElse() 处理错误。

✅ 正确做法：
  pipe(
    fetchData(),
    TE.orElse(() => fetchFromBackup())
  ) | manual |
| 75 | 3 | error | `grain/no-console-log` | ❌ 禁止使用 console.error！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.error("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 75 | 3 | error | `no-undef` | 'console' is not defined. | manual |
| 117 | 4 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 118 | 4 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 119 | 4 | warning | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 142 | 5 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 142 | 5 | error | `no-undef` | 'console' is not defined. | manual |
| 145 | 5 | error | `grain/no-console-log` | ❌ 禁止使用 console.error！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.error("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 145 | 5 | error | `no-undef` | 'console' is not defined. | manual |
| 166 | 5 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 166 | 5 | error | `no-undef` | 'console' is not defined. | manual |
| 170 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 170 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 171 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 171 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 177 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 177 | 4 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 182 | 5 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 182 | 5 | error | `no-undef` | 'console' is not defined. | manual |
| 185 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 185 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 193 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 193 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 200 | 5 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 200 | 5 | error | `no-undef` | 'console' is not defined. | manual |
| 216 | 23 | error | `no-undef` | 'NodeJS' is not defined. | manual |
| 236 | 8 | error | `no-undef` | 'clearTimeout' is not defined. | manual |
| 239 | 23 | error | `no-undef` | 'setTimeout' is not defined. | manual |
| 241 | 8 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 241 | 8 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 242 | 8 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 242 | 8 | error | `no-undef` | 'console' is not defined. | manual |
| 248 | 27 | error | `no-undef` | 'setTimeout' is not defined. | manual |
| 258 | 5 | error | `no-undef` | 'clearTimeout' is not defined. | manual |
| 260 | 6 | error | `no-undef` | 'clearTimeout' is not defined. | manual |
| 277 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 277 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 289 | 19 | error | `arrow-body-style` | Unexpected block statement surrounding arrow body; move the returned value immediately after the `=>`. | auto-fixable |
| 291 | 5 | error | `grain/no-console-log` | ❌ 禁止使用 console.log！请使用 logger 进行日志记录。

✅ 正确做法：
  import logger from "@/io/log/logger";
  logger.info("[ModuleName] 操作描述", data);

📋 日志格式规范：
  - info: 一般信息记录
  - warn: 警告信息
  - error: 错误信息
  - debug: 调试信息

🔗 更多信息: 查看项目中的日志规范文档 | manual |
| 291 | 5 | error | `no-undef` | 'console' is not defined. | manual |
| 294 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 294 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 295 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 295 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 296 | 5 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, current: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.current = newValue; }); | manual |
| 296 | 5 | warning | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |

*... 还有 4 个问题*

#### src/types/attachment/attachment.builder.ts

**问题数**: 51

| 行 | 列 | 严重性 | 规则 | 消息 | 可修复 |
|----|-----|--------|------|------|--------|
| 11 | 1 | error | `check-file/filename-naming-convention` | The filename "attachment.builder.ts" does not match the "+(.+).@(interface\|schema\|types).ts" pattern | manual |
| 23 | 26 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 37 | 2 | error | `functional/prefer-readonly-type` | A readonly modifier is required. | auto-fixable |
| 42 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 42 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 57 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, id: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.id = newValue; }); | manual |
| 57 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 57 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 58 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 67 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, project: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.project = newValue; }); | manual |
| 67 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 67 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 68 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 77 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, type: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.type = newValue; }); | manual |
| 77 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 77 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 78 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 87 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, fileName: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.fileName = newValue; }); | manual |
| 87 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 87 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 88 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 97 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, filePath: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.filePath = newValue; }); | manual |
| 97 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 97 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 98 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 107 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, uploadedAt: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.uploadedAt = newValue; }); | manual |
| 107 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 107 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 108 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 117 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, size: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.size = newValue; }); | manual |
| 117 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 117 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 118 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 127 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, mimeType: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.mimeType = newValue; }); | manual |
| 127 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 127 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 128 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 137 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 137 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 137 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 138 | 10 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 148 | 8 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 149 | 4 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, uploadedAt: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.uploadedAt = newValue; }); | manual |
| 149 | 4 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 149 | 4 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 153 | 41 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 163 | 29 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |
| 173 | 3 | error | `grain/no-mutation` | ❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。

✅ 正确做法：
  const updated = { ...obj, data: newValue };
  const nested = { ...obj, nested: { ...obj.nested, prop: value } };
  // 或使用 Immer
  import { produce } from "immer";
  const updated = produce(obj, draft => { draft.data = newValue; }); | manual |
| 173 | 3 | error | `functional/immutable-data` | Modifying an existing object/array is not allowed. | manual |
| 173 | 3 | error | `functional/no-this-expressions` | Unexpected this, use functions not classes. | manual |

*... 还有 1 个问题*

