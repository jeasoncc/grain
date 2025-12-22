# 架构符合性报告

本报告对比 Grain Desktop 当前代码与 Steering 规范（architecture.md, code-standards.md, structure.md）的符合性。

## 📊 总体评估

| 类别 | 符合度 | 状态 |
|------|--------|------|
| 目录结构 | 85% | 🟡 部分符合 |
| 数据流架构 | 80% | 🟡 部分符合 |
| 函数式编程 | 90% | 🟢 基本符合 |
| 文件命名 | 95% | 🟢 符合 |
| 日志规范 | 60% | 🔴 需改进 |
| 依赖关系 | 70% | 🟡 部分符合 |

---

## 1. 目录结构符合性

### ✅ 符合项

| 目录 | 规范要求 | 当前状态 |
|------|----------|----------|
| `types/` | Interface + Builder + Schema | ✅ 已创建，包含 21 个子模块 |
| `fn/` | 纯函数层 | ✅ 已创建，包含 16 个子模块 |
| `db/` | 持久化函数 | ✅ 已重构为 `*.db.fn.ts` 格式 |
| `stores/` | Zustand 状态管理 | ✅ 已创建，包含 13 个 store |
| `hooks/` | React Hooks | ✅ 已整合，包含 16 个 hooks |
| `routes/actions/` | Action 函数 | ✅ 已创建 |
| `lib/` | 函数式工具库 | ✅ 已创建 error.types.ts |
| `log/` | 日志模块 | ✅ 保留 |

### ❌ 不符合项

| 问题 | 规范要求 | 当前状态 | 优先级 |
|------|----------|----------|--------|
| `domain/` 目录存在 | 应删除 | 仍存在 19 个子模块 | 🔴 高 |
| `services/` 目录存在 | 应删除 | 仍存在 6 个文件 | 🔴 高 |
| `db/models/` 目录存在 | 应删除 | 仍存在旧结构 | 🔴 高 |
| `utils/` 目录 | 未在规范中 | 存在但为空 | 🟢 低 |

### 修复建议

```bash
# 1. 迁移 domain/ 剩余模块
# domain/diary/ → fn/diary/ + routes/actions/
# domain/export/ → fn/export/
# domain/search/ → fn/search/
# domain/wiki/ → fn/wiki/
# domain/keyboard/ → hooks/use-keyboard.ts
# domain/updater/ → fn/updater/

# 2. 迁移 services/ 剩余模块
# services/drawings.ts → db/drawing.db.fn.ts + routes/actions/
# services/nodes.ts → 已有 db/node.db.fn.ts
# services/export.ts → fn/export/
# services/save.ts → fn/save/
# services/keyboard-shortcuts.ts → hooks/

# 3. 删除旧目录
rm -rf src/domain/
rm -rf src/services/
rm -rf src/db/models/
rm -rf src/utils/
```

---

## 2. 数据流架构符合性

### ✅ 符合项

规范要求的数据流：
```
types/ → fn/ → db/ → stores/ → hooks/ → components/
```

| 层级 | 符合情况 |
|------|----------|
| `types/` 无依赖 | ✅ 符合 |
| `fn/` 使用 fp-ts pipe | ✅ 符合（8 个文件使用 pipe） |
| `db/` 使用 TaskEither | ✅ 符合（所有 db.fn.ts 文件） |
| `stores/` 使用 Zustand + Immer | ✅ 符合 |
| `hooks/` 使用 Dexie React Hooks | ✅ 符合 |

### ❌ 不符合项

| 问题 | 详情 | 优先级 |
|------|------|--------|
| 组件直接访问 domain/ | 15+ 个文件仍从 domain/ 导入 | 🔴 高 |
| 组件直接访问 services/ | 7+ 个文件仍从 services/ 导入 | 🔴 高 |
| 循环依赖风险 | domain/ 内部相互依赖 | 🟡 中 |

### 受影响文件列表

**从 `@/domain` 导入的文件：**
- `routes/__root.tsx` - useUnifiedSidebarStore
- `components/workspace/multi-editor-workspace.tsx` - EditorTab 类型
- `components/blocks/global-search-connected.tsx` - searchEngine
- `components/workspace/story-workspace.tsx` - useUIStore
- `components/icon-theme-preview.tsx` - getCurrentIconTheme
- `components/global-search-dialog-connected.tsx` - searchEngine
- `components/buffer-switcher.tsx` - EditorTab 类型
- `components/panels/file-tree-panel.tsx` - createDiaryInFileTree
- `lib/font-config.ts` - CARD_SIZE_OPTIONS
- `hooks/use-save.ts` - keyboardShortcutManager, saveService
- `hooks/use-manual-save.ts` - useSaveStore
- `routes/settings/general.tsx` - useUIStore
- `routes/settings/diagrams.tsx` - useDiagramSettings
- `routes/test-manual-save.tsx` - useSaveStore
- `routes/canvas.tsx` - useUnifiedSidebarStore

**从 `@/services` 导入的文件：**
- `routes/__root.tsx` - createDrawing, deleteDrawing
- `components/export/export-button.tsx` - exportProject
- `components/workspace/story-workspace.tsx` - getNodeContent, saveService, useWikiFiles
- `components/blocks/wiki-hover-preview-connected.tsx` - getNode, getNodeContent
- `components/file-tree/file-tree-item.tsx` - TreeNode 类型
- `hooks/use-manual-save.ts` - keyboardShortcutManager, saveService
- `routes/canvas.tsx` - useDrawingById

---

## 3. 函数式编程符合性

### ✅ 符合项

| 规范 | 当前状态 |
|------|----------|
| 使用 fp-ts pipe | ✅ fn/ 目录 8 个文件使用 |
| 使用 Either/TaskEither | ✅ db/ 目录全部使用 |
| 使用 es-toolkit | ✅ 已安装 |
| 使用 dayjs | ✅ 已使用 |
| 使用 Zod Schema | ✅ types/ 目录已实现 |
| Builder 模式 | ✅ types/ 目录已实现 |

### ❌ 不符合项

| 问题 | 详情 | 优先级 |
|------|------|--------|
| 部分 fn/ 文件未使用 pipe | 8/16 个子模块使用 pipe | 🟡 中 |
| 部分函数未返回 Either | 一些纯函数直接返回值 | 🟢 低 |

---

## 4. 文件命名符合性

### ✅ 符合项

| 类型 | 规范格式 | 当前状态 |
|------|----------|----------|
| Interface | `xxx.interface.ts` | ✅ 符合 |
| Schema | `xxx.schema.ts` | ✅ 符合 |
| Builder | `xxx.builder.ts` | ✅ 符合 |
| 纯函数 | `xxx.fn.ts` | ✅ 符合 |
| 数据库函数 | `xxx.db.fn.ts` | ✅ 符合 |
| Store | `xxx.store.ts` | ✅ 符合 |
| Hook | `use-xxx.ts` | ✅ 符合 |
| Action | `xxx-yyy.action.ts` | ✅ 符合 |
| 测试 | `*.test.ts` | ✅ 符合 |

### ❌ 不符合项

| 问题 | 详情 | 优先级 |
|------|------|--------|
| 组件命名不一致 | 部分使用 kebab-case，部分使用 PascalCase | 🟢 低 |

---

## 5. 日志规范符合性

### ❌ 严重不符合

**规范要求：** 所有日志必须使用 `logger` 模块，禁止 `console.log`

**当前状态：** 发现 40+ 处 `console.log/error/warn` 使用

### 受影响文件

| 文件 | console 调用数 | 优先级 |
|------|---------------|--------|
| `components/activity-bar.tsx` | 6 | 🔴 高 |
| `components/activity-bar/activity-bar-container.tsx` | 4 | 🔴 高 |
| `components/workspace/story-workspace.tsx` | 1 | 🔴 高 |
| `components/blocks/canvas-editor.tsx` | 2 | 🟡 中 |
| `components/blocks/update-checker.tsx` | 2 | 🟡 中 |
| `components/blocks/export-dialog.tsx` | 1 | 🟡 中 |
| `components/blocks/createBookDialog.tsx` | 1 | 🟡 中 |
| `components/blocks/global-search.tsx` | 1 | 🟡 中 |
| `components/global-search-dialog.tsx` | 1 | 🟡 中 |
| `components/panels/search-panel.tsx` | 1 | 🟡 中 |
| `components/panels/file-tree-panel.tsx` | 7 | 🔴 高 |
| `domain/updater/updater.service.ts` | 4 | 🟡 中 |
| `db/clear-data/clear-data.service.ts` | 1 | 🟡 中 |
| `packages/editor/src/components/Editor.tsx` | 1 | 🟢 低 |

### 修复建议

```typescript
// ❌ 当前
console.error("Failed to create workspace:", error);
console.log("[ActivityBar] workspaces 存在:", workspaces.length);

// ✅ 应改为
import logger from "@/log";
logger.error("[Workspace] 创建失败:", error);
logger.info("[ActivityBar] workspaces 存在:", workspaces.length);
```

---

## 6. 依赖关系符合性

### 规范要求

```
types/ → 无依赖（最底层）
lib/ → 只依赖 types/
db/ → 只依赖 types/
stores/ → 只依赖 types/
fn/ → 依赖 types/, lib/, db/, stores/
hooks/ → 依赖 fn/, stores/
components/ → 依赖 hooks/, types/
```

### ❌ 不符合项

| 违规 | 详情 | 优先级 |
|------|------|--------|
| components/ 依赖 domain/ | 15+ 个组件直接导入 domain/ | 🔴 高 |
| components/ 依赖 services/ | 7+ 个组件直接导入 services/ | 🔴 高 |
| hooks/ 依赖 domain/ | use-save.ts, use-manual-save.ts | 🔴 高 |
| lib/ 依赖 domain/ | font-config.ts 导入 domain/font | 🟡 中 |

---

## 7. 修复优先级总结

### 🔴 高优先级（阻止应用运行）

1. **迁移 domain/ 剩余模块**
   - 预计时间：4-6 小时
   - 影响：15+ 个文件

2. **迁移 services/ 剩余模块**
   - 预计时间：2-3 小时
   - 影响：7+ 个文件

3. **替换 console.log 为 logger**
   - 预计时间：1-2 小时
   - 影响：15+ 个文件

### 🟡 中优先级（代码质量）

4. **修复依赖关系违规**
   - 预计时间：2-3 小时

5. **补充 fp-ts pipe 使用**
   - 预计时间：1-2 小时

### 🟢 低优先级（优化）

6. **统一组件命名规范**
   - 预计时间：1 小时

7. **删除空目录**
   - 预计时间：5 分钟

---

## 8. 符合性检查清单

### 架构层面
- [x] types/ 目录已创建
- [x] fn/ 目录已创建
- [x] db/ 目录已重构
- [x] stores/ 目录已创建
- [x] hooks/ 目录已整合
- [x] routes/actions/ 目录已创建
- [ ] domain/ 目录已删除
- [ ] services/ 目录已删除
- [ ] db/models/ 目录已删除

### 代码规范
- [x] 使用 fp-ts pipe
- [x] 使用 TaskEither 错误处理
- [x] 使用 Zod Schema 校验
- [x] 使用 Builder 模式
- [x] 使用 dayjs 处理时间
- [ ] 所有日志使用 logger
- [ ] 无 console.log 调用

### 文件命名
- [x] Interface: xxx.interface.ts
- [x] Schema: xxx.schema.ts
- [x] Builder: xxx.builder.ts
- [x] 纯函数: xxx.fn.ts
- [x] 数据库函数: xxx.db.fn.ts
- [x] Store: xxx.store.ts
- [x] Hook: use-xxx.ts
- [x] Action: xxx-yyy.action.ts

### 依赖关系
- [x] types/ 无外部依赖
- [x] db/ 只依赖 types/
- [x] stores/ 只依赖 types/
- [ ] components/ 不直接访问 domain/
- [ ] components/ 不直接访问 services/
- [ ] hooks/ 不直接访问 domain/

---

## 9. 下一步行动

1. **立即执行 Phase 11 任务**（紧急修复）
   - 修复 DrawingBuilder 只读属性错误
   - 批量更新 @/db/models 导入路径
   - 迁移 services/ 模块

2. **执行 Phase 12 任务**（Lint 警告修复）
   - 替换所有 console.log 为 logger
   - 修复可访问性问题

3. **执行 Phase 15 任务**（代码清理）
   - 删除 domain/ 目录
   - 删除 services/ 目录
   - 删除 db/models/ 目录

---

*报告生成时间：2025-12-22*
*基于 Steering 规范：architecture.md, code-standards.md, structure.md*
