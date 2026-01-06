# 前端架构重构任务

## 阶段 1: 创建新目录结构

### Task 1.1: 创建基础目录
- [x] 创建 `src/views/` 目录
- [x] 创建 `src/flows/` 目录
- [x] 创建 `src/pipes/` 目录
- [x] 创建 `src/io/` 目录
- [x] 创建 `src/io/api/` 目录
- [x] 创建 `src/io/storage/` 目录
- [x] 创建 `src/io/file/` 目录
- [x] 创建 `src/state/` 目录
- [x] 创建 `src/utils/` 目录

**Requirements**: REQ-1

---

## 阶段 2: 迁移底层（types, utils, io）

### Task 2.1: 迁移 lib/ → utils/
- [x] 移动 `lib/error.types.ts` → `utils/error.util.ts`
- [x] 移动 `lib/utils.ts` → `utils/cn.util.ts`
- [x] 移动 `lib/font-config.ts` → `utils/font.util.ts`
- [x] 移动 `lib/icons.ts` → `utils/icons.util.ts`
- [x] 移动 `lib/themes.ts` → `utils/themes.util.ts`
- [x] 移动 `lib/file-operation-queue.ts` → `utils/queue.util.ts`
- [x] 创建 `utils/index.ts` 重导出
- [x] 创建 `lib/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

### Task 2.2: 迁移 db/ + repo/ → io/api/
- [x] 移动 `db/api-client.fn.ts` → `io/api/client.api.ts`
- [x] 合并 `repo/workspace.repo.fn.ts` 到 `io/api/workspace.api.ts`
- [x] 合并 `repo/node.repo.fn.ts` 到 `io/api/node.api.ts`
- [x] 合并 `repo/content.repo.fn.ts` 到 `io/api/content.api.ts`
- [x] 合并 `repo/user.repo.fn.ts` 到 `io/api/user.api.ts`
- [x] 合并 `repo/tag.repo.fn.ts` 到 `io/api/tag.api.ts`
- [x] 合并 `repo/attachment.repo.fn.ts` 到 `io/api/attachment.api.ts`
- [x] 合并 `repo/backup.repo.fn.ts` 到 `io/api/backup.api.ts`
- [x] 合并 `repo/clear-data.repo.fn.ts` 到 `io/api/clear-data.api.ts`
- [x] 创建 `io/api/index.ts` 重导出
- [x] 创建 `io/index.ts` 重导出
- [x] 创建 `db/index.ts` 兼容重导出
- [x] 创建 `repo/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

### Task 2.3: 创建 io/storage/
- [x] 创建 `io/storage/settings.storage.ts`（从现有代码提取）
- [x] 创建 `io/storage/index.ts`

**Requirements**: REQ-1, REQ-2

### Task 2.4: 创建 io/file/
- [ ] 创建 `io/file/dialog.file.ts`（从现有代码提取）
- [ ] 创建 `io/file/download.file.ts`（从现有代码提取）
- [x] 创建 `io/file/index.ts`

**Requirements**: REQ-1, REQ-2

---

## 阶段 3: 迁移中间层（pipes, state）

### Task 3.1: 迁移 fn/ → pipes/（纯业务函数）
- [x] 移动 `fn/node/` → `pipes/node/`
- [x] 移动 `fn/content/` → `pipes/content/`
- [x] 移动 `fn/tag/` → `pipes/tag/`
- [x] 移动 `fn/export/` → `pipes/export/`
- [x] 移动 `fn/import/` → `pipes/import/`
- [x] 移动 `fn/search/` → `pipes/search/`
- [x] 移动 `fn/format/` → `pipes/format/`
- [x] 移动 `fn/wiki/` → `pipes/wiki/`
- [x] 移动 `fn/word-count/` → `pipes/word-count/`
- [x] 创建 `pipes/index.ts` 重导出

**Requirements**: REQ-2, REQ-4

### Task 3.2: 迁移 fn/ → utils/（通用工具函数）
- [x] 移动 `fn/date/` → `utils/date.util.ts`
- [x] 移动 `fn/keyboard/` → `utils/keyboard.util.ts`

**Requirements**: REQ-2, REQ-4

### Task 3.3: 迁移 fn/ → flows/（含 IO 的函数）
- [x] 移动 `fn/save/` → `flows/save/`
- [x] 移动 `fn/updater/` → `flows/updater/`
- [x] 移动 `fn/migration/` → `flows/migration/`

**Requirements**: REQ-2, REQ-4

### Task 3.4: 迁移 fn/ → views/（UI 相关）
- [x] 移动 `fn/editor/` → `views/editor/`
- [x] 移动 `fn/editor-tab/` → `views/editor-tabs/`
- [x] 移动 `fn/editor-history/` → `views/editor-history/`
- [x] 移动 `fn/diagram/` → `views/diagram/`
- [x] 移动 `fn/drawing/` → `views/drawing/`
- [x] 移动 `fn/theme/` → `views/theme/`
- [x] 移动 `fn/icon-theme/` → `views/icon-theme/`
- [x] 移动 `fn/writing/` → `views/writing/`
- [x] 移动 `fn/ledger/` → `views/ledger/`

**Requirements**: REQ-2, REQ-4

### Task 3.5: 迁移 stores/ → state/
- [x] 移动 `stores/selection.store.ts` → `state/selection.state.ts`
- [x] 移动 `stores/editor-tabs.store.ts` → `state/editor-tabs.state.ts`
- [x] 移动 `stores/editor-settings.store.ts` → `state/editor-settings.state.ts`
- [x] 移动 `stores/editor-history.store.ts` → `state/editor-history.state.ts`
- [x] 移动 `stores/sidebar.store.ts` → `state/sidebar.state.ts`
- [x] 移动 `stores/theme.store.ts` → `state/theme.state.ts`
- [x] 移动 `stores/icon-theme.store.ts` → `state/icon-theme.state.ts`
- [x] 移动 `stores/font.store.ts` → `state/font.state.ts`
- [x] 移动 `stores/ui.store.ts` → `state/ui.state.ts`
- [x] 移动 `stores/save.store.ts` → `state/save.state.ts`
- [x] 移动 `stores/writing.store.ts` → `state/writing.state.ts`
- [x] 移动 `stores/diagram.store.ts` → `state/diagram.state.ts`
- [x] 创建 `state/index.ts` 重导出
- [x] 创建 `stores/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

---

## 阶段 4: 迁移上层（flows, hooks, views）

### Task 4.1: 迁移 actions/ → flows/
- [x] 移动 `actions/workspace/` → `flows/workspace/`
- [x] 移动 `actions/node/` → `flows/node/`
- [x] 移动 `actions/export/` → `flows/export/`
- [x] 移动 `actions/import/` → `flows/import/`
- [x] 移动 `actions/file/` → `flows/file/`
- [x] 移动 `actions/settings/` → `flows/settings/`
- [x] 移动 `actions/wiki/` → `flows/wiki/`
- [x] 移动 `actions/templated/` → `flows/templated/`
- [x] 创建 `flows/index.ts` 重导出
- [x] 创建 `actions/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

### Task 4.2: 合并 queries/ 到 hooks/
- [x] 移动 `queries/query-keys.ts` → `hooks/query-keys.ts`
- [x] 更新 `hooks/index.ts` 重导出
- [x] 创建 `queries/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

### Task 4.3: 迁移 components/ → views/
- [x] 移动 `components/activity-bar/` → `views/activity-bar/`
- [x] 移动 `components/backup-manager/` → `views/backup-manager/`
- [x] 移动 `components/blocks/` → `views/blocks/`
- [x] 移动 `components/buffer-switcher/` → `views/buffer-switcher/`
- [x] 移动 `components/command-palette/` → `views/command-palette/`
- [x] 移动 `components/editor-tabs/` → `views/editor-tabs/`
- [x] 移动 `components/excalidraw-editor/` → `views/excalidraw-editor/`
- [x] 移动 `components/export-button/` → `views/export-button/`
- [x] 移动 `components/export-dialog/` → `views/export-dialog/`
- [x] 移动 `components/export-dialog-manager/` → `views/export-dialog-manager/`
- [x] 移动 `components/file-tree/` → `views/file-tree/`
- [x] 移动 `components/global-search/` → `views/global-search/`
- [x] 移动 `components/keyboard-shortcuts-help/` → `views/keyboard-shortcuts-help/`
- [x] 移动 `components/panels/` → `views/panels/`
- [x] 移动 `components/save-status-indicator/` → `views/save-status-indicator/`
- [x] 移动 `components/story-right-sidebar/` → `views/story-right-sidebar/`
- [x] 移动 `components/story-workspace/` → `views/story-workspace/`
- [x] 移动 `components/theme-selector/` → `views/theme-selector/`
- [x] 移动 `components/ui/` → `views/ui/`
- [x] 移动 `components/unified-sidebar/` → `views/unified-sidebar/`
- [x] 移动 `components/update-checker/` → `views/update-checker/`
- [x] 移动 `components/utils/` → `views/utils/`
- [x] 移动 `components/word-count-badge/` → `views/word-count-badge/`
- [x] 创建 `views/index.ts` 重导出
- [x] 创建 `components/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

---

## 阶段 5: 更新导入路径

### Task 5.1: 更新 TypeScript 路径别名
- [x] 检查 `tsconfig.json` 路径别名（已支持 @/* → ./src/*）
- [x] 检查 `vite.config.ts` 路径别名（已支持）

**Requirements**: REQ-1

### Task 5.2: 批量更新导入路径
- [x] 更新所有 `@/lib/` → `@/utils/`
- [x] 更新所有 `@/db/` → `@/io/api/`
- [x] 更新所有 `@/repo/` → `@/io/api/`
- [x] 更新所有 `@/stores/` → `@/state/`
- [x] 更新所有 `@/actions/` → `@/flows/`
- [x] 更新所有 `@/queries/` → `@/hooks/`
- [x] 更新所有 `@/components/` → `@/views/`
- [ ] 更新所有 `@/fn/` → `@/pipes/` 或 `@/utils/`

**Requirements**: REQ-4

---

## 阶段 6: 清理和验证

### Task 6.1: 删除旧目录
- [ ] 删除 `lib/` 目录（确认无引用后）
- [ ] 删除 `db/` 目录（确认无引用后）
- [x] 删除 `repo/` 目录（确认无引用后）
- [ ] 删除 `stores/` 目录（确认无引用后）
- [ ] 删除 `actions/` 目录（确认无引用后）
- [ ] 删除 `queries/` 目录（确认无引用后）
- [ ] 删除 `components/` 目录（确认无引用后）
- [ ] 删除 `fn/` 目录（确认无引用后）

**Requirements**: REQ-4

### Task 6.2: 验证
- [x] 运行 `bun run lint` 检查代码规范
- [ ] 运行 `bun run test` 运行所有测试
- [ ] 运行 `bun run desktop:dev` 验证应用正常运行
- [ ] 手动测试核心功能

**Requirements**: REQ-5

### Task 6.3: 更新文档
- [ ] 更新 `.kiro/steering/structure.md` 反映新结构
- [ ] 更新 README 中的项目结构说明

**Requirements**: REQ-1

---

## 迁移状态总结

### 已完成
- ✅ 阶段 1: 创建新目录结构
- ✅ Task 2.1: lib/ → utils/
- ✅ Task 2.2: db/ + repo/ → io/api/
- ✅ Task 3.1-3.4: fn/ → pipes/, flows/, views/, utils/
- ✅ Task 3.5: stores/ → state/
- ✅ Task 4.1: actions/ → flows/
- ✅ Task 4.2: queries/ → hooks/ (query-keys)
- ✅ Task 4.3: components/ → views/
- ✅ Task 5.1: 路径别名检查

### 待完成
- ⏳ Task 2.3-2.4: io/storage/, io/file/ (可选，按需创建)
- ⏳ Task 5.2: 批量更新导入路径
- ⏳ Task 6.1: 删除旧目录
- ⏳ Task 6.2-6.3: 验证和文档更新

### 注意事项

1. **渐进式迁移**: 每完成一个 Task 后提交代码，确保可回滚
2. **兼容性**: 通过 index.ts 重导出保持旧路径可用
3. **测试优先**: 每次迁移后运行测试确保功能正常
4. **依赖顺序**: 按照依赖关系从底层向上迁移

## Git 提交规范

每个 Task 完成后：
```bash
git add -A
git commit -m "refactor: 迁移 xxx 到新架构"
```
