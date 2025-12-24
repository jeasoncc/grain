# Tasks

## Phase 1: 基础设施

- [x] 1. 安装函数式编程依赖
  - 安装 fp-ts
  - 安装 es-toolkit
  - 安装 @tanstack/react-virtual
  - 安装 million

- [x] 2. 创建错误类型定义
  - 创建 `lib/error.types.ts`
  - 定义 AppError 联合类型
  - 导出类型守卫函数

- [x] 3. 创建目录结构
  - 创建 `types/` 目录
  - 创建 `fn/` 目录
  - 创建 `stores/` 目录（如不存在）

## Phase 2: 类型层迁移

- [x] 4. 迁移 Node 类型
  - 移动 `db/models/node/node.interface.ts` → `types/node/node.interface.ts`
  - 移动 `db/models/node/node.schema.ts` → `types/node/node.schema.ts`
  - 移动 `db/models/node/node.builder.ts` → `types/node/node.builder.ts`
  - 创建 `types/node/index.ts`
  - 更新 Builder 使用 Object.freeze()

- [x] 5. 迁移 Workspace 类型
  - 移动 `db/models/workspace/*.ts` → `types/workspace/`
  - 创建 `types/workspace/index.ts`

- [x] 6. 迁移 Content 类型
  - 移动 `db/models/content/*.ts` → `types/content/`
  - 创建 `types/content/index.ts`

- [x] 7. 迁移 Drawing 类型
  - 移动 `db/models/drawing/*.ts` → `types/drawing/`
  - 创建 `types/drawing/index.ts`

- [x] 8. 迁移 Attachment 类型
  - 移动 `db/models/attachment/*.ts` → `types/attachment/`
  - 创建 `types/attachment/index.ts`

- [x] 9. 迁移 User 类型
  - 移动 `db/models/user/*.ts` → `types/user/`
  - 创建 `types/user/index.ts`

- [x] 10. 迁移 Tag 类型
  - 移动 `db/models/tag/tag.interface.ts` → `types/tag/`
  - 创建 `types/tag/tag.schema.ts`（新建）
  - 创建 `types/tag/tag.builder.ts`（新建）
  - 创建 `types/tag/index.ts`

- [x] 11. 迁移 Shared 类型
  - 移动 `db/models/shared/*.ts` → `types/shared/`
  - 创建 `types/shared/index.ts`

- [x] 12. 迁移 Domain 类型
  - 移动 `domain/selection/selection.interface.ts` → `types/selection/`
  - 移动 `domain/editor-tabs/editor-tabs.interface.ts` → `types/editor-tab/`
  - 移动 `domain/editor-tabs/editor-tabs.builder.ts` → `types/editor-tab/`
  - 移动 `domain/ui/ui.interface.ts` → `types/ui/`
  - 移动 `domain/sidebar/sidebar.interface.ts` → `types/sidebar/`
  - 移动 `domain/theme/theme.interface.ts` → `types/theme/`
  - 移动 `domain/font/font.interface.ts` → `types/font/`
  - 移动 `domain/save/save.interface.ts` → `types/save/`
  - 移动 `domain/writing/writing.interface.ts` → `types/writing/`
  - 移动 `domain/editor-history/editor-history.interface.ts` → `types/editor-history/`
  - 移动 `domain/diagram/diagram.interface.ts` → `types/diagram/`
  - 移动 `domain/icon-theme/icon-theme.interface.ts` → `types/icon-theme/`
  - 移动 `domain/icon-theme/icon-theme.config.ts` → `types/icon-theme/`

- [x] 13. 创建类型索引
  - 创建 `types/index.ts` 统一导出

## Phase 3: 纯函数层创建

- [x] 14. 创建 Node 纯函数
  - 移动 `db/models/node/node.utils.ts` → `fn/node/node.tree.fn.ts`
  - 重构使用 fp-ts pipe
  - 创建 `fn/node/node.tree.fn.test.ts`
  - 创建 `fn/node/index.ts`

- [x] 15. 创建 Search 纯函数
  - 移动 `domain/search/search.utils.ts` → `fn/search/search.highlight.fn.ts`
  - 创建 `fn/search/search.filter.fn.ts`
  - 创建测试文件
  - 创建 `fn/search/index.ts`

- [x] 16. 创建 Date 纯函数（通用日期模块）
  - 从 `fn/diary/diary.date.fn.ts` 提取 → `fn/date/date.chinese.fn.ts`
  - 创建 `fn/date/date.folder.fn.ts`（日期目录结构生成）
  - 创建 `fn/date/date.chinese.fn.test.ts`
  - 创建 `fn/date/date.folder.fn.test.ts`
  - 创建 `fn/date/index.ts`

- [x] 17. 创建 Content 模板纯函数
  - 创建 `fn/content/content.template.fn.ts`（模板配置 + 文件结构生成）
  - 创建 `fn/content/content.generate.fn.ts`（Lexical JSON 内容生成）
  - 支持四种模板：diary、todo、ledger、wiki
  - 统一目录结构：`{Root}/year-YYYY-{Zodiac}/month-MM-{Month}/day-DD-{Weekday}/{prefix}-{timestamp}`
  - 创建 `fn/content/content.template.fn.test.ts`
  - 创建 `fn/content/content.generate.fn.test.ts`
  - 创建 `fn/content/index.ts`

- [x] 18. 删除旧 Diary 模块
  - 删除 `fn/diary/` 目录
  - 更新 `domain/diary/diary.service.ts` 使用 `fn/date/` 和 `fn/content/`

- [x] 19. 创建 Export 纯函数（单文件导出）
  - 创建 `fn/export/export.orgmode.fn.ts`（Lexical JSON → Org-mode，完整支持）
  - 创建 `fn/export/export.markdown.fn.ts`（Lexical JSON → Markdown，完整支持）
  - 创建 `fn/export/export.json.fn.ts`（原始 JSON 导出）
  - 创建 `fn/export/export.orgmode.fn.test.ts`
  - 创建 `fn/export/export.markdown.fn.test.ts`
  - 创建 `fn/export/export.json.fn.test.ts`
  - 创建 `fn/export/index.ts`
  - TODO: 全局导出（暂不实现，预留接口 `exportWorkspace`）

- [x] 20. 创建 Import 纯函数（单文件导入）
  - 创建 `fn/import/import.markdown.fn.ts`（Markdown → Lexical JSON）
  - 创建 `fn/import/import.markdown.fn.test.ts`
  - 创建 `fn/import/index.ts`
  - TODO: 批量导入（暂不实现，预留接口 `importDirectory`）

- [x] 21. 创建 Tag 纯函数
  - 移动 `db/models/tag/tag.utils.ts` → `fn/tag/tag.extract.fn.ts`
  - 创建测试文件
  - 创建 `fn/tag/index.ts`

- [x] 22. 创建其他纯函数
  - 移动 `domain/theme/theme.utils.ts` → `fn/theme/theme.fn.ts`
  - 移动 `domain/icon-theme/icon-theme.utils.ts` → `fn/icon-theme/icon-theme.fn.ts`
  - 移动 `domain/writing/writing.utils.ts` → `fn/writing/writing.fn.ts`
  - 移动 `domain/save/save.utils.ts` → `fn/save/save.debounce.fn.ts`
  - 移动 `domain/editor-tabs/editor-tabs.utils.ts` → `fn/editor-tab/editor-tab.fn.ts`
  - 移动 `domain/editor-history/editor-history.utils.ts` → `fn/editor-history/editor-history.fn.ts`
  - 移动 `domain/diagram/diagram.utils.ts` → `fn/diagram/diagram.fn.ts`
  - 创建测试文件

- [x] 23. 创建纯函数索引
  - 创建 `fn/index.ts` 统一导出

## Phase 4: 数据库层重构

- [x] 24. 重构 Node 数据库函数
  - 重构 `db/models/node/node.repository.ts` → `db/node.db.fn.ts`
  - 使用 TaskEither 返回类型
  - 添加日志记录
  - 创建测试文件

- [x] 25. 重构 Workspace 数据库函数
  - 重构 `db/models/workspace/workspace.repository.ts` → `db/workspace.db.fn.ts`
  - 使用 TaskEither 返回类型
  - 添加日志记录

- [x] 26. 重构 Content 数据库函数
  - 重构 `db/models/content/content.repository.ts` → `db/content.db.fn.ts`
  - 使用 TaskEither 返回类型
  - 添加日志记录

- [x] 27. 重构 Drawing 数据库函数
  - 重构 `db/models/drawing/drawing.repository.ts` → `db/drawing.db.fn.ts`
  - 使用 TaskEither 返回类型
  - 添加日志记录

- [x] 28. 重构其他数据库函数
  - 重构 `db/models/attachment/attachment.repository.ts` → `db/attachment.db.fn.ts`
  - 重构 `db/models/user/user.repository.ts` → `db/user.db.fn.ts`
  - 重构 `db/models/tag/tag.repository.ts` → `db/tag.db.fn.ts`

- [x] 29. 重构数据库服务
  - 重构 `db/backup/backup.service.ts` → `db/backup.db.fn.ts`
  - 重构 `db/clear-data/clear-data.service.ts` → `db/clear-data.db.fn.ts`
  - 重构 `db/init/db-init.service.ts` → `db/init.db.fn.ts`

- [x] 30. 更新数据库索引
  - 更新 `db/index.ts` 导出新函数

## Phase 5: 状态层迁移

- [x] 31. 迁移 Selection Store
  - 移动 `domain/selection/selection.store.ts` → `stores/selection.store.ts`
  - 确保使用 Immer
  - 添加日志记录

- [x] 32. 迁移 Editor Tabs Store
  - 移动 `domain/editor-tabs/editor-tabs.store.ts` → `stores/editor-tabs.store.ts`
  - 确保使用 Immer
  - 添加日志记录

- [x] 33. 迁移 UI Store
  - 移动 `domain/ui/ui.store.ts` → `stores/ui.store.ts`
  - 确保使用 Immer
  - 添加日志记录

- [x] 34. 迁移其他 Stores
  - 移动 `domain/sidebar/sidebar.store.ts` → `stores/sidebar.store.ts`
  - 移动 `domain/theme/theme.store.ts` → `stores/theme.store.ts`
  - 移动 `domain/font/font.store.ts` → `stores/font.store.ts`
  - 移动 `domain/save/save.store.ts` → `stores/save.store.ts`
  - 移动 `domain/writing/writing.store.ts` → `stores/writing.store.ts`
  - 移动 `domain/editor-history/editor-history.store.ts` → `stores/editor-history.store.ts`
  - 移动 `domain/diagram/diagram.store.ts` → `stores/diagram.store.ts`
  - 移动 `domain/icon-theme/icon-theme.store.ts` → `stores/icon-theme.store.ts`

- [x] 35. 创建 Stores 索引
  - 创建 `stores/index.ts` 统一导出

## Phase 6: Hooks 层整合

- [x] 36. 整合 Node Hooks
  - 移动 `db/models/node/node.hooks.ts` → `hooks/use-node.ts`
  - 整合相关 hooks

- [x] 37. 整合 Workspace Hooks
  - 移动 `db/models/workspace/workspace.hooks.ts` → `hooks/use-workspace.ts`

- [x] 38. 整合 Content Hooks
  - 移动 `db/models/content/content.hooks.ts` → `hooks/use-content.ts`

- [x] 39. 整合 Drawing Hooks
  - 移动 `db/models/drawing/drawing.hooks.ts` → `hooks/use-drawing.ts`
  - 整合 `hooks/use-drawing-workspace.ts`

- [x] 40. 整合其他 Hooks
  - 移动 `db/models/attachment/attachment.hooks.ts` → `hooks/use-attachment.ts`
  - 移动 `db/models/user/user.hooks.ts` → `hooks/use-user.ts`
  - 移动 `db/models/tag/tag.hooks.ts` → `hooks/use-tag.ts`
  - 整合 `hooks/use-manual-save.ts` → `hooks/use-save.ts`

- [x] 41. 创建 Hooks 索引
  - 创建 `hooks/index.ts` 统一导出  

## Phase 7: Actions 层创建

- [x] 42. 创建 Node Actions
  - 创建 `routes/actions/create-node.action.ts`
  - 创建 `routes/actions/delete-node.action.ts`
  - 创建 `routes/actions/move-node.action.ts`
  - 创建 `routes/actions/rename-node.action.ts`
  - 创建 `routes/actions/reorder-node.action.ts`
  - 创建测试文件
  - 创建 `routes/actions/index.ts`

- [x] 43. 创建 Workspace Actions
  - 创建 `routes/actions/create-workspace.action.ts`
  - 创建 `routes/actions/delete-workspace.action.ts`
  - 创建 `routes/actions/update-workspace.action.ts`
  - 创建测试文件

- [x] 44. 创建 Export Actions（单文件导出）
  - 创建 `routes/actions/export-orgmode.action.ts`
  - 创建 `routes/actions/export-markdown.action.ts`
  - 创建 `routes/actions/export-json.action.ts`
  - 创建测试文件
  - TODO: `export-workspace.action.ts`（全局导出，暂不实现）

- [x] 45. 创建 Import Actions（单文件导入）
  - 创建 `routes/actions/import-markdown.action.ts`
  - 创建测试文件
  - TODO: `import-directory.action.ts`（批量导入，暂不实现）

- [x] 46. 创建 Settings Actions
  - 创建 `routes/settings/actions/update-theme.action.ts`
  - 创建 `routes/settings/actions/update-font.action.ts`
  - 创建 `routes/settings/actions/index.ts`

## Phase 8: 组件纯化

- [x] 47. 纯化 FileTree 组件
  - 移除直接 Store 访问
  - 添加 props 接口
  - 更新路由组件传递数据

- [x] 48. 纯化 Editor 组件
  - 移除直接 Store 访问
  - 添加 props 接口

- [x] 49. 纯化 Sidebar 组件
  - 移除直接 Store 访问
  - 添加 props 接口

- [x] 50. 审查未使用组件（保留待后续处理）
  - [x] 50.1 `word-count-badge.tsx` - 已纯化并集成，支持中英文统计
  - 以下组件暂时保留，待后续单独审查：
    - `focus-mode.tsx` - 专注模式
    - `writing-stats-panel.tsx` - 写作统计面板
    - `auto-save-indicator.tsx` - 自动保存指示器
    - `multi-select.tsx` - 多选组件
    - `emptyProject.tsx` - 空项目提示
    - `createBookDialog.tsx` - 创建书籍对话框
    - `drawing-list.tsx` - 绘图列表
    - `drawing-manager.tsx` - 绘图管理器
    - `multi-editor-workspace.tsx` - 多编辑器工作空间
    - `export-button.tsx` - 导出按钮
    - `settings-nav.tsx` - 设置导航
    - `icon-picker.tsx` - 图标选择器
    - `search-sidebar.tsx` - 搜索侧边栏
    - `icon-theme-preview.tsx` - 图标主题预览
    - `global-search-dialog.tsx` - 全局搜索对话框
    - `global-search-provider.tsx` - 全局搜索提供者
    - `new-node-dialog.tsx` - 新建节点对话框
    - `rename-node-dialog.tsx` - 重命名节点对话框
    - `test-selection.tsx` - 测试选择组件

## Phase 10: 组件架构规范化

- [x] 56. 重构 ActivityBar 组件
  - 拆分为路由组件 + 纯展示组件
  - 创建 `routes/_layout.route.tsx` 作为编排层
  - 重构 `components/activity-bar.tsx` 为纯展示组件
  - 定义 ActivityBarProps 接口（workspaces, selectedWorkspaceId, callbacks）
  - 移除组件内部的 Store/DB 直接访问

- [x] 57. 重构 FocusMode 组件
  - 移除 `useWritingStore` 直接访问
  - 通过 props 传入写作状态和回调函数
  - 定义 FocusModeProps 接口

- [x] 58. 重构 WritingStatsPanel 组件
  - 移除 `useWritingStore` 直接访问
  - 通过 props 传入统计数据和设置回调
  - 定义 WritingStatsPanelProps 接口

- [x] 59. 重构 BackupManager 组件
  - 移除 services 直接调用
  - 通过 props 传入数据和回调
  - 提取 formatBytes 到 fn/format/
  - 迁移类型到 types/backup/ 和 types/storage/
  - 路由组件已实现数据编排

- [x] 60. 重构 Panel 组件
  - 重构 `drawings-panel.tsx` - 通过 props 接收 workspaceId 和 drawings
  - 重构 `tag-graph-panel.tsx` - 通过 props 接收数据
  - 定义各 Panel 的 Props 接口

- [x] 61. 重构 CommandPalette 组件
  - 移除 Store/DB 直接访问
  - 通过 props 接收 workspaces 和 selectedWorkspaceId
  - 定义 CommandPaletteProps 接口

- [x] 62. 重构 ExportDialogManager 组件
  - 移除 Store/DB 直接访问
  - 通过 props 接收数据
  - 定义 ExportDialogManagerProps 接口

- [x] 63. 重构其他组件
  - `wiki-hover-preview.tsx` - 通过 props 传入预加载数据或回调
  - `global-search.tsx` - 通过 props 传入搜索函数

## Phase 9: Import 路径更新与错误收集

- [x] 51. 更新 Import 路径
  - 更新所有文件的 import 路径
  - 运行 TypeScript 检查

- [x] 52. 运行代码并收集错误
  - [x] 52.1 运行开发服务器
    - 执行 `bun run desktop:dev`
    - 记录启动错误
    - **结果：** ❌ 无法启动 - 模块解析失败
    - **主要错误：** `@/db/models` 和 `@/services/export` 无法解析
  - [x] 52.2 运行类型检查
    - 执行 `bun run check` + `bunx tsc --noEmit`
    - 记录类型错误
    - **结果：** 95 个 TypeScript 错误，83 个 Biome 错误
    - **报告：** 已创建 `TYPE_CHECK_ERRORS.md`
  - [x] 52.3 运行代码检查
    - 执行 `bun run lint`
    - 记录 lint 错误
    - **结果：** ❌ 83 个错误，77 个警告，5 个信息
    - **报告：** 已创建 `LINT_ERRORS.md`
  - [x] 52.4 运行测试
    - 执行 `bun run test`
    - 记录测试失败
    - 将记录目前的情况在审查目前的task之后，将重要的步骤加入其中。
  - [x] 52.5 整合错误报告
    - 创建 `REFACTOR_ERRORS.md` 和 `TYPE_CHECK_ERRORS.md`
    - 按模块分类错误
    - 标注错误优先级
    - **完成：** 已创建两份详细错误报告

- [x] 53. 对比 Steering 规范
  - [x] 53.1 检查架构符合性
    - 对比 `architecture.md`
    - 检查数据流是否符合规范
    - 检查目录结构是否正确
  - [x] 53.2 检查代码规范符合性
    - 对比 `code-standards.md`
    - 检查函数式编程使用
    - 检查命名规范
    - 检查日志使用
  - [x] 53.3 检查文件结构符合性
    - 对比 `structure.md`
    - 检查文件命名
    - 检查依赖关系
  - [x] 53.4 生成符合性报告
    - 创建 `ARCHITECTURE_COMPLIANCE.md`
    - 列出不符合项
    - 提供修复建议

- [x] 54. 更新任务列表
  - 根据错误报告添加修复任务
  - 根据符合性报告添加改进任务
  - 更新任务优先级
  - 估算剩余工作量
  - **完成：** 已根据 REFACTOR_ERRORS.md、TYPE_CHECK_ERRORS.md、LINT_ERRORS.md、ARCHITECTURE_COMPLIANCE.md 和 TEST_RESULTS.md 更新任务列表
  - **新增任务：** Phase 11-16（共 38 个任务）
  - **预计剩余工作量：** 10-12 小时

## Phase 11: 紧急修复（阻止启动的错误）

**说明：** 这些错误必须修复才能让应用运行起来

### 11.1 关键错误修复（预计 1.5 小时）

- [x] 64. 修复 DrawingBuilder 只读属性错误
  - 将 `private data: DrawingInterface` 改为 `private data: Partial<DrawingInterface>`
  - 文件：`src/types/drawing/drawing.builder.ts`
  - 影响：13 个类型错误
  - 预计时间：5分钟
  - 优先级：🔴 最高
  - ✅ 已完成

- [x] 65. 批量更新 `@/db/models` 导入路径（✅ 已完成）
  - 使用查找替换功能批量更新
  - 影响文件（16个）：
    - `src/domain/diary/diary.service.ts`
    - `src/domain/export/export.service.ts`
    - `src/domain/export/export.utils.ts`
    - `src/domain/file-creator/file-creator.service.ts`
    - `src/domain/import-export/import-export.service.ts`
    - `src/domain/save/save.service.ts`
    - `src/domain/search/search.service.ts`
    - `src/domain/wiki/wiki-migration.service.ts`
    - `src/domain/wiki/wiki.service.ts`
    - `src/services/__tests__/drawings.property.test.ts`
    - `src/services/drawings.ts`
    - `src/services/drawings.utils.ts`
    - `src/services/nodes.ts`
    - `src/services/tags.ts`
    - `src/services/workspaces.ts`
    - `src/components/workspace/story-workspace.tsx`
  - 替换规则：
    - `@/db/models` → 根据具体导入的类型替换为 `@/types/node`, `@/types/workspace` 等
  - 预计时间：15分钟
  - 优先级：🔴 最高

### 11.2 Services 模块迁移（预计 3-4 小时）

- [x] 66. 迁移 services/export 模块
  - 分析 `services/export.ts` 的功能
  - 决定迁移目标：`fn/export/` 或 `routes/actions/`
  - 创建新的纯函数文件
  - 更新所有引用此模块的文件
  - 影响文件：
    - `src/components/blocks/export-dialog.tsx`
    - `src/components/export/export-button.tsx`
    - `src/routes/settings/export.tsx`
  - 预计时间：1小时
  - 优先级：🔴 高

- [x] 67. 迁移 services/import-export 模块
  - 拆分为 `fn/import/` 和 `fn/export/`
  - 创建纯函数文件
  - 更新所有引用
  - 影响文件：
    - `src/components/blocks/export-dialog.tsx`
  - 预计时间：1小时
  - 优先级：🔴 高

- [x] 68. 迁移 services/save 模块
  - 迁移到 `fn/save/`
  - 确保符合纯函数规范
  - 更新引用：`src/hooks/use-manual-save.ts`, `src/components/workspace/story-workspace.tsx`
  - 预计时间：30分钟
  - 优先级：🔴 高

- [x] 69. 迁移 services/wiki-files 模块
  - 迁移到 `fn/wiki/`
  - 更新引用：`src/components/workspace/story-workspace.tsx`
  - 预计时间：30分钟
  - 优先级：🔴 高

- [x] 70. 迁移 services/keyboard-shortcuts 模块
  - 迁移到 `fn/keyboard/`
  - 更新所有引用：`src/hooks/use-manual-save.ts`
  - 预计时间：30分钟
  - 优先级：🔴 高

- [x] 71. 迁移 services/export-path 模块
  - 合并到 `fn/export/`
  - 更新所有引用：`src/routes/settings/export.tsx`
  - 预计时间：15分钟
  - 优先级：🔴 高

### 11.3 组件修复（预计 30 分钟）

- [x] 72. 修复 WikiHoverPreview 组件使用
  - 在 `story-workspace.tsx` 中添加 `onFetchData` 回调
  - 实现数据获取逻辑
  - 预计时间：15分钟
  - 优先级：🔴 高

- [x] 73. 修复测试文件类型错误
  - 统一使用 `createDate` 而非 `createdAt`
  - 修复 UserPlan 类型使用
  - 影响文件：
    - `src/db/drawing.db.fn.test.ts`
    - `src/db/tag.db.fn.test.ts`
    - `src/db/user.db.fn.test.ts`
    - `src/fn/tag/tag.extract.fn.test.ts`
  - 预计时间：20分钟
  - 优先级：🟡 中

## Phase 12: Lint 警告修复

**说明：** 这些是代码质量问题，不阻止运行但应该修复

### 12.1 关键 Lint 错误（预计 1 小时）

- [x] 74. 修复 `useIterableCallbackReturn` 错误（7 个）
  - 使用 `TE.tap()` 替代 `TE.map()` 用于副作用操作
  - 影响文件：
    - `src/db/node.db.fn.ts` (3 处)
    - `src/routes/settings/actions/update-font.action.ts` (1 处)
    - `src/routes/settings/actions/update-theme.action.ts` (3 处)
  - 预计时间：30分钟
  - 优先级：🔴 高

- [x] 75. 移除未使用的导入（2 个）
  - `src/components/blocks/emptyProject.tsx`
  - 移除 `ArrowUpRightIcon` 和 `CalendarCheck`
  - 预计时间：2分钟
  - 优先级：🟢 低

- [x] 76. 使用模板字符串替代字符串拼接
  - `src/components/activity-bar.tsx:292`
  - 将 `path + "/"` 改为 `` `${path}/` ``
  - 预计时间：2分钟
  - 优先级：🟢 低

### 12.2 可访问性修复（预计 2 小时）

- [x] 77. 修复 `useButtonType` 错误（20+ 个）
  - 为所有 `<button>` 元素添加 `type="button"`
  - 影响文件：
    - `src/components/blocks/theme-selector.tsx` (2 处)
    - `src/components/buffer-switcher.tsx` (1 处)
    - `src/components/editor-tabs.tsx` (2 处)
    - `src/components/file-tree/file-tree-item.tsx` (2 处)
    - `src/components/file-tree/file-tree.tsx` (2 处)
    - `src/components/panels/drawings-panel.tsx` (1 处)
    - `src/components/panels/search-panel.tsx` (1 处)
    - `src/components/search-sidebar.tsx` (1 处)
    - `src/components/story-right-sidebar.tsx` (1 处)
    - `src/components/test-selection.tsx` (2 处)
    - `src/routes/settings/design.tsx` (2 处)
    - `src/routes/settings/editor.tsx` (1 处)
    - `src/routes/settings/icons.tsx` (1 处)
    - `src/routes/settings/typography.tsx` (3 处)
  - 预计时间：30分钟
  - 优先级：🟡 中

- [x] 78. 修复 `noLabelWithoutControl` 错误（2 个）
  - 为 label 添加 `htmlFor` 属性
  - 影响文件：
    - `src/components/blocks/export-dialog.tsx:165`
    - `src/routes/test-manual-save.tsx:114`
  - 预计时间：5分钟
  - 优先级：🟡 中

- [x] 79. 修复 `useValidAnchor` 错误（4 个）
  - 使用有效的 href 或改用 button
  - 影响文件：
    - `src/components/test-selection.tsx:99`
    - `src/routes/test-focus.tsx` (3 处)
  - 预计时间：10分钟
  - 优先级：🟡 中

- [x] 80. 修复 `noStaticElementInteractions` 错误（5 个）
  - 使用语义化元素或添加 role
  - 影响文件：
    - `src/components/file-tree/file-tree-item.tsx` (2 处)
    - `src/components/file-tree/file-tree.tsx` (1 处)
    - `src/components/panels/drawings-panel.tsx` (1 处)
  - 预计时间：20分钟
  - 优先级：🟡 中

- [x] 81. 修复 `useKeyWithClickEvents` 错误（5 个）
  - 添加键盘事件处理
  - 影响文件：
    - `src/components/file-tree/file-tree-item.tsx` (1 处)
    - `src/components/file-tree/file-tree.tsx` (1 处)
    - `src/components/panels/drawings-panel.tsx` (1 处)
    - `src/components/story-right-sidebar.tsx` (1 处)
  - 预计时间：20分钟
  - 优先级：🟡 中

### 12.2.1 Domain/Services 依赖清理（预计 4-5 小时）

**说明：** 以下任务用于清理对 `domain/` 和 `services/` 目录的依赖，为最终删除这些目录做准备。

#### Domain 依赖分析

| 模块 | 引用数 | 状态 | 迁移目标 |
|------|--------|------|----------|
| `domain/search` | 6 | 🔴 需迁移 | `fn/search/` + `stores/search.store.ts` |
| `domain/font` | 4 | 🔴 需迁移 | `types/font/` + `stores/font.store.ts` |
| `domain/file-creator` | 3 | 🔴 需迁移 | `routes/actions/` |
| `domain/diary` | 2 | 🔴 需迁移 | `fn/diary/` + `routes/actions/` |
| `domain/editor-tabs` | 2 | 🔴 需迁移 | `types/editor-tab/` |
| `domain/export` | 2 | 🔴 需迁移 | `fn/export/` |
| `domain/icon-theme` | 2 | 🔴 需迁移 | `fn/icon-theme/` + `stores/icon-theme.store.ts` |
| `domain/sidebar` | 2 | 🔴 需迁移 | `stores/sidebar.store.ts` |
| `domain/ui` | 2 | 🔴 需迁移 | `stores/ui.store.ts` |
| `domain/wiki` | 2 | 🔴 需迁移 | `fn/wiki/` |
| `domain/diagram` | 1 | 🔴 需迁移 | `stores/diagram.store.ts` |
| `domain/theme` | 1 | 🔴 需迁移 | `stores/theme.store.ts` |
| `domain/updater` | 1 | 🔴 需迁移 | `fn/updater/` |
| `domain/editor-history` | 0 | ✅ 可删除 | - |
| `domain/import-export` | 0 | ✅ 可删除 | - |
| `domain/keyboard` | 0 | ✅ 可删除 | - |
| `domain/save` | 0 | ✅ 可删除 | - |
| `domain/selection` | 0 | ✅ 可删除 | - |
| `domain/writing` | 0 | ✅ 可删除 | - |

#### Services 依赖分析

| 文件 | 引用数 | 状态 | 迁移目标 |
|------|--------|------|----------|
| `services/drawings` | 4 | 🔴 需迁移 | `db/drawing.db.fn.ts` + `hooks/use-drawing.ts` |
| `services/nodes` | 4 | 🔴 需迁移 | `db/node.db.fn.ts` + `hooks/use-node.ts` |
| `services/export` | 2 | 🔴 需迁移 | `fn/export/` |
| `services/updater` | 1 | 🔴 需迁移 | `fn/updater/` |
| `services/clear-data` | 1 | 🔴 需迁移 | `db/clear-data.db.fn.ts` |
| `services/index.ts` | 0 | ✅ 可删除 | - |
| `services/drawings.utils.ts` | 0 | ✅ 可删除 | - |
| `services/export-path.ts` | 0 | ✅ 可删除 | - |
| `services/import-export.ts` | 0 | ✅ 可删除 | - |
| `services/tags.ts` | 0 | ✅ 可删除 | - |
| `services/workspaces.ts` | 0 | ✅ 可删除 | - |

- [x] 81.1 迁移 `@/domain/search` 依赖（6 处）
  - 影响文件：
    - `src/components/blocks/global-search-connected.tsx` - searchEngine
    - `src/components/global-search-dialog-connected.tsx` - searchEngine
    - `src/components/panels/search-panel.tsx` - 多个导出
    - `src/components/search-sidebar.tsx` - 多个导出
    - `src/services/__tests__/search.property.test.ts` - search.utils
    - `src/services/index.ts` - re-export
  - 迁移方案：
    - `searchEngine` → `fn/search/search.engine.fn.ts`
    - `search.utils` → `fn/search/search.highlight.fn.ts`
    - Store 相关 → `stores/search.store.ts`
  - 预计时间：45分钟
  - 优先级：🔴 高

- [x] 81.2 迁移 `@/domain/font` 依赖（4 处）
  - 影响文件：
    - `src/components/font-style-injector.tsx`
    - `src/lib/font-config.ts`
    - `src/routes/settings/editor.tsx`
    - `src/routes/settings/typography.tsx`
  - 迁移方案：
    - 常量 → `types/font/font.config.ts`
    - Store → `stores/font.store.ts`（已存在）
  - 预计时间：30分钟
  - 优先级：🔴 高

- [x] 81.3 迁移 `@/domain/file-creator` 依赖（3 处）
  - 影响文件：
    - `src/domain/diary/diary.service.ts` - createFileInTree
    - `src/domain/wiki/wiki.service.ts` - createFileInTree, ensureRootFolder
    - `src/services/index.ts` - re-export
  - 迁移方案：
    - `createFileInTree` → `routes/actions/create-node.action.ts`
    - `ensureRootFolder` → `routes/actions/ensure-folder.action.ts`
  - 预计时间：30分钟
  - 优先级：🔴 高

- [x] 81.4 迁移 `@/domain/sidebar` 依赖（2 处）✅ 已完成
  - 影响文件：
    - `src/routes/canvas.tsx` - useUnifiedSidebarStore ✅
    - `src/routes/__root.tsx` - useUnifiedSidebarStore ✅
  - 迁移方案：
    - `useUnifiedSidebarStore` → `stores/sidebar.store.ts`（已存在）
  - 完成时间：已完成
  - 优先级：🔴 高
  - 说明：两个文件都已正确导入 `@/stores/sidebar.store`，且 store 提供了向后兼容的 `useUnifiedSidebarStore` 导出

- [x] 81.5 迁移 `@/domain/ui` 依赖（2 处）
  - 影响文件：
    - `src/components/workspace/story-workspace.tsx` - useUIStore
    - `src/routes/settings/general.tsx` - TabPosition, useUIStore
  - 迁移方案：
    - `useUIStore` → `stores/ui.store.ts`（已存在）
    - `TabPosition` → `types/ui/ui.interface.ts`（已存在）
  - 预计时间：15分钟
  - 优先级：🔴 高

- [x] 81.6 迁移 `@/domain/wiki` 依赖（2 处）
  - 影响文件：
    - `src/components/workspace/story-workspace.tsx` - useWikiFiles
    - `src/services/index.ts` - re-export
  - 迁移方案：
    - `useWikiFiles` → `hooks/use-wiki.ts`
    - Wiki 服务 → `fn/wiki/`
  - 预计时间：20分钟
  - 优先级：🔴 高

- [x] 81.7 迁移 `@/domain/icon-theme` 依赖（2 处）
  - 影响文件：
    - `src/components/icon-theme-preview.tsx` - getCurrentIconTheme
    - `src/routes/settings/icons.tsx` - 多个导出
  - 迁移方案：
    - `getCurrentIconTheme` → `fn/icon-theme/icon-theme.fn.ts`
    - Store → `stores/icon-theme.store.ts`（已存在）
  - 预计时间：20分钟
  - 优先级：🔴 高

- [x] 81.8 迁移 `@/domain/editor-tabs` 依赖（2 处）
  - 影响文件：
    - `src/components/buffer-switcher.tsx` - EditorTab type
    - `src/components/workspace/multi-editor-workspace.tsx` - EditorInstanceState, EditorTab
  - 迁移方案：
    - 类型 → `types/editor-tab/`（已存在）
  - 预计时间：10分钟
  - 优先级：🔴 高

- [x] 81.9 迁移 `@/domain/export` 依赖（2 处）
  - 影响文件：
    - `src/services/export.ts` - 多个导出
    - `src/services/index.ts` - re-export
  - 迁移方案：
    - 导出函数 → `fn/export/`（已存在）
  - 预计时间：15分钟
  - 优先级：🔴 高

- [x] 81.10 迁移 `@/domain/diary` 依赖（2 处）
  - 影响文件：
    - `src/components/panels/file-tree-panel.tsx` - createDiaryInFileTree
    - `src/services/index.ts` - re-export
  - 迁移方案：
    - `createDiaryInFileTree` → `routes/actions/create-diary.action.ts`
  - 预计时间：20分钟
  - 优先级：🔴 高

- [x] 81.11 迁移 `@/domain/diagram` 依赖（1 处）
  - 影响文件：
    - `src/routes/settings/diagrams.tsx` - useDiagramSettings
  - 迁移方案：
    - `useDiagramSettings` → `stores/diagram.store.ts`（已存在）
  - 预计时间：10分钟
  - 优先级：🟡 中

- [x] 81.12 迁移 `@/domain/theme` 依赖（1 处）
  - 影响文件：
    - `src/hooks/use-theme.ts` - 多个导出
  - 迁移方案：
    - Store → `stores/theme.store.ts`（已存在）
    - 类型 → `types/theme/`（已存在）
  - 预计时间：15分钟
  - 优先级：🟡 中

- [x] 81.13 迁移 `@/domain/updater` 依赖（1 处）
  - 影响文件：
    - `src/services/index.ts` - re-export
  - 迁移方案：
    - 更新服务 → `fn/updater/`
  - 预计时间：10分钟
  - 优先级：🟡 中

- [x] 81.14 迁移 `@/services/drawings` 依赖（4 处）
  - 影响文件：
    - `src/routes/canvas.tsx` - useDrawingById
    - `src/routes/__root.tsx` - createDrawing, deleteDrawing
    - `src/components/drawing/drawing-workspace.tsx` - 多个导出
    - `src/components/drawing/drawing-list.tsx` - 多个导出
  - 迁移方案：
    - Hooks → `hooks/use-drawing.ts`（已存在）
    - CRUD → `db/drawing.db.fn.ts`（已存在）
    - Actions → `routes/actions/`
  - 预计时间：30分钟
  - 优先级：🔴 高

- [x] 81.15 迁移 `@/services/nodes` 依赖（4 处）
  - 影响文件：
    - `src/components/panels/file-tree-panel.tsx` - 多个导出
    - `src/components/blocks/wiki-hover-preview-connected.tsx` - getNode, getNodeContent
    - `src/components/file-tree/file-tree-item.tsx` - TreeNode type
    - `src/components/workspace/story-workspace.tsx` - getNodeContent
  - 迁移方案：
    - 类型 → `fn/node/node.tree.fn.ts`（TreeNode 已存在）
    - Hooks → `hooks/use-node.ts`（已存在）
    - 函数 → `db/node.db.fn.ts`（已存在）
  - 预计时间：30分钟
  - 优先级：🔴 高

- [x] 81.16 迁移 `@/services/export` 依赖（2 处）
  - 影响文件：
    - `src/components/blocks/export-dialog.tsx` - 多个导出
    - `src/components/export/export-button.tsx` - ExportFormat, exportProject
  - 迁移方案：
    - 导出函数 → `fn/export/`（已存在）
    - 类型 → `types/export/`
  - 预计时间：20分钟
  - 优先级：🔴 高

- [x] 81.17 迁移 `@/services/updater` 依赖（1 处）
  - 影响文件：
    - `src/components/blocks/update-checker.tsx` - 多个导出
  - 迁移方案：
    - 更新服务 → `fn/updater/`
  - 预计时间：15分钟
  - 优先级：🟡 中

- [x] 81.18 迁移 `@/services/clear-data` 依赖（1 处）
  - 影响文件：
    - `src/routes/test-clear-data.tsx` - 多个导出
  - 迁移方案：
    - 清理函数 → `db/clear-data.db.fn.ts`（已存在）
  - 预计时间：10分钟
  - 优先级：🟡 中

- [ ] 81.19 删除无引用的 domain 模块
  - 可删除模块：
    - `domain/editor-history/` - 0 引用
    - `domain/import-export/` - 0 引用
    - `domain/keyboard/` - 0 引用
    - `domain/save/` - 0 引用
    - `domain/selection/` - 0 引用
    - `domain/writing/` - 0 引用
  - 预计时间：5分钟
  - 优先级：🟢 低

- [ ] 81.20 删除无引用的 services 文件
  - 可删除文件：
    - `services/drawings.utils.ts` - 0 引用
    - `services/export-path.ts` - 0 引用
    - `services/import-export.ts` - 0 引用
    - `services/tags.ts` - 0 引用
    - `services/workspaces.ts` - 0 引用
  - 预计时间：5分钟
  - 优先级：🟢 低

- [ ] 81.21 更新 `services/index.ts` 重新导出
  - 移除对已迁移模块的 re-export
  - 添加对新位置的 re-export（向后兼容）
  - 预计时间：15分钟
  - 优先级：🟡 中

### 12.3 React 最佳实践（预计 1 小时）

- [x] 82. 修复 `useExhaustiveDependencies` 错误（5 个）
  - 添加缺失的依赖项到依赖数组
  - 影响文件：
    - `src/components/blocks/update-checker.tsx:83`
    - `src/components/editor-tabs.tsx:89`
    - `src/components/editor-tabs.tsx:95`
    - `src/components/panels/file-tree-panel.tsx:69`
  - 预计时间：20分钟
  - 优先级：🟡 中

- [x] 83. 修复 `noArrayIndexKey` 错误（4 个）
  - 使用唯一 ID 而非数组索引作为 key
  - 影响文件：
    - `src/components/blocks/keyboard-shortcuts-help.tsx` (2 处)
    - `src/components/panels/search-panel.tsx` (1 处)
    - `src/components/search-sidebar.tsx` (1 处)
  - 预计时间：15分钟
  - 优先级：🟡 中

### 12.4 类型安全（预计 1.5 小时）

- [ ] 84. 修复 `noExplicitAny` 错误（13 个）
  - 定义具体类型或使用 unknown + 类型守卫
  - 影响文件：
    - `src/components/blocks/canvas-editor.tsx` (8 处) - Excalidraw 类型
    - `src/components/devtools-wrapper.tsx` (3 处) - DevTools 类型
  - 预计时间：1小时
  - 优先级：🟡 中

- [ ] 85. 修复隐式 any 类型（30+ 个）
  - 为所有参数添加明确的类型注解
  - 影响文件：多个 domain/ 和 services/ 文件
  - 预计时间：1小时
  - 优先级：🟡 中

## Phase 13: 验证修复结果

- [ ] 86. 运行类型检查
  - 执行 `bun run check`
  - 确认无类型错误
  - 记录剩余错误（如有）
  - 预计时间：5分钟

- [ ] 87. 运行代码检查
  - 执行 `bun run lint`
  - 确认无 lint 错误
  - 记录剩余警告（如有）
  - 预计时间：5分钟

- [ ] 88. 运行测试
  - 执行 `bun run test`
  - 确认所有测试通过
  - 修复失败的测试
  - 预计时间：15分钟

- [ ] 89. 运行开发服务器
  - 执行 `bun run desktop:dev`
  - 确认应用正常启动
  - 测试基本功能
  - 预计时间：10分钟

## Phase 14: 架构符合性检查

- [ ] 90. 检查目录结构
  - 确认所有文件在正确的目录
  - 确认文件命名符合规范
  - 生成目录结构报告
  - 预计时间：20分钟

- [ ] 91. 检查依赖关系
  - 确认依赖方向正确
  - 确认无循环依赖
  - 使用工具检查依赖图
  - 预计时间：20分钟

- [ ] 92. 检查函数式编程使用
  - 确认使用 fp-ts pipe
  - 确认使用 Either 处理错误
  - 确认使用 dayjs 处理时间
  - 确认无 console.log
  - 预计时间：30分钟

- [ ] 93. 生成符合性报告
  - 创建 `ARCHITECTURE_COMPLIANCE.md`
  - 列出不符合项
  - 提供修复建议
  - 预计时间：15分钟

## Phase 15: 代码清理与优化

- [ ] 94. 删除旧目录（在所有错误修复后）
  - 删除 `domain/` 目录
  - 删除 `services/` 目录
  - 删除 `db/models/` 目录

- [ ] 95. 代码质量优化
  - 修复所有剩余 lint 警告
  - 移除所有未使用的导入
  - 移除所有 console.log
  - 统一使用 logger

- [ ] 96. 测试补充
  - 补充缺失的测试文件
  - 确保测试覆盖率达标
  - 修复所有失败的测试

- [ ] 97. 文档更新
  - 更新 README
  - 更新 steering 文档
  - 更新架构文档
  - 创建迁移指南

## Phase 16: 质量保障与性能优化

- [ ] 98. 测试覆盖检查
  - 检查所有 `*.fn.ts` 是否有对应的 `*.fn.test.ts`
  - 检查所有 `*.action.ts` 是否有对应的测试
  - 生成测试覆盖报告

- [ ] 99. Steering 文档同步
  - 更新 `architecture.md` 目录结构示例
  - 更新 `structure.md` 文件路径示例
  - 确保文档与实际代码一致

- [ ] 100. 性能优化实施
  - 为大列表组件添加虚拟列表（FileTree、搜索结果）
  - 为纯展示组件添加 Million.js block
  - 添加 Zustand selector 优化

- [ ] 101. 最终验收
  - 所有测试通过
  - 无类型错误
  - 无 lint 警告
  - 应用正常运行
  - 文档完整更新
  - 性能指标达标

---

## 📊 重构进度总结

**更新时间：** 2025-12-22

### 已完成阶段
- ✅ Phase 1: 基础设施（100%）- 3 个任务
- ✅ Phase 2: 类型层迁移（100%）- 10 个任务
- ✅ Phase 3: 纯函数层创建（100%）- 10 个任务
- ✅ Phase 4: 数据库层重构（100%）- 7 个任务
- ✅ Phase 5: 状态层迁移（100%）- 5 个任务
- ✅ Phase 6: Hooks 层整合（100%）- 6 个任务
- ✅ Phase 7: Actions 层创建（100%）- 5 个任务
- ✅ Phase 8: 组件纯化（100%）- 4 个任务
- ✅ Phase 9: Import 路径更新（100%）- 4 个任务（错误收集完成）
- ✅ Phase 10: 组件架构规范化（100%）- 8 个任务

### 当前阶段
- 🔄 **Phase 12: Lint 警告修复**（进行中）
  - **已完成：** Task 74-81（可访问性修复）
  - **新增：** Task 81.1-81.21（Domain/Services 依赖清理）
  - **待完成：** Task 82-85（React 最佳实践 + 类型安全）

### 待完成阶段
- ⏳ Phase 13: 验证修复结果（0%）- 4 个任务（86-89）
- ⏳ Phase 14: 架构符合性检查（0%）- 4 个任务（90-93）
- ⏳ Phase 15: 代码清理与优化（0%）- 4 个任务（94-97）
- ⏳ Phase 16: 质量保障与性能优化（0%）- 4 个任务（98-101）

### Domain/Services 依赖统计（新增）

#### Domain 模块依赖（19 个模块）
| 状态 | 数量 | 说明 |
|------|------|------|
| 🔴 需迁移 | 13 | 有外部引用，需要更新导入路径 |
| ✅ 可删除 | 6 | 无外部引用，可直接删除 |

**需迁移的 Domain 模块：**
- `search` (6 引用) - 搜索引擎和工具函数
- `font` (4 引用) - 字体配置和 Store
- `file-creator` (3 引用) - 文件创建服务
- `diary` (2 引用) - 日记创建服务
- `editor-tabs` (2 引用) - 编辑器标签类型
- `export` (2 引用) - 导出服务
- `icon-theme` (2 引用) - 图标主题
- `sidebar` (2 引用) - 侧边栏 Store
- `ui` (2 引用) - UI Store
- `wiki` (2 引用) - Wiki 服务
- `diagram` (1 引用) - 图表设置
- `theme` (1 引用) - 主题 Store
- `updater` (1 引用) - 更新服务

**可直接删除的 Domain 模块：**
- `editor-history`, `import-export`, `keyboard`, `save`, `selection`, `writing`

#### Services 文件依赖（10 个文件）
| 状态 | 数量 | 说明 |
|------|------|------|
| 🔴 需迁移 | 5 | 有外部引用，需要更新导入路径 |
| ✅ 可删除 | 5 | 无外部引用，可直接删除 |

**需迁移的 Services 文件：**
- `drawings` (4 引用) - 绘图服务
- `nodes` (4 引用) - 节点服务
- `export` (2 引用) - 导出服务
- `updater` (1 引用) - 更新服务
- `clear-data` (1 引用) - 数据清理

**可直接删除的 Services 文件：**
- `drawings.utils.ts`, `export-path.ts`, `import-export.ts`, `tags.ts`, `workspaces.ts`

### 下一步行动

**完成 Task 81.1-81.21（Domain/Services 依赖清理）**

预计时间：4-5 小时

完成这些任务后，可以安全删除 `domain/` 和 `services/` 目录。

### 架构符合性总结
| 类别 | 符合度 | 状态 |
|------|--------|------|
| 目录结构 | 85% | 🟡 部分符合（domain/, services/ 待删除）|
| 数据流架构 | 80% | 🟡 部分符合（组件仍直接访问 domain/）|
| 函数式编程 | 90% | 🟢 基本符合 |
| 文件命名 | 95% | 🟢 符合 |
| 日志规范 | 60% | 🔴 需改进（40+ 处 console.log）|
| 依赖关系 | 70% | 🟡 部分符合 |


## Phase 17: Actions 目录重构（架构修正）

**说明：** Actions 是业务逻辑层，不应该放在 routes 目录下。routes 目录应该只包含路由定义，不包含业务逻辑。

### 问题分析

当前结构（错误）：
```
src/routes/
├── actions/           # ❌ 错误：业务逻辑不应该在路由目录
│   ├── create-node.action.ts
│   └── ...
└── settings/
```

目标结构（正确）：
```
src/
├── actions/           # ✅ 正确：独立的业务逻辑层
│   ├── node/
│   │   ├── create-node.action.ts
│   │   └── ...
│   ├── workspace/
│   ├── drawing/
│   ├── export/
│   └── index.ts
└── routes/            # 仅路由定义
    ├── __root.tsx
    └── ...
```

### 迁移任务

- [x] 102. 创建新的 actions 目录结构
  - 创建 `src/actions/` 目录
  - 创建子目录：`node/`, `workspace/`, `drawing/`, `export/`, `import/`
  - 预计时间：5分钟
  - 优先级：🔴 高

- [x] 103. 迁移 Node Actions
  - 移动 `routes/actions/create-node.action.ts` → `actions/node/`
  - 移动 `routes/actions/delete-node.action.ts` → `actions/node/`
  - 移动 `routes/actions/rename-node.action.ts` → `actions/node/`
  - 移动 `routes/actions/move-node.action.ts` → `actions/node/`
  - 移动 `routes/actions/reorder-node.action.ts` → `actions/node/`
  - 移动对应的测试文件
  - 创建 `actions/node/index.ts`
  - 预计时间：15分钟
  - 优先级：🔴 高

- [x] 104. 迁移 Workspace Actions
  - 移动 `routes/actions/create-workspace.action.ts` → `actions/workspace/`
  - 移动 `routes/actions/delete-workspace.action.ts` → `actions/workspace/`
  - 移动 `routes/actions/update-workspace.action.ts` → `actions/workspace/`
  - 移动对应的测试文件
  - 创建 `actions/workspace/index.ts`
  - 预计时间：10分钟
  - 优先级：🔴 高

- [x] 105. 迁移 Drawing Actions
  - 移动 `routes/actions/create-drawing.action.ts` → `actions/drawing/`
  - 移动 `routes/actions/delete-drawing.action.ts` → `actions/drawing/`
  - 移动 `routes/actions/rename-drawing.action.ts` → `actions/drawing/`
  - 移动 `routes/actions/save-drawing-content.action.ts` → `actions/drawing/`
  - 移动对应的测试文件
  - 创建 `actions/drawing/index.ts`
  - 预计时间：10分钟
  - 优先级：🔴 高

- [x] 106. 迁移 Export Actions
  - 移动 `routes/actions/export-*.action.ts` → `actions/export/`
  - 包括：export-json, export-markdown, export-orgmode, export-all, export-zip, export-workspace-markdown
  - 移动对应的测试文件
  - 创建 `actions/export/index.ts`
  - 预计时间：10分钟
  - 优先级：🔴 高

- [x] 107. 迁移 Import Actions
  - 移动 `routes/actions/import-*.action.ts` → `actions/import/`
  - 包括：import-json, import-markdown
  - 移动对应的测试文件
  - 创建 `actions/import/index.ts`
  - 预计时间：5分钟
  - 优先级：🔴 高

- [x] 108. 迁移其他 Actions
  - 移动 `routes/actions/create-diary.action.ts` → `actions/diary/`
  - 移动 `routes/actions/ensure-folder.action.ts` → `actions/node/`
  - 创建 `actions/diary/index.ts`
  - 预计时间：5分钟
  - 优先级：🔴 高

- [x] 109. 创建 Actions 统一导出
  - 创建 `actions/index.ts`
  - 导出所有子模块
  - 预计时间：5分钟
  - 优先级：🔴 高

- [ ] 110. 更新所有导入路径
  - 批量替换 `@/routes/actions` → `@/actions`
  - 影响文件：
    - `src/components/panels/file-tree-panel.tsx`
    - `src/components/blocks/export-dialog.tsx`
    - `src/components/drawing/drawing-list.tsx`
    - `src/components/drawing/drawing-workspace.tsx`
    - `src/routes/__root.tsx`
    - `src/routes/canvas.tsx`
    - 其他引用 actions 的文件
  - 预计时间：20分钟
  - 优先级：🔴 高

- [ ] 111. 删除旧的 routes/actions 目录
  - 确认所有文件已迁移
  - 确认所有导入已更新
  - 删除 `routes/actions/` 目录
  - 预计时间：5分钟
  - 优先级：🔴 高

- [ ] 112. 迁移 Settings Actions
  - 移动 `routes/settings/actions/` → `actions/settings/`
  - 更新导入路径
  - 预计时间：10分钟
  - 优先级：🟡 中

- [ ] 113. 验证迁移结果
  - 运行类型检查：`bun run check`
  - 运行测试：`bun run test`
  - 运行开发服务器：`bun run desktop:dev`
  - 确认应用正常运行
  - 预计时间：15分钟
  - 优先级：🔴 高

### 预计总时间：1.5-2 小时

### 迁移文件清单

| 源文件 | 目标位置 |
|--------|----------|
| `routes/actions/create-node.action.ts` | `actions/node/` |
| `routes/actions/delete-node.action.ts` | `actions/node/` |
| `routes/actions/rename-node.action.ts` | `actions/node/` |
| `routes/actions/move-node.action.ts` | `actions/node/` |
| `routes/actions/reorder-node.action.ts` | `actions/node/` |
| `routes/actions/ensure-folder.action.ts` | `actions/node/` |
| `routes/actions/create-workspace.action.ts` | `actions/workspace/` |
| `routes/actions/delete-workspace.action.ts` | `actions/workspace/` |
| `routes/actions/update-workspace.action.ts` | `actions/workspace/` |
| `routes/actions/create-drawing.action.ts` | `actions/drawing/` |
| `routes/actions/delete-drawing.action.ts` | `actions/drawing/` |
| `routes/actions/rename-drawing.action.ts` | `actions/drawing/` |
| `routes/actions/save-drawing-content.action.ts` | `actions/drawing/` |
| `routes/actions/export-json.action.ts` | `actions/export/` |
| `routes/actions/export-markdown.action.ts` | `actions/export/` |
| `routes/actions/export-orgmode.action.ts` | `actions/export/` |
| `routes/actions/export-all.action.ts` | `actions/export/` |
| `routes/actions/export-zip.action.ts` | `actions/export/` |
| `routes/actions/export-workspace-markdown.action.ts` | `actions/export/` |
| `routes/actions/import-json.action.ts` | `actions/import/` |
| `routes/actions/import-markdown.action.ts` | `actions/import/` |
| `routes/actions/create-diary.action.ts` | `actions/diary/` |
| `routes/settings/actions/*` | `actions/settings/` |



## Phase 18: 模板化文件创建重构

**说明：** 将 diary、wiki 等相似的文件创建逻辑抽象为高阶函数，并新增记账模块。

### 问题分析

当前 diary 和 wiki 的创建逻辑几乎相同：
1. 生成模板内容
2. 解析 JSON
3. 调用 createFileInTree
4. 返回 { node, content, parsedContent }

这违反了 DRY 原则，应该抽象为高阶函数。

### 18.1 创建高阶函数

- [ ] 114. 创建模板化文件创建高阶函数
  - 创建 `actions/templated/create-templated-file.action.ts`
  - 定义 `TemplateConfig<T>` 接口
  - 实现 `createTemplatedFile<T>(config)` 高阶函数
  - 创建测试文件
  - 预计时间：30分钟
  - 优先级：🔴 高

- [ ] 115. 创建模板配置目录
  - 创建 `actions/templated/configs/` 目录
  - 创建 `diary.config.ts` - Diary 模板配置
  - 创建 `wiki.config.ts` - Wiki 模板配置
  - 创建 `actions/templated/configs/index.ts`
  - 预计时间：20分钟
  - 优先级：🔴 高

### 18.2 重构现有模块

- [ ] 116. 重构 Diary 创建
  - 使用高阶函数重构 `create-diary.action.ts`
  - 移动到 `actions/templated/create-diary.action.ts`
  - 更新所有导入路径
  - 确保测试通过
  - 预计时间：20分钟
  - 优先级：🔴 高

- [ ] 117. 重构 Wiki 创建
  - 使用高阶函数重构 wiki 创建逻辑
  - 创建 `actions/templated/create-wiki.action.ts`
  - 从 `fn/wiki/wiki.resolve.fn.ts` 移除 `createWikiFileAsync`
  - 更新所有导入路径
  - 确保测试通过
  - 预计时间：20分钟
  - 优先级：🔴 高

### 18.3 新增记账模块

- [ ] 118. 创建记账模板生成函数
  - 创建 `fn/template/template.ledger.fn.ts`
  - 生成记账 Lexical JSON 模板
  - 模板结构：
    - 标签行：#[ledger] #[日期]
    - 标题：日期
    - 收入表格
    - 支出表格
    - 余额汇总
  - 创建测试文件
  - 预计时间：30分钟
  - 优先级：🟡 中

- [ ] 119. 创建记账配置
  - 创建 `actions/templated/configs/ledger.config.ts`
  - 配置：
    - rootFolder: "Ledger"
    - fileType: "file"
    - tag: "ledger"
    - 文件夹结构：Ledger > year-YYYY > month-MM > ledger-YYYY-MM-DD
  - 预计时间：15分钟
  - 优先级：🟡 中

- [ ] 120. 创建记账 Action
  - 创建 `actions/templated/create-ledger.action.ts`
  - 使用高阶函数实例化
  - 导出 `createLedger` 和 `createLedgerAsync`
  - 创建测试文件
  - 预计时间：15分钟
  - 优先级：🟡 中

### 18.4 侧边栏集成

- [ ] 121. 在侧边栏添加记账按钮
  - 在 `components/activity-bar.tsx` 或相关侧边栏组件添加记账图标按钮
  - 使用 Lucide 图标（如 `Wallet` 或 `Receipt`）
  - 点击创建当日记账文件
  - 预计时间：20分钟
  - 优先级：🟡 中

- [ ] 122. 添加记账面板（可选）
  - 创建 `components/panels/ledger-panel.tsx`
  - 显示当月记账列表
  - 显示收支汇总
  - 预计时间：40分钟
  - 优先级：🟢 低

### 18.5 更新导出和索引

- [ ] 123. 更新 actions 索引
  - 更新 `actions/templated/index.ts`
  - 导出所有模板化创建函数
  - 更新 `actions/index.ts`
  - 预计时间：10分钟
  - 优先级：🔴 高

- [ ] 124. 验证重构结果
  - 运行类型检查
  - 运行测试
  - 测试 diary、wiki、ledger 创建功能
  - 预计时间：15分钟
  - 优先级：🔴 高

### 预计总时间：3.5-4 小时

### 文件结构

```
src/actions/
├── templated/
│   ├── create-templated-file.action.ts      # 高阶函数
│   ├── create-templated-file.action.test.ts
│   ├── configs/
│   │   ├── diary.config.ts
│   │   ├── wiki.config.ts
│   │   ├── ledger.config.ts
│   │   └── index.ts
│   ├── create-diary.action.ts               # 实例化
│   ├── create-diary.action.test.ts
│   ├── create-wiki.action.ts                # 实例化
│   ├── create-wiki.action.test.ts
│   ├── create-ledger.action.ts              # 实例化（新增）
│   ├── create-ledger.action.test.ts
│   └── index.ts
└── index.ts

src/fn/template/
├── template.diary.fn.ts                     # Diary 模板生成
├── template.wiki.fn.ts                      # Wiki 模板生成
├── template.ledger.fn.ts                    # Ledger 模板生成（新增）
└── index.ts
```

### 高阶函数接口设计

```typescript
interface TemplateConfig<T> {
  readonly name: string;                              // 模块名称（用于日志）
  readonly rootFolder: string;                        // 根文件夹
  readonly fileType: NodeType;                        // 文件类型
  readonly tag: string;                               // 标签
  readonly generateTemplate: (params: T) => string;   // 模板生成函数
  readonly generateFolderPath: (params: T) => string[]; // 文件夹路径生成
  readonly generateTitle: (params: T) => string;      // 标题生成
  readonly foldersCollapsed?: boolean;                // 文件夹是否折叠
}

// 高阶函数
const createTemplatedFile = <T>(config: TemplateConfig<T>) => 
  (params: T & { workspaceId: string }): TE.TaskEither<AppError, CreationResult> => {
    logger.start(`[Action] 创建${config.name}...`);
    // ... 实现
  };

// 实例化
export const createDiary = createTemplatedFile(diaryConfig);
export const createWiki = createTemplatedFile(wikiConfig);
export const createLedger = createTemplatedFile(ledgerConfig);
```

