# Implementation Tasks

## Task 1: 修复 activity-bar.container.fn.tsx 代码规范问题

**Priority**: High  
**Status**: Done ✅

### Description
修复已迁移文件中的代码规范问题。

### Acceptance Criteria
- [x] 移除未使用的 `NodeInterface` import
- [x] 将 `console.error` 替换为 `logger.error`
- [x] 确保所有注释为中文
- [x] 使用 `@/actions/workspace` 而非 `@/db`
- [x] 使用 TaskEither 和 fp-ts pipe

### Files Modified
- `apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`
- `apps/desktop/src/actions/workspace/update-workspace.action.ts`
- `apps/desktop/src/actions/workspace/create-workspace.action.ts`

### Verification
- 代码诊断无错误
- workspace 操作已完全迁移到 Rust 后端

---

## Task 2: 迁移 file-tree-panel.container.fn.tsx

**Priority**: High  
**Status**: Pending

### Description
将 file-tree-panel 组件从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 将 `getNodeById` 从 `@/db` 迁移到 `@/repo`
- [ ] 将 `setNodeCollapsed` 从 `@/db` 迁移到 `@/repo`
- [ ] 使用 TaskEither 处理错误
- [ ] 添加中文注释

### Files to Modify
- `apps/desktop/src/components/panels/file-tree-panel/file-tree-panel.container.fn.tsx`

### Dependencies
- 需要在 `@/repo/node.repo.fn.ts` 中添加 `setNodeCollapsed` 函数

---

## Task 3: 迁移 wiki-hover-preview-connected.tsx

**Priority**: High  
**Status**: Pending

### Description
将 wiki-hover-preview 组件从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 将 `getContentByNodeId` 从 `@/db` 迁移到 `@/repo`
- [ ] 将 `getNodeById` 从 `@/db` 迁移到 `@/repo`
- [ ] 使用 TaskEither 处理错误

### Files to Modify
- `apps/desktop/src/components/blocks/wiki-hover-preview-connected.tsx`

---

## Task 4: 迁移 diagram-editor.container.fn.tsx

**Priority**: High  
**Status**: Pending

### Description
将 diagram-editor 组件从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 将 `getContentByNodeId` 从 `@/db` 迁移到 `@/repo`
- [ ] 使用 TaskEither 处理错误

### Files to Modify
- `apps/desktop/src/components/diagram-editor/diagram-editor.container.fn.tsx`

---

## Task 5: 迁移 code-editor.container.fn.tsx

**Priority**: High  
**Status**: Pending

### Description
将 code-editor 组件从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 将 `getContentByNodeId` 从 `@/db` 迁移到 `@/repo`
- [ ] 使用 TaskEither 处理错误

### Files to Modify
- `apps/desktop/src/components/code-editor/code-editor.container.fn.tsx`

---

## Task 6: 迁移 save.document.fn.ts

**Priority**: Medium  
**Status**: Pending

### Description
将文档保存功能从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 将 `updateContentByNodeId` 从 `@/db` 迁移到 `@/repo`
- [ ] 将 `updateNode` 从 `@/db` 迁移到 `@/repo`
- [ ] 使用 TaskEither 处理错误

### Files to Modify
- `apps/desktop/src/fn/save/save.document.fn.ts`
- `apps/desktop/src/fn/save/unified-save.service.ts`
- `apps/desktop/src/lib/save-service-manager.ts`

---

## Task 7: 迁移 search.engine.fn.ts

**Priority**: Medium  
**Status**: Pending

### Description
将搜索功能从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 将 `getNodesByWorkspace` 从 `@/db` 迁移到 `@/repo`
- [ ] 将 `getWorkspaceById` 从 `@/db` 迁移到 `@/repo`
- [ ] 使用 TaskEither 处理错误

### Files to Modify
- `apps/desktop/src/fn/search/search.engine.fn.ts`

---

## Task 8: 迁移 wiki.resolve.fn.ts

**Priority**: Medium  
**Status**: Pending

### Description
将 Wiki 解析功能从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 将 `getContentsByNodeIds` 从 `@/db` 迁移到 `@/repo`
- [ ] 将 `getNodesByWorkspace` 从 `@/db` 迁移到 `@/repo`
- [ ] 使用 TaskEither 处理错误

### Files to Modify
- `apps/desktop/src/fn/wiki/wiki.resolve.fn.ts`

---

## Task 9: 迁移 export actions

**Priority**: Low  
**Status**: Pending

### Description
将导出功能从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 迁移 `export-workspace-markdown.action.ts`
- [ ] 迁移 `export-json.action.ts`
- [ ] 迁移 `export-markdown.action.ts`
- [ ] 迁移 `export-all.action.ts`
- [ ] 迁移 `export-orgmode.action.ts`
- [ ] 迁移 `export-project.action.ts`

### Files to Modify
- `apps/desktop/src/actions/export/*.ts`

---

## Task 10: 迁移 import actions

**Priority**: Low  
**Status**: Pending

### Description
将导入功能从 Dexie 迁移到 Rust 后端。

### Acceptance Criteria
- [ ] 迁移 `import-json.action.ts`
- [ ] 迁移 `import-markdown.action.ts`

### Files to Modify
- `apps/desktop/src/actions/import/*.ts`

---

## Task 11: 添加 Repository 层缺失函数

**Priority**: High  
**Status**: Pending

### Description
在 Repository 层添加迁移所需的函数。

### Acceptance Criteria
- [ ] 添加 `setNodeCollapsed` 到 `node.repo.fn.ts`
- [ ] 添加 `getContentsByNodeIds` 到 `content.repo.fn.ts`
- [ ] 确保所有函数返回 TaskEither

### Files to Modify
- `apps/desktop/src/repo/node.repo.fn.ts`
- `apps/desktop/src/repo/content.repo.fn.ts`

---

## Summary

| Priority | Task Count | Status |
|----------|------------|--------|
| High | 6 | 1 Done, 5 Pending |
| Medium | 3 | Pending |
| Low | 2 | Pending |
| **Total** | **11** | **1 Done** |
