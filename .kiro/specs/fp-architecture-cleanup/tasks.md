# Implementation Plan

## Phase 1: 更新导入路径

- [x] 1. 更新 domain/diary 引用
  - [x] 1.1 更新 `actions/templated/configs/diary.config.ts`
    - 将 `@/domain/diary/diary.utils` 改为 `@/fn/date/`
    - _Requirements: 6.1_
  - [x] 1.2 更新 `actions/diary/create-diary.action.test.ts`
    - 将 `@/domain/diary/diary.utils` 改为 `@/fn/date/`
    - _Requirements: 6.1_

- [x] 2. 更新 domain/export 引用
  - [x] 2.1 更新 `components/blocks/export-dialog.tsx`
    - 将 `@/domain/export` 改为 `@/fn/export/` 或 `@/actions/export/`
    - _Requirements: 6.1_
  - [x] 2.2 更新 `components/export/export-button.tsx`
    - 将 `@/domain/export` 改为 `@/fn/export/` 或 `@/actions/export/`
    - _Requirements: 6.1_

- [x] 3. 验证导入更新
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1_

## Phase 2: 删除 services/ 目录

- [x] 4. 删除 services/ 目录
  - [x] 4.1 删除 `services/__tests__/` 目录
    - _Requirements: 2.1_
  - [x] 4.2 删除 `services/drawings.ts`
    - _Requirements: 2.1_
  - [x] 4.3 删除 `services/drawings.utils.ts`
    - _Requirements: 2.1_
  - [x] 4.4 删除 `services/export-path.ts`
    - _Requirements: 2.1_
  - [x] 4.5 删除 `services/export.ts`
    - _Requirements: 2.1_
  - [x] 4.6 删除 `services/import-export.ts`
    - _Requirements: 2.1_
  - [x] 4.7 删除 `services/index.ts`
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 4.8 删除 `services/nodes.ts`
    - _Requirements: 2.1_
  - [x] 4.9 删除 `services/tags.ts`
    - _Requirements: 2.1_
  - [x] 4.10 删除 `services/workspaces.ts`
    - _Requirements: 2.1_

- [x] 5. 验证 services 删除
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1_

## Phase 3: 删除 domain/ 目录

- [x] 6. 删除 domain/ 子目录
  - [x] 6.1 删除 `domain/diagram/`
    - _Requirements: 1.1_
  - [x] 6.2 删除 `domain/diary/`
    - _Requirements: 1.1, 1.3_
  - [x] 6.3 删除 `domain/editor-tabs/`
    - _Requirements: 1.1_
  - [x] 6.4 删除 `domain/export/`
    - _Requirements: 1.1, 1.4_
  - [x] 6.5 删除 `domain/file-creator/`
    - _Requirements: 1.1_
  - [x] 6.6 删除 `domain/font/`
    - _Requirements: 1.1_
  - [x] 6.7 删除 `domain/icon-theme/`
    - _Requirements: 1.1_
  - [x] 6.8 删除 `domain/import-export/`
    - _Requirements: 1.1_
  - [x] 6.9 删除 `domain/keyboard/`
    - _Requirements: 1.1_
  - [x] 6.10 删除 `domain/save/`
    - _Requirements: 1.1_
  - [x] 6.11 删除 `domain/search/`
    - _Requirements: 1.1, 1.5_
  - [x] 6.12 删除 `domain/selection/`
    - _Requirements: 1.1_
  - [x] 6.13 删除 `domain/sidebar/`
    - _Requirements: 1.1_
  - [x] 6.14 删除 `domain/theme/`
    - _Requirements: 1.1_
  - [x] 6.15 删除 `domain/ui/`
    - _Requirements: 1.1_
  - [x] 6.16 删除 `domain/updater/`
    - _Requirements: 1.1_
  - [x] 6.17 删除 `domain/wiki/`
    - _Requirements: 1.1_
  - [x] 6.18 删除 `domain/writing/`
    - _Requirements: 1.1_

- [x] 7. 验证 domain 删除
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1_

## Phase 4: 删除 db/ 子目录

- [x] 8. 删除 db/ 旧服务目录
  - [x] 8.1 删除 `db/backup/` 目录
    - 包含 `backup.service.ts` 和 `index.ts`
    - _Requirements: 3.1_
  - [x] 8.2 删除 `db/clear-data/` 目录
    - 包含 `clear-data.service.ts` 和 `index.ts`
    - _Requirements: 3.2_
  - [x] 8.3 删除 `db/init/` 目录
    - 包含 `db-init.service.ts` 和 `index.ts`
    - _Requirements: 3.3_

- [x] 9. 验证 db 子目录删除
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1_

## Phase 5: 删除未使用组件

- [x] 10. 删除 blocks/ 未使用组件
  - [x] 10.1 删除 `components/blocks/emptyProject.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 10.2 删除 `components/blocks/createBookDialog.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 10.3 删除 `components/blocks/focus-mode.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 10.4 删除 `components/blocks/writing-stats-panel.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 10.5 删除 `components/blocks/auto-save-indicator.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 10.6 删除 `components/blocks/multi-select.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_

- [x] 11. 删除 drawing/ 未使用组件
  - [x] 11.1 删除 `components/drawing/drawing-manager.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 11.2 删除 `components/drawing/drawing-list.tsx`
    - 仅被 drawing-manager.tsx 引用，一起删除
    - _Requirements: 4.1_

- [x] 12. 删除 workspace/ 未使用组件
  - [x] 12.1 删除 `components/workspace/multi-editor-workspace.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_

- [x] 13. 验证组件删除
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1, 4.2_

## Phase 6: 删除测试路由

- [x] 14. 删除测试路由文件
  - [x] 14.1 删除 `routes/test-clear-data.tsx`
    - _Requirements: 5.1_
  - [x] 14.2 删除 `routes/test-focus.tsx`
    - _Requirements: 5.1_
  - [x] 14.3 删除 `routes/test-manual-save.tsx`
    - _Requirements: 5.1_
  - [x] 14.4 删除 `routes/test-selection.tsx`
    - _Requirements: 5.1_

- [x] 15. 删除测试组件
  - [x] 15.1 删除 `components/test-selection.tsx`
    - 仅被 test-selection.tsx 路由使用
    - _Requirements: 4.1_

- [x] 16. 验证测试路由删除
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1, 5.2_

## Phase 7: 删除空目录和清理

- [x] 17. 删除空目录
  - [x] 17.1 删除 `components/debug/` 目录（如果为空）
    - _Requirements: 4.1_
  - [x] 17.2 删除 `utils/` 目录（如果为空）
    - _Requirements: 4.1_

- [x] 18. 清理 actions/diary/ 目录
  - [x] 18.1 审查 `actions/diary/` 是否可以删除
    - 如果功能已完全迁移到 `actions/templated/`
    - _Requirements: 4.1_

## Phase 8: 最终验证

- [x] 19. 运行完整验证
  - [x] 19.1 运行类型检查
    - 执行 `bunx tsc --noEmit`
    - 确认无类型错误
    - _Requirements: 7.1_
  - [x] 19.2 运行测试
    - 执行 `bunx vitest run`
    - 确认测试通过
    - _Requirements: 7.2_
  - [x] 19.3 运行开发服务器
    - 执行 `bun run desktop:dev`
    - 确认应用正常启动
    - _Requirements: 7.3_
  - [x] 19.4 验证目录结构
    - 对比 `structure.md` 中定义的结构
    - 确认符合规范
    - _Requirements: 7.4_

- [x] 20. 提交清理结果
  - 执行 `git add -A && git commit -m "chore: 清理旧架构文件"`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

## Phase 9: 删除更多未使用组件

**说明：** 根据 fp-architecture-refactor 任务 50 的审查，以下组件未被任何文件引用，应该删除。

- [x] 21. 删除根级未使用组件
  - [x] 21.1 删除 `components/activity-bar.tsx`
    - 旧版 ActivityBar，已被 `components/activity-bar/` 目录替代
    - _Requirements: 4.1_
  - [x] 21.2 删除 `components/settings-nav.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 21.3 删除 `components/icon-picker.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 21.4 删除 `components/search-sidebar.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 21.5 删除 `components/icon-theme-preview.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 21.6 删除 `components/dev-only.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_

- [x] 22. 删除全局搜索相关未使用组件
  - [x] 22.1 删除 `components/global-search-provider.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 22.2 删除 `components/global-search-dialog-connected.tsx`
    - 仅被 global-search-provider.tsx 引用，一起删除
    - _Requirements: 4.1_
  - [x] 22.3 删除 `components/global-search-dialog.tsx`
    - 仅被 global-search-dialog-connected.tsx 引用，一起删除
    - _Requirements: 4.1_

- [x] 23. 删除 file-tree/ 未使用组件
  - [x] 23.1 删除 `components/file-tree/new-node-dialog.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_
  - [x] 23.2 删除 `components/file-tree/rename-node-dialog.tsx`
    - 未被任何文件引用
    - _Requirements: 4.1_

- [ ] 24. 验证组件删除
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1, 4.2_

- [ ] 25. 提交清理结果
  - 执行 `git add -A && git commit -m "chore: 删除更多未使用组件"`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

---

## 📊 清理统计

### 已删除目录

| 目录 | 文件数 | 状态 |
|------|--------|------|
| `domain/` | ~50 | ✅ 已删除 |
| `services/` | ~12 | ✅ 已删除 |
| `db/backup/` | 2 | ✅ 已删除 |
| `db/clear-data/` | 2 | ✅ 已删除 |
| `db/init/` | 2 | ✅ 已删除 |
| `actions/diary/` | 3 | ✅ 已删除 |
| `components/debug/` | 0 | ✅ 已删除 |
| `utils/` | 0 | ✅ 已删除 |

### 已删除组件

| 组件 | 文件 | 状态 |
|------|------|------|
| EmptyProject | `blocks/emptyProject.tsx` | ✅ 已删除 |
| CreateBookDialog | `blocks/createBookDialog.tsx` | ✅ 已删除 |
| FocusMode | `blocks/focus-mode.tsx` | ✅ 已删除 |
| WritingStatsPanel | `blocks/writing-stats-panel.tsx` | ✅ 已删除 |
| AutoSaveIndicator | `blocks/auto-save-indicator.tsx` | ✅ 已删除 |
| MultiSelect | `blocks/multi-select.tsx` | ✅ 已删除 |
| DrawingManager | `drawing/drawing-manager.tsx` | ✅ 已删除 |
| DrawingList | `drawing/drawing-list.tsx` | ✅ 已删除 |
| MultiEditorWorkspace | `workspace/multi-editor-workspace.tsx` | ✅ 已删除 |
| TestSelection | `test-selection.tsx` | ✅ 已删除 |

### 已删除路由

| 路由 | 文件 | 状态 |
|------|------|------|
| /test-clear-data | `routes/test-clear-data.tsx` | ✅ 已删除 |
| /test-focus | `routes/test-focus.tsx` | ✅ 已删除 |
| /test-manual-save | `routes/test-manual-save.tsx` | ✅ 已删除 |
| /test-selection | `routes/test-selection.tsx` | ✅ 已删除 |

### 待删除组件（Phase 9）

| 组件 | 文件 | 状态 |
|------|------|------|
| ActivityBar (旧) | `activity-bar.tsx` | ⏳ 待删除 |
| SettingsNav | `settings-nav.tsx` | ⏳ 待删除 |
| IconPicker | `icon-picker.tsx` | ⏳ 待删除 |
| SearchSidebar | `search-sidebar.tsx` | ⏳ 待删除 |
| IconThemePreview | `icon-theme-preview.tsx` | ⏳ 待删除 |
| DevOnly | `dev-only.tsx` | ⏳ 待删除 |
| GlobalSearchProvider | `global-search-provider.tsx` | ⏳ 待删除 |
| GlobalSearchDialogConnected | `global-search-dialog-connected.tsx` | ⏳ 待删除 |
| GlobalSearchDialog | `global-search-dialog.tsx` | ⏳ 待删除 |
| NewNodeDialog | `file-tree/new-node-dialog.tsx` | ⏳ 待删除 |
| RenameNodeDialog | `file-tree/rename-node-dialog.tsx` | ⏳ 待删除 |

### 清理量统计

**Phase 1-8 已完成：**
- **目录**: 8 个
- **文件**: 86 个
- **代码行数**: ~13,000 行

**Phase 9 待完成：**
- **文件**: 11 个
- **预计代码行数**: ~2,000 行
