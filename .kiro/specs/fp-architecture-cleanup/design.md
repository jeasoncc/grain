# Design Document

## 1. 清理范围分析

### 1.1 需要删除的目录

根据 `architecture.md` 和 `structure.md`，以下目录不应该存在于新架构中：

| 目录 | 状态 | 迁移目标 |
|------|------|----------|
| `domain/` | 🔴 待删除 | `fn/`, `stores/`, `actions/`, `types/` |
| `services/` | 🔴 待删除 | `fn/`, `actions/`, `db/` |
| `db/backup/` | 🔴 待删除 | `db/backup.db.fn.ts` |
| `db/clear-data/` | 🔴 待删除 | `db/clear-data.db.fn.ts` |
| `db/init/` | 🔴 待删除 | `db/init.db.fn.ts` |

### 1.2 需要删除的文件

#### domain/ 目录（18 个子目录）

```
domain/
├── diagram/           → stores/diagram.store.ts, fn/diagram/
├── diary/             → fn/date/, actions/templated/
├── editor-tabs/       → types/editor-tab/, stores/editor-tabs.store.ts
├── export/            → fn/export/, actions/export/
├── file-creator/      → actions/node/
├── font/              → types/font/, stores/font.store.ts
├── icon-theme/        → types/icon-theme/, stores/icon-theme.store.ts, fn/icon-theme/
├── import-export/     → fn/import/, fn/export/, actions/import/, actions/export/
├── keyboard/          → fn/keyboard/
├── save/              → types/save/, stores/save.store.ts, fn/save/
├── search/            → fn/search/
├── selection/         → types/selection/, stores/selection.store.ts
├── sidebar/           → types/sidebar/, stores/sidebar.store.ts
├── theme/             → types/theme/, stores/theme.store.ts, fn/theme/
├── ui/                → types/ui/, stores/ui.store.ts
├── updater/           → fn/updater/
├── wiki/              → fn/wiki/, actions/wiki/, actions/templated/
└── writing/           → types/writing/, stores/writing.store.ts, fn/writing/
```

#### services/ 目录

```
services/
├── __tests__/         → 移动到对应的 fn/ 或 actions/ 目录
├── drawings.ts        → db/drawing.db.fn.ts, hooks/use-drawing.ts
├── drawings.utils.ts  → fn/drawing/
├── export-path.ts     → fn/export/
├── export.ts          → fn/export/, actions/export/
├── import-export.ts   → fn/import/, fn/export/
├── index.ts           → 删除（向后兼容层）
├── nodes.ts           → db/node.db.fn.ts, hooks/use-node.ts
├── tags.ts            → db/tag.db.fn.ts, hooks/use-tag.ts
└── workspaces.ts      → db/workspace.db.fn.ts, hooks/use-workspace.ts
```

#### db/ 子目录

```
db/
├── backup/            → db/backup.db.fn.ts
│   ├── backup.service.ts
│   └── index.ts
├── clear-data/        → db/clear-data.db.fn.ts
│   ├── clear-data.service.ts
│   └── index.ts
└── init/              → db/init.db.fn.ts
    ├── db-init.service.ts
    └── index.ts
```

### 1.3 需要删除的组件

经过引用分析，以下组件未被使用：

| 组件 | 文件 | 状态 |
|------|------|------|
| EmptyProject | `blocks/emptyProject.tsx` | 🔴 未使用 |
| CreateBookDialog | `blocks/createBookDialog.tsx` | 🔴 未使用 |
| FocusMode | `blocks/focus-mode.tsx` | 🔴 未使用 |
| WritingStatsPanel | `blocks/writing-stats-panel.tsx` | 🔴 未使用 |
| AutoSaveIndicator | `blocks/auto-save-indicator.tsx` | 🔴 未使用 |
| MultiSelect | `blocks/multi-select.tsx` | 🔴 未使用 |
| DrawingManager | `drawing/drawing-manager.tsx` | 🔴 未使用 |
| DrawingList | `drawing/drawing-list.tsx` | 🟡 仅被 DrawingManager 使用 |
| MultiEditorWorkspace | `workspace/multi-editor-workspace.tsx` | 🔴 未使用 |

### 1.4 需要删除的测试路由

```
routes/
├── test-clear-data.tsx    → 删除
├── test-focus.tsx         → 删除
├── test-manual-save.tsx   → 删除
└── test-selection.tsx     → 删除
```

## 2. 依赖分析

### 2.1 domain/ 依赖

当前仍有以下文件引用 `@/domain/`：

| 文件 | 引用 | 迁移方案 |
|------|------|----------|
| `services/export.ts` | `@/domain/export` | 删除 services/export.ts |
| `services/index.ts` | `@/domain/diary/diary.utils` | 删除 services/index.ts |
| `services/index.ts` | `@/domain/export` | 删除 services/index.ts |
| `actions/diary/create-diary.action.test.ts` | `@/domain/diary/diary.utils` | 更新为 `@/fn/date/` |
| `actions/templated/configs/diary.config.ts` | `@/domain/diary/diary.utils` | 更新为 `@/fn/date/` |
| `components/blocks/export-dialog.tsx` | `@/domain/export` | 更新为 `@/fn/export/` |
| `components/export/export-button.tsx` | `@/domain/export` | 更新为 `@/fn/export/` |

### 2.2 services/ 依赖

当前没有文件直接引用 `@/services/`（已全部迁移）。

### 2.3 db/ 子目录依赖

| 文件 | 引用 | 迁移方案 |
|------|------|----------|
| `services/index.ts` | `@/db/backup` | 删除 services/index.ts |
| `services/index.ts` | `@/db/clear-data` | 删除 services/index.ts |
| `services/index.ts` | `@/db/init` | 删除 services/index.ts |

## 3. 清理策略

### 3.1 清理顺序

1. **Phase 1: 更新导入路径**
   - 更新所有引用 `@/domain/` 的文件
   - 确保新路径可用

2. **Phase 2: 删除 services/ 目录**
   - 删除整个 `services/` 目录
   - 这是向后兼容层，删除后不影响功能

3. **Phase 3: 删除 domain/ 目录**
   - 删除整个 `domain/` 目录
   - 所有功能已迁移到新架构

4. **Phase 4: 删除 db/ 子目录**
   - 删除 `db/backup/`
   - 删除 `db/clear-data/`
   - 删除 `db/init/`

5. **Phase 5: 删除未使用组件**
   - 删除未被引用的组件文件

6. **Phase 6: 删除测试路由**
   - 删除 `routes/test-*.tsx` 文件

7. **Phase 7: 验证**
   - 运行类型检查
   - 运行测试
   - 启动应用验证

### 3.2 回滚策略

- 每个 Phase 完成后进行 git commit
- 如果验证失败，可以回滚到上一个 commit

## 4. 目标结构

清理完成后，`apps/desktop/src/` 应该只包含：

```
src/
├── actions/              # 业务操作层
│   ├── diary/
│   ├── drawing/
│   ├── export/
│   ├── import/
│   ├── node/
│   ├── settings/
│   ├── templated/
│   ├── wiki/
│   ├── workspace/
│   └── index.ts
│
├── assets/               # 静态资源
│
├── components/           # UI 组件层
│   ├── activity-bar/
│   ├── blocks/           # 只保留使用中的组件
│   ├── drawing/          # 只保留 drawing-workspace.tsx
│   ├── export/
│   ├── file-tree/
│   ├── panels/
│   ├── ui/               # shadcn/ui（不修改）
│   ├── workspace/        # 只保留 story-workspace.tsx
│   └── *.tsx             # 根级组件
│
├── db/                   # 持久化层
│   ├── *.db.fn.ts        # 数据库函数
│   ├── *.db.fn.test.ts   # 测试文件
│   ├── database.ts
│   ├── schema.ts
│   └── index.ts
│
├── fn/                   # 纯函数层
│   ├── content/
│   ├── date/
│   ├── diagram/
│   ├── drawing/
│   ├── editor-history/
│   ├── editor-tab/
│   ├── export/
│   ├── format/
│   ├── icon-theme/
│   ├── import/
│   ├── keyboard/
│   ├── ledger/
│   ├── node/
│   ├── save/
│   ├── search/
│   ├── tag/
│   ├── theme/
│   ├── updater/
│   ├── wiki/
│   ├── word-count/
│   ├── writing/
│   └── index.ts
│
├── hooks/                # React 绑定层
│   └── *.ts
│
├── lib/                  # 函数式工具库
│   └── *.ts
│
├── log/                  # 日志模块
│   └── index.ts
│
├── routes/               # 路由层（仅路由定义）
│   ├── settings/
│   ├── __root.tsx
│   ├── canvas.tsx
│   ├── index.tsx
│   └── settings.tsx
│
├── stores/               # 状态层
│   └── *.store.ts
│
├── types/                # 数据定义层
│   └── */
│
├── utils/                # 工具函数（应该为空或删除）
│
├── main.tsx
├── routeTree.gen.ts
├── styles.css
└── vite-env.d.ts
```

## 5. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 删除仍在使用的文件 | 高 | 每次删除前进行引用检查 |
| 导入路径更新遗漏 | 中 | 运行 TypeScript 检查 |
| 测试失败 | 中 | 每个 Phase 后运行测试 |
| 运行时错误 | 高 | 启动应用进行验证 |

## 6. 验收标准

1. ✅ `domain/` 目录不存在
2. ✅ `services/` 目录不存在
3. ✅ `db/backup/`, `db/clear-data/`, `db/init/` 目录不存在
4. ✅ 所有未使用组件已删除
5. ✅ 所有测试路由已删除
6. ✅ TypeScript 类型检查通过
7. ✅ 所有测试通过
8. ✅ 应用正常启动
9. ✅ 目录结构符合 `structure.md`
