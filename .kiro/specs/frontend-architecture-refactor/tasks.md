# 前端架构重构任务

## 阶段 1: 创建新目录结构

### Task 1.1: 创建基础目录
- [ ] 创建 `src/views/` 目录
- [ ] 创建 `src/flows/` 目录
- [ ] 创建 `src/pipes/` 目录
- [ ] 创建 `src/io/` 目录
- [ ] 创建 `src/io/api/` 目录
- [ ] 创建 `src/io/storage/` 目录
- [ ] 创建 `src/io/file/` 目录
- [ ] 创建 `src/state/` 目录
- [ ] 创建 `src/utils/` 目录

**Requirements**: REQ-1

---

## 阶段 2: 迁移底层（types, utils, io）

### Task 2.1: 迁移 lib/ → utils/
- [ ] 移动 `lib/error.types.ts` → `utils/error.util.ts`
- [ ] 移动 `lib/utils.ts` → `utils/common.util.ts`
- [ ] 移动 `lib/font-config.ts` → `utils/font.util.ts`
- [ ] 移动 `lib/icons.ts` → `utils/icons.util.ts`
- [ ] 移动 `lib/themes.ts` → `utils/themes.util.ts`
- [ ] 移动 `lib/file-operation-queue.ts` → `utils/queue.util.ts`
- [ ] 移动 `lib/save-service-manager.ts` → `flows/save/save-manager.flow.ts`
- [ ] 创建 `utils/index.ts` 重导出
- [ ] 创建 `lib/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

### Task 2.2: 迁移 db/ + repo/ → io/api/
- [ ] 移动 `db/api-client.fn.ts` → `io/api/client.api.ts`
- [ ] 合并 `repo/workspace.repo.fn.ts` 到 `io/api/workspace.api.ts`
- [ ] 合并 `repo/node.repo.fn.ts` 到 `io/api/node.api.ts`
- [ ] 合并 `repo/content.repo.fn.ts` 到 `io/api/content.api.ts`
- [ ] 合并 `repo/user.repo.fn.ts` 到 `io/api/user.api.ts`
- [ ] 合并 `repo/tag.repo.fn.ts` 到 `io/api/tag.api.ts`
- [ ] 合并 `repo/attachment.repo.fn.ts` 到 `io/api/attachment.api.ts`
- [ ] 合并 `repo/backup.repo.fn.ts` 到 `io/api/backup.api.ts`
- [ ] 合并 `repo/clear-data.repo.fn.ts` 到 `io/api/clear-data.api.ts`
- [ ] 创建 `io/api/index.ts` 重导出
- [ ] 创建 `io/index.ts` 重导出
- [ ] 创建 `db/index.ts` 兼容重导出
- [ ] 创建 `repo/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

### Task 2.3: 创建 io/storage/
- [ ] 创建 `io/storage/settings.storage.ts`（从现有代码提取）
- [ ] 创建 `io/storage/index.ts`

**Requirements**: REQ-1, REQ-2

### Task 2.4: 创建 io/file/
- [ ] 创建 `io/file/dialog.file.ts`（从现有代码提取）
- [ ] 创建 `io/file/download.file.ts`（从现有代码提取）
- [ ] 创建 `io/file/index.ts`

**Requirements**: REQ-1, REQ-2

---

## 阶段 3: 迁移中间层（pipes, state）

### Task 3.1: 迁移 fn/ → pipes/（纯业务函数）
- [ ] 移动 `fn/node/` → `pipes/node/`，重命名为 `.pipe.ts`
- [ ] 移动 `fn/content/` → `pipes/content/`，重命名为 `.pipe.ts`
- [ ] 移动 `fn/tag/` → `pipes/tag/`，重命名为 `.pipe.ts`
- [ ] 移动 `fn/export/` → `pipes/export/`，重命名为 `.pipe.ts`
- [ ] 移动 `fn/import/` → `pipes/import/`，重命名为 `.pipe.ts`
- [ ] 移动 `fn/search/` → `pipes/search/`，重命名为 `.pipe.ts`
- [ ] 移动 `fn/format/` → `pipes/format/`，重命名为 `.pipe.ts`
- [ ] 移动 `fn/wiki/` → `pipes/wiki/`，重命名为 `.pipe.ts`
- [ ] 移动 `fn/word-count/` → `pipes/word-count/`，重命名为 `.pipe.ts`
- [ ] 创建 `pipes/index.ts` 重导出

**Requirements**: REQ-2, REQ-4

### Task 3.2: 迁移 fn/ → utils/（通用工具函数）
- [ ] 移动 `fn/date/` → `utils/date.util.ts`
- [ ] 移动 `fn/keyboard/` → `utils/keyboard.util.ts`

**Requirements**: REQ-2, REQ-4

### Task 3.3: 迁移 fn/ → flows/（含 IO 的函数）
- [ ] 移动 `fn/save/` → `flows/save/`，重命名为 `.flow.ts`
- [ ] 移动 `fn/updater/` → `flows/updater/`，重命名为 `.flow.ts`
- [ ] 移动 `fn/migration/` → `flows/migration/`，重命名为 `.flow.ts`

**Requirements**: REQ-2, REQ-4

### Task 3.4: 迁移 fn/ → views/（UI 相关）
- [ ] 移动 `fn/editor/` → `views/editor/`（编辑器配置）
- [ ] 移动 `fn/editor-tab/` → `views/editor-tabs/`
- [ ] 移动 `fn/editor-history/` → `views/editor/`
- [ ] 移动 `fn/diagram/` → `views/diagram/`
- [ ] 移动 `fn/drawing/` → `views/drawing/`
- [ ] 移动 `fn/theme/` → `views/theme/`
- [ ] 移动 `fn/icon-theme/` → `views/icon-theme/`
- [ ] 移动 `fn/writing/` → `views/writing/`
- [ ] 移动 `fn/ledger/` → `views/ledger/`

**Requirements**: REQ-2, REQ-4

### Task 3.5: 迁移 stores/ → state/
- [ ] 移动 `stores/selection.store.ts` → `state/selection.state.ts`
- [ ] 移动 `stores/editor-tabs.store.ts` → `state/editor-tabs.state.ts`
- [ ] 移动 `stores/editor-settings.store.ts` → `state/editor-settings.state.ts`
- [ ] 移动 `stores/editor-history.store.ts` → `state/editor-history.state.ts`
- [ ] 移动 `stores/sidebar.store.ts` → `state/sidebar.state.ts`
- [ ] 移动 `stores/theme.store.ts` → `state/theme.state.ts`
- [ ] 移动 `stores/icon-theme.store.ts` → `state/icon-theme.state.ts`
- [ ] 移动 `stores/font.store.ts` → `state/font.state.ts`
- [ ] 移动 `stores/ui.store.ts` → `state/ui.state.ts`
- [ ] 移动 `stores/save.store.ts` → `state/save.state.ts`
- [ ] 移动 `stores/writing.store.ts` → `state/writing.state.ts`
- [ ] 移动 `stores/diagram.store.ts` → `state/diagram.state.ts`
- [ ] 创建 `state/index.ts` 重导出
- [ ] 创建 `stores/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

---

## 阶段 4: 迁移上层（flows, hooks, views）

### Task 4.1: 迁移 actions/ → flows/
- [ ] 移动 `actions/workspace/` → `flows/workspace/`，重命名为 `.flow.ts`
- [ ] 移动 `actions/node/` → `flows/node/`，重命名为 `.flow.ts`
- [ ] 移动 `actions/export/` → `flows/export/`，重命名为 `.flow.ts`
- [ ] 移动 `actions/import/` → `flows/import/`，重命名为 `.flow.ts`
- [ ] 移动 `actions/file/` → `flows/file/`，重命名为 `.flow.ts`
- [ ] 移动 `actions/settings/` → `flows/settings/`，重命名为 `.flow.ts`
- [ ] 移动 `actions/wiki/` → `flows/wiki/`，重命名为 `.flow.ts`
- [ ] 移动 `actions/templated/` → `flows/templated/`，重命名为 `.flow.ts`
- [ ] 创建 `flows/index.ts` 重导出
- [ ] 创建 `actions/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

### Task 4.2: 合并 queries/ 到 hooks/
- [ ] 合并 `queries/workspace.queries.ts` 到 `hooks/use-workspace.ts`
- [ ] 合并 `queries/node.queries.ts` 到 `hooks/use-node.ts`
- [ ] 合并 `queries/content.queries.ts` 到 `hooks/use-content.ts`
- [ ] 合并 `queries/tag.queries.ts` 到 `hooks/use-tag.ts`
- [ ] 合并 `queries/user.queries.ts` 到 `hooks/use-user.ts`
- [ ] 合并 `queries/attachment.queries.ts` 到 `hooks/use-attachment.ts`
- [ ] 移动 `queries/query-keys.ts` → `hooks/query-keys.ts`
- [ ] 更新 `hooks/index.ts` 重导出
- [ ] 创建 `queries/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

### Task 4.3: 迁移 components/ → views/
- [ ] 移动 `components/activity-bar/` → `views/activity-bar/`
- [ ] 移动 `components/backup-manager/` → `views/backup-manager/`
- [ ] 移动 `components/blocks/` → `views/blocks/`
- [ ] 移动 `components/buffer-switcher/` → `views/buffer-switcher/`
- [ ] 移动 `components/command-palette/` → `views/command-palette/`
- [ ] 移动 `components/editor-tabs/` → `views/editor-tabs/`
- [ ] 移动 `components/excalidraw-editor/` → `views/excalidraw-editor/`
- [ ] 移动 `components/export-button/` → `views/export-button/`
- [ ] 移动 `components/export-dialog/` → `views/export-dialog/`
- [ ] 移动 `components/export-dialog-manager/` → `views/export-dialog-manager/`
- [ ] 移动 `components/file-tree/` → `views/file-tree/`
- [ ] 移动 `components/global-search/` → `views/global-search/`
- [ ] 移动 `components/keyboard-shortcuts-help/` → `views/keyboard-shortcuts-help/`
- [ ] 移动 `components/panels/` → `views/panels/`
- [ ] 移动 `components/save-status-indicator/` → `views/save-status-indicator/`
- [ ] 移动 `components/story-right-sidebar/` → `views/story-right-sidebar/`
- [ ] 移动 `components/story-workspace/` → `views/story-workspace/`
- [ ] 移动 `components/theme-selector/` → `views/theme-selector/`
- [ ] 移动 `components/ui/` → `views/ui/`
- [ ] 移动 `components/unified-sidebar/` → `views/unified-sidebar/`
- [ ] 移动 `components/update-checker/` → `views/update-checker/`
- [ ] 移动 `components/utils/` → `views/utils/`
- [ ] 移动 `components/word-count-badge/` → `views/word-count-badge/`
- [ ] 创建 `views/index.ts` 重导出
- [ ] 创建 `components/index.ts` 兼容重导出

**Requirements**: REQ-2, REQ-4

---

## 阶段 5: 更新导入路径

### Task 5.1: 更新 TypeScript 路径别名
- [ ] 更新 `tsconfig.json` 添加新路径别名
- [ ] 更新 `vite.config.ts` 添加新路径别名

**Requirements**: REQ-1

### Task 5.2: 批量更新导入路径
- [ ] 更新所有 `@/lib/` → `@/utils/`
- [ ] 更新所有 `@/db/` → `@/io/api/`
- [ ] 更新所有 `@/repo/` → `@/io/api/`
- [ ] 更新所有 `@/stores/` → `@/state/`
- [ ] 更新所有 `@/actions/` → `@/flows/`
- [ ] 更新所有 `@/queries/` → `@/hooks/`
- [ ] 更新所有 `@/components/` → `@/views/`
- [ ] 更新所有 `@/fn/` → `@/pipes/` 或 `@/utils/`

**Requirements**: REQ-4

---

## 阶段 6: 清理和验证

### Task 6.1: 删除旧目录
- [ ] 删除 `lib/` 目录（确认无引用后）
- [ ] 删除 `db/` 目录（确认无引用后）
- [ ] 删除 `repo/` 目录（确认无引用后）
- [ ] 删除 `stores/` 目录（确认无引用后）
- [ ] 删除 `actions/` 目录（确认无引用后）
- [ ] 删除 `queries/` 目录（确认无引用后）
- [ ] 删除 `components/` 目录（确认无引用后）
- [ ] 删除 `fn/` 目录（确认无引用后）

**Requirements**: REQ-4

### Task 6.2: 验证
- [ ] 运行 `bun run lint` 检查代码规范
- [ ] 运行 `bun run test` 运行所有测试
- [ ] 运行 `bun run desktop:dev` 验证应用正常运行
- [ ] 手动测试核心功能

**Requirements**: REQ-5

### Task 6.3: 更新文档
- [ ] 更新 `.kiro/steering/structure.md` 反映新结构
- [ ] 更新 README 中的项目结构说明

**Requirements**: REQ-1

---

## 注意事项

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
