# Implementation Plan

## Phase 1: 重命名已有 View/Container 结构的组件

- [x] 1. 重构 activity-bar 组件
  - [x] 1.1 重命名 `activity-bar-view.tsx` → `activity-bar.view.fn.tsx`
    - _Requirements: 1.1_
  - [x] 1.2 重命名 `activity-bar-container.tsx` → `activity-bar.container.fn.tsx`
    - _Requirements: 1.2_
  - [x] 1.3 更新 `index.ts` 导出
    - _Requirements: 1.4_
  - [x] 1.4 更新所有导入路径
    - _Requirements: 1.3_
  - [x] 1.5 创建 `activity-bar.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 1.6 创建 `activity-bar.container.fn.test.tsx`
    - _Requirements: 7.2_

- [ ] 2. 验证 Phase 1
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 2: 重构 blocks/ 目录中已有 View/Container 的组件

- [-] 3. 重构 wiki-hover-preview 组件
  - [ ] 3.1 创建 `components/wiki-hover-preview/` 目录
  - [ ] 3.2 移动并重命名 `wiki-hover-preview.tsx` → `wiki-hover-preview.view.fn.tsx`
    - _Requirements: 2.1_
  - [ ] 3.3 移动并重命名 `wiki-hover-preview-connected.tsx` → `wiki-hover-preview.container.fn.tsx`
    - _Requirements: 2.2_
  - [ ] 3.4 创建 `wiki-hover-preview.types.ts`
  - [ ] 3.5 创建 `index.ts`
  - [ ] 3.6 更新所有导入路径
  - [ ] 3.7 创建 `wiki-hover-preview.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [ ] 3.8 创建 `wiki-hover-preview.container.fn.test.tsx`
    - _Requirements: 7.2_

- [x] 4. 重构 global-search 组件
  - [x] 4.1 创建 `components/global-search/` 目录
  - [x] 4.2 移动并重命名 `global-search.tsx` → `global-search.view.fn.tsx`
    - _Requirements: 2.3_
  - [x] 4.3 移动并重命名 `global-search-connected.tsx` → `global-search.container.fn.tsx`
    - _Requirements: 2.4_
  - [x] 4.4 创建 `global-search.types.ts`
  - [x] 4.5 创建 `index.ts`
  - [x] 4.6 更新所有导入路径
  - [x] 4.7 创建 `global-search.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 4.8 创建 `global-search.container.fn.test.tsx`
    - _Requirements: 7.2_

- [ ] 5. 验证 Phase 2
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 3: 重构 file-tree/ 目录

- [x] 6. 重构 file-tree 组件
  - [x] 6.1 重命名 `file-tree.tsx` → `file-tree.view.fn.tsx`
    - _Requirements: 3.1_
  - [x] 6.2 重命名 `file-tree-item.tsx` → `file-tree-item.view.fn.tsx`
    - _Requirements: 3.3_
  - [x] 6.3 创建 `file-tree.types.ts`
    - _Requirements: 3.4_
  - [x] 6.4 分析是否需要 Container 组件
    - _Requirements: 3.2_
  - [x] 6.5 更新 `index.ts`
  - [x] 6.6 更新所有导入路径
  - [x] 6.7 创建 `file-tree.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 6.8 创建 `file-tree-item.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 6.9 如果创建了 Container，创建 `file-tree.container.fn.test.tsx`
    - _Requirements: 7.2_

- [ ] 7. 验证 Phase 3
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 4: 重构 blocks/ 目录中的纯展示组件

- [x] 8. 重构 keyboard-shortcuts-help 组件
  - [x] 8.1 创建 `components/keyboard-shortcuts-help/` 目录
  - [x] 8.2 移动并重命名为 `keyboard-shortcuts-help.view.fn.tsx`
  - [x] 8.3 创建 `keyboard-shortcuts-help.types.ts`
  - [x] 8.4 创建 `index.ts`
  - [x] 8.5 更新所有导入路径
  - [x] 8.6 创建 `keyboard-shortcuts-help.view.fn.test.tsx`
    - _Requirements: 7.2_

- [x] 9. 重构 save-status-indicator 组件
  - [x] 9.1 创建 `components/save-status-indicator/` 目录
  - [x] 9.2 移动并重命名为 `save-status-indicator.view.fn.tsx`
  - [x] 9.3 创建 `save-status-indicator.types.ts`
  - [x] 9.4 创建 `index.ts`
  - [x] 9.5 更新所有导入路径
  - [x] 9.6 创建 `save-status-indicator.view.fn.test.tsx`
    - _Requirements: 7.2_

- [x] 10. 重构 word-count-badge 组件
  - [x] 10.1 创建 `components/word-count-badge/` 目录
  - [x] 10.2 移动并重命名为 `word-count-badge.view.fn.tsx`
  - [x] 10.3 创建 `word-count-badge.types.ts`
  - [x] 10.4 创建 `index.ts`
  - [x] 10.5 更新所有导入路径
  - [x] 10.6 创建 `word-count-badge.view.fn.test.tsx`
    - _Requirements: 7.2_

- [ ] 11. 验证 Phase 4
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 5: 重构 blocks/ 目录中的混合组件

- [x] 12. 重构 backup-manager 组件
  - [x] 12.1 创建 `components/backup-manager/` 目录
  - [x] 12.2 分析组件，拆分为 View 和 Container
  - [x] 12.3 创建 `backup-manager.view.fn.tsx`
  - [x] 12.4 创建 `backup-manager.container.fn.tsx`
  - [x] 12.5 创建 `backup-manager.types.ts`
  - [x] 12.6 创建 `index.ts`
  - [x] 12.7 删除原文件
  - [x] 12.8 更新所有导入路径
  - [x] 12.9 创建 `backup-manager.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 12.10 创建 `backup-manager.container.fn.test.tsx`
    - _Requirements: 7.2, 2.5_

- [ ] 13. 重构 canvas-editor 组件
  - [ ] 13.1 创建 `components/canvas-editor/` 目录
  - [ ] 13.2 分析组件，拆分为 View 和 Container
  - [ ] 13.3 创建 `canvas-editor.view.fn.tsx`
  - [ ] 13.4 创建 `canvas-editor.container.fn.tsx`
  - [ ] 13.5 创建 `canvas-editor.types.ts`
  - [ ] 13.6 创建 `index.ts`
  - [ ] 13.7 删除原文件
  - [ ] 13.8 更新所有导入路径
  - [ ] 13.9 创建 `canvas-editor.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [ ] 13.10 创建 `canvas-editor.container.fn.test.tsx`
    - _Requirements: 7.2, 2.5_

- [x] 14. 重构 export-dialog 组件
  - [x] 14.1 创建 `components/export-dialog/` 目录
  - [x] 14.2 分析组件，拆分为 View 和 Container
  - [x] 14.3 创建 `export-dialog.view.fn.tsx`
  - [x] 14.4 创建 `export-dialog.container.fn.tsx`
  - [x] 14.5 创建 `export-dialog.types.ts`
  - [x] 14.6 创建 `index.ts`
  - [x] 14.7 删除原文件
  - [x] 14.8 更新所有导入路径
  - [x] 14.9 创建 `export-dialog.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 14.10 创建 `export-dialog.container.fn.test.tsx`
    - _Requirements: 7.2, 2.5_

- [x] 15. 重构 theme-selector 组件
  - [x] 15.1 创建 `components/theme-selector/` 目录
  - [x] 15.2 分析组件，拆分为 View 和 Container
  - [x] 15.3 创建 `theme-selector.view.fn.tsx`
  - [x] 15.4 创建 `theme-selector.container.fn.tsx`
  - [x] 15.5 创建 `theme-selector.types.ts`
  - [x] 15.6 创建 `index.ts`
  - [x] 15.7 删除原文件
  - [x] 15.8 更新所有导入路径
  - [x] 15.9 创建 `theme-selector.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 15.10 创建 `theme-selector.container.fn.test.tsx`
    - _Requirements: 7.2, 2.5_

- [x] 16. 重构 update-checker 组件
  - [x] 16.1 创建 `components/update-checker/` 目录
  - [x] 16.2 分析组件，拆分为 View 和 Container
  - [x] 16.3 创建 `update-checker.view.fn.tsx`
  - [x] 16.4 创建 `update-checker.container.fn.tsx`
  - [x] 16.5 创建 `update-checker.types.ts`
  - [x] 16.6 创建 `index.ts`
  - [x] 16.7 删除原文件
  - [x] 16.8 更新所有导入路径
  - [x] 16.9 创建 `update-checker.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 16.10 创建 `update-checker.container.fn.test.tsx`
    - _Requirements: 7.2, 2.5_

- [ ] 17. 验证 Phase 5
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 6: 重构 panels/ 目录

- [ ] 18. 重构 drawings-panel 组件
  - [ ] 18.1 创建 `components/panels/drawings-panel/` 目录
  - [ ] 18.2 分析组件，拆分为 View 和 Container
  - [ ] 18.3 创建 `drawings-panel.view.fn.tsx`
  - [ ] 18.4 创建 `drawings-panel.container.fn.tsx`
  - [ ] 18.5 创建 `drawings-panel.types.ts`
  - [ ] 18.6 创建 `index.ts`
  - [ ] 18.7 删除原文件
  - [ ] 18.8 更新所有导入路径
  - [ ] 18.9 创建 `drawings-panel.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [ ] 18.10 创建 `drawings-panel.container.fn.test.tsx`
    - _Requirements: 7.2, 4.1, 4.2_

- [x] 19. 重构 file-tree-panel 组件
  - [x] 19.1 创建 `components/panels/file-tree-panel/` 目录
  - [x] 19.2 分析组件（主要是 Container）
  - [x] 19.3 创建 `file-tree-panel.container.fn.tsx`
  - [x] 19.4 创建 `file-tree-panel.types.ts`
  - [x] 19.5 创建 `index.ts`
  - [x] 19.6 删除原文件
  - [x] 19.7 更新所有导入路径
  - [x] 19.8 创建 `file-tree-panel.container.fn.test.tsx`
    - _Requirements: 7.2, 4.1, 4.2_

- [x] 20. 重构 search-panel 组件
  - [x] 20.1 创建 `components/panels/search-panel/` 目录
  - [x] 20.2 分析组件，拆分为 View 和 Container
  - [x] 20.3 创建 `search-panel.view.fn.tsx`
  - [x] 20.4 创建 `search-panel.container.fn.tsx`
  - [x] 20.5 创建 `search-panel.types.ts`
  - [x] 20.6 创建 `index.ts`
  - [x] 20.7 删除原文件
  - [x] 20.8 更新所有导入路径
  - [x] 20.9 创建 `search-panel.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 20.10 创建 `search-panel.container.fn.test.tsx`
    - _Requirements: 7.2, 4.1, 4.2_

- [x] 21. 重构 tag-graph-panel 组件
  - [x] 21.1 创建 `components/panels/tag-graph-panel/` 目录
  - [x] 21.2 分析组件，拆分为 View 和 Container
  - [x] 21.3 创建 `tag-graph-panel.view.fn.tsx`
  - [x] 21.4 创建 `tag-graph-panel.container.fn.tsx`
  - [x] 21.5 创建 `tag-graph-panel.types.ts`
  - [x] 21.6 创建 `index.ts`
  - [x] 21.7 删除原文件
  - [x] 21.8 更新所有导入路径
  - [x] 21.9 创建 `tag-graph-panel.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 21.10 创建 `tag-graph-panel.container.fn.test.tsx`
    - _Requirements: 7.2, 4.1, 4.2_

- [ ] 22. 验证 Phase 6
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 7: 重构 export/ 和 drawing/ 目录

- [x] 23. 重构 export-button 组件
  - [x] 23.1 创建 `components/export-button/` 目录
  - [x] 23.2 分析组件，拆分为 View 和 Container
  - [x] 23.3 创建 `export-button.view.fn.tsx`
  - [x] 23.4 创建 `export-button.container.fn.tsx`
  - [x] 23.5 创建 `export-button.types.ts`
  - [x] 23.6 创建 `index.ts`
  - [x] 23.7 删除原文件和目录
  - [x] 23.8 更新所有导入路径
  - [x] 23.9 创建 `export-button.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 23.10 创建 `export-button.container.fn.test.tsx`
    - _Requirements: 7.2_

- [ ] 24. 重构 export-dialog-manager 组件
  - [ ] 24.1 创建 `components/export-dialog-manager/` 目录
  - [ ] 24.2 分析组件（主要是 Container）
  - [ ] 24.3 创建 `export-dialog-manager.container.fn.tsx`
  - [ ] 24.4 创建 `export-dialog-manager.types.ts`
  - [ ] 24.5 创建 `index.ts`
  - [ ] 24.6 删除原文件和目录
  - [ ] 24.7 更新所有导入路径
  - [ ] 24.8 创建 `export-dialog-manager.container.fn.test.tsx`
    - _Requirements: 7.2_

- [ ] 25. 重构 drawing-workspace 组件
  - [ ] 25.1 创建 `components/drawing-workspace/` 目录
  - [ ] 25.2 分析组件，拆分为 View 和 Container
  - [ ] 25.3 创建 `drawing-workspace.view.fn.tsx`
  - [ ] 25.4 创建 `drawing-workspace.container.fn.tsx`
  - [ ] 25.5 创建 `drawing-workspace.types.ts`
  - [ ] 25.6 创建 `index.ts`
  - [ ] 25.7 删除原文件和目录
  - [ ] 25.8 更新所有导入路径
  - [ ] 25.9 创建 `drawing-workspace.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [ ] 25.10 创建 `drawing-workspace.container.fn.test.tsx`
    - _Requirements: 7.2_

- [ ] 26. 验证 Phase 7
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 8: 重构 workspace/ 目录

- [ ] 27. 重构 story-workspace 组件
  - [ ] 27.1 创建 `components/story-workspace/` 目录
  - [ ] 27.2 分析组件（主要是 Container）
  - [ ] 27.3 创建 `story-workspace.container.fn.tsx`
  - [ ] 27.4 创建 `story-workspace.types.ts`
  - [ ] 27.5 创建 `index.ts`
  - [ ] 27.6 删除原文件和目录
  - [ ] 27.7 更新所有导入路径
  - [ ] 27.8 创建 `story-workspace.container.fn.test.tsx`
    - _Requirements: 7.2_

- [ ] 28. 验证 Phase 8
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 9: 重构根级组件

- [x] 29. 重构 buffer-switcher 组件
  - [x] 29.1 创建 `components/buffer-switcher/` 目录
  - [x] 29.2 分析组件，拆分为 View 和 Container
  - [x] 29.3 创建 `buffer-switcher.view.fn.tsx`
  - [x] 29.4 创建 `buffer-switcher.container.fn.tsx`
  - [x] 29.5 创建 `buffer-switcher.types.ts`
  - [x] 29.6 创建 `index.ts`
  - [x] 29.7 删除原文件
  - [x] 29.8 更新所有导入路径
  - [x] 29.9 创建 `buffer-switcher.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 29.10 创建 `buffer-switcher.container.fn.test.tsx`
    - _Requirements: 7.2, 5.1, 5.2_

- [x] 30. 重构 command-palette 组件
  - [x] 30.1 创建 `components/command-palette/` 目录
  - [x] 30.2 分析组件，拆分为 View 和 Container
  - [x] 30.3 创建 `command-palette.view.fn.tsx`
  - [x] 30.4 创建 `command-palette.container.fn.tsx`
  - [x] 30.5 创建 `command-palette.types.ts`
  - [x] 30.6 创建 `index.ts`
  - [x] 30.7 删除原文件
  - [x] 30.8 更新所有导入路径
  - [x] 30.9 创建 `command-palette.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 30.10 创建 `command-palette.container.fn.test.tsx`
    - _Requirements: 7.2, 5.1, 5.2_

- [x] 31. 重构 editor-tabs 组件
  - [x] 31.1 创建 `components/editor-tabs/` 目录
  - [x] 31.2 分析组件，拆分为 View 和 Container
  - [x] 31.3 创建 `editor-tabs.view.fn.tsx`
  - [x] 31.4 创建 `editor-tabs.container.fn.tsx`
  - [x] 31.5 创建 `editor-tabs.types.ts`
  - [x] 31.6 创建 `index.ts`
  - [x] 31.7 删除原文件
  - [x] 31.8 更新所有导入路径
  - [x] 31.9 创建 `editor-tabs.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 31.10 创建 `editor-tabs.container.fn.test.tsx`
    - _Requirements: 7.2, 5.1, 5.2_

- [x] 32. 重构 story-right-sidebar 组件
  - [x] 32.1 创建 `components/story-right-sidebar/` 目录
  - [x] 32.2 分析组件，拆分为 View 和 Container
  - [x] 32.3 创建 `story-right-sidebar.view.fn.tsx`
  - [x] 32.4 创建 `story-right-sidebar.container.fn.tsx`
  - [x] 32.5 创建 `story-right-sidebar.types.ts`
  - [x] 32.6 创建 `index.ts`
  - [x] 32.7 删除原文件
  - [x] 32.8 更新所有导入路径
  - [x] 32.9 创建 `story-right-sidebar.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 32.10 创建 `story-right-sidebar.container.fn.test.tsx`
    - _Requirements: 7.2, 5.1, 5.2_

- [x] 33. 重构 unified-sidebar 组件
  - [x] 33.1 创建 `components/unified-sidebar/` 目录
  - [x] 33.2 分析组件，拆分为 View 和 Container
  - [x] 33.3 创建 `unified-sidebar.view.fn.tsx`
  - [x] 33.4 创建 `unified-sidebar.container.fn.tsx`
  - [x] 33.5 创建 `unified-sidebar.types.ts`
  - [x] 33.6 创建 `index.ts`
  - [x] 33.7 删除原文件
  - [x] 33.8 更新所有导入路径
  - [x] 33.9 创建 `unified-sidebar.view.fn.test.tsx`
    - _Requirements: 7.2_
  - [x] 33.10 创建 `unified-sidebar.container.fn.test.tsx`
    - _Requirements: 7.2, 5.1, 5.2_

- [ ] 34. 验证 Phase 9
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - 运行 `bunx vitest run` 确认测试通过
  - _Requirements: 7.1, 7.2_

## Phase 10: 处理工具组件

- [ ] 35. 移动工具组件
  - [ ] 35.1 创建 `components/utils/` 目录
  - [ ] 35.2 移动 `devtools-wrapper.tsx` → `utils/devtools-wrapper.tsx`
  - [ ] 35.3 移动 `font-style-injector.tsx` → `utils/font-style-injector.tsx`
  - [ ] 35.4 创建 `utils/index.ts`
  - [ ] 35.5 更新所有导入路径

- [ ] 36. 验证 Phase 10
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1_

## Phase 11: 清理旧目录

- [ ] 37. 清理空目录
  - [ ] 37.1 删除空的 `blocks/` 目录（如果为空）
  - [ ] 37.2 删除空的 `export/` 目录（如果为空）
  - [ ] 37.3 删除空的 `drawing/` 目录（如果为空）
  - [ ] 37.4 删除空的 `workspace/` 目录（如果为空）

- [ ] 38. 验证 Phase 11
  - 运行 `bunx tsc --noEmit`
  - 确认无类型错误
  - _Requirements: 7.1_

## Phase 12: 最终验证

- [ ] 39. 运行完整验证
  - [ ] 39.1 运行类型检查
    - 执行 `bunx tsc --noEmit`
    - 确认无类型错误
    - _Requirements: 7.1_
  - [ ] 39.2 运行测试
    - 执行 `bunx vitest run`
    - 确认所有测试通过（包括新增的组件测试）
    - _Requirements: 7.2_
  - [ ] 39.3 运行开发服务器
    - 执行 `bun run desktop:dev`
    - 确认应用正常启动
    - _Requirements: 7.3_
  - [ ] 39.4 验证 ui/ 目录未被修改
    - 确认 `components/ui/` 目录文件未变化
    - _Requirements: 6.1, 6.2_
  - [ ] 39.5 验证测试覆盖率
    - 确认所有 View 组件有对应测试
    - 确认所有 Container 组件有对应测试
    - _Requirements: 7.2_

- [ ] 40. 提交重构结果
  - 执行 `git add -A && git commit -m "refactor: 组件命名规范化，使用 .fn.tsx 后缀，添加组件测试"`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

---

## 📊 迁移统计

### 组件分类

| 类型 | 数量 | 状态 |
|------|------|------|
| 已有 View/Container | 3 | ⏳ 待重命名 |
| 纯展示组件 | 5 | ⏳ 待重命名 |
| 混合组件 | 15 | ⏳ 待拆分 |
| 工具组件 | 2 | ⏳ 待移动 |
| ui/ 组件 | 38 | ⚪ 不修改 |

### 预计工作量

| Phase | 任务数 | 预计时间 |
|-------|--------|----------|
| Phase 1 | 1 | 15 分钟 |
| Phase 2 | 2 | 30 分钟 |
| Phase 3 | 1 | 20 分钟 |
| Phase 4 | 3 | 30 分钟 |
| Phase 5 | 5 | 2 小时 |
| Phase 6 | 4 | 1.5 小时 |
| Phase 7 | 3 | 1 小时 |
| Phase 8 | 1 | 30 分钟 |
| Phase 9 | 5 | 2 小时 |
| Phase 10 | 1 | 15 分钟 |
| Phase 11 | 1 | 10 分钟 |
| Phase 12 | 1 | 20 分钟 |
| **总计** | **28** | **~9 小时** |
