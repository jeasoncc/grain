# 前端架构重构任务

## 当前状态概述

迁移工作已完成文件复制，但存在以下待处理事项：

1. **新旧目录并存** - 旧目录作为兼容层保留，待验证后删除
2. **代码逻辑审核** - 需逐个检查文件是否符合架构规范
3. **依赖规则验证** - 需确保各层依赖关系正确

---

## 阶段 1: 验证迁移正确性

### Task 1.1: 编译验证
- [ ] 运行 `bun run lint` 检查代码规范
- [ ] 运行 TypeScript 编译检查
- [ ] 运行 `bun run desktop:dev` 验证应用启动

### Task 1.2: 功能测试
- [ ] 运行 `bun run test` 执行单元测试
- [ ] 手动测试核心功能（创建/编辑/删除节点）
- [ ] 手动测试导入/导出功能

**验收标准**: 应用能正常运行，所有测试通过

---

## 阶段 2: 代码逻辑审核

按架构层级从底层到上层逐个审核，确保每个文件符合其所在层的职责。

### Task 2.1: 审核 types/ 层
**职责**: 纯类型定义，无运行时代码

- [ ] 检查所有 `.ts` 文件只包含类型定义
- [ ] 检查无 IO 操作、无副作用
- [ ] 检查命名规范

### Task 2.2: 审核 utils/ 层
**职责**: 通用纯函数，无 IO，无业务逻辑

| 文件 | 状态 | 问题 |
|------|------|------|
| `cn.util.ts` | ⏳ | |
| `date.util.ts` | ⏳ | |
| `keyboard.util.ts` | ⏳ | |
| `error.util.ts` | ⏳ | |
| `font.util.ts` | ⏳ | |
| `icons.util.ts` | ⏳ | |
| `themes.util.ts` | ⏳ | |
| `queue.util.ts` | ⏳ | |
| `save-service-manager.util.ts` | ⏳ | 可能包含 IO |

**检查项**:
- [ ] 无 IO 操作（无 fetch、invoke、localStorage）
- [ ] 无业务逻辑依赖
- [ ] 纯函数（相同输入相同输出）
- [ ] 命名符合 `*.util.ts` 规范

### Task 2.3: 审核 io/ 层
**职责**: 与外部世界交互，封装 IO 操作

#### io/api/ - Rust 后端 API
| 文件 | 状态 | 问题 |
|------|------|------|
| `client.api.ts` | ⏳ | |
| `workspace.api.ts` | ⏳ | |
| `node.api.ts` | ⏳ | |
| `content.api.ts` | ⏳ | |
| `user.api.ts` | ⏳ | |
| `tag.api.ts` | ⏳ | |
| `attachment.api.ts` | ⏳ | |
| `backup.api.ts` | ⏳ | |
| `clear-data.api.ts` | ⏳ | |

#### io/storage/ - 浏览器存储
| 文件 | 状态 | 问题 |
|------|------|------|
| `settings.storage.ts` | ⏳ | |

#### io/file/ - 文件系统
| 文件 | 状态 | 问题 |
|------|------|------|
| `dialog.file.ts` | ⏳ | |

**检查项**:
- [ ] 只依赖 `types/`
- [ ] 封装所有外部交互
- [ ] 使用 TaskEither 处理错误
- [ ] 命名符合 `*.api.ts` / `*.storage.ts` / `*.file.ts` 规范

### Task 2.4: 审核 pipes/ 层
**职责**: 纯业务数据转换，无 IO，无副作用

| 目录 | 状态 | 问题 |
|------|------|------|
| `pipes/node/` | ⏳ | |
| `pipes/content/` | ⏳ | |
| `pipes/export/` | ⏳ | |
| `pipes/import/` | ⏳ | |
| `pipes/search/` | ⏳ | |
| `pipes/tag/` | ⏳ | |
| `pipes/wiki/` | ⏳ | |
| `pipes/word-count/` | ⏳ | |
| `pipes/format/` | ⏳ | |

**检查项**:
- [ ] 只依赖 `utils/`, `types/`
- [ ] 无 IO 操作
- [ ] 纯函数（相同输入相同输出）
- [ ] 使用 fp-ts pipe 组合
- [ ] 命名符合 `*.pipe.ts` 或 `*.fn.ts` 规范

### Task 2.5: 审核 state/ 层
**职责**: Zustand 状态管理，无 IO

| 文件 | 状态 | 问题 |
|------|------|------|
| `selection.state.ts` | ⏳ | |
| `editor-tabs.state.ts` | ⏳ | |
| `editor-settings.state.ts` | ⏳ | |
| `editor-history.state.ts` | ⏳ | |
| `sidebar.state.ts` | ⏳ | |
| `theme.state.ts` | ⏳ | |
| `icon-theme.state.ts` | ⏳ | |
| `font.state.ts` | ⏳ | |
| `ui.state.ts` | ⏳ | |
| `save.state.ts` | ⏳ | |
| `writing.state.ts` | ⏳ | |
| `diagram.state.ts` | ⏳ | |

**检查项**:
- [ ] 只依赖 `types/`
- [ ] 无 IO 操作
- [ ] 使用 Zustand + Immer
- [ ] 命名符合 `*.state.ts` 规范

### Task 2.6: 审核 flows/ 层
**职责**: 组合 pipes + io，形成业务流程

| 目录 | 状态 | 问题 |
|------|------|------|
| `flows/workspace/` | ⏳ | |
| `flows/node/` | ⏳ | |
| `flows/export/` | ⏳ | |
| `flows/import/` | ⏳ | |
| `flows/file/` | ⏳ | |
| `flows/settings/` | ⏳ | |
| `flows/wiki/` | ⏳ | |
| `flows/templated/` | ⏳ | |
| `flows/save/` | ⏳ | |
| `flows/updater/` | ⏳ | |
| `flows/migration/` | ⏳ | |

**检查项**:
- [ ] 只依赖 `pipes/`, `io/`, `state/`, `types/`
- [ ] 不依赖 `views/`, `hooks/`
- [ ] 使用 TaskEither 处理错误
- [ ] 命名符合 `*.flow.ts` 或 `*.action.ts` 规范

### Task 2.7: 审核 hooks/ 层
**职责**: React 生命周期绑定，连接 flows 和 views

| 文件 | 状态 | 问题 |
|------|------|------|
| `use-node.ts` | ⏳ | 依赖 queries/ |
| `use-workspace.ts` | ⏳ | |
| `use-content.ts` | ⏳ | |
| `use-theme.ts` | ⏳ | |
| `use-icon-theme.ts` | ⏳ | |
| `query-keys.ts` | ⏳ | |

**检查项**:
- [ ] 只依赖 `flows/`, `state/`, `types/`
- [ ] 不直接依赖 `io/`, `pipes/`
- [ ] 使用 TanStack Query
- [ ] 命名符合 `use-*.ts` 规范

### Task 2.8: 审核 views/ 层
**职责**: UI 渲染，纯展示组件

| 目录 | 状态 | 问题 |
|------|------|------|
| `views/ui/` | ⏳ | shadcn/ui 组件 |
| `views/file-tree/` | ⏳ | |
| `views/editor-tabs/` | ⏳ | |
| `views/activity-bar/` | ⏳ | |
| `views/command-palette/` | ⏳ | |
| `views/global-search/` | ⏳ | |
| `views/theme-selector/` | ⏳ | |
| `views/unified-sidebar/` | ⏳ | |
| `views/story-workspace/` | ⏳ | |
| `views/story-right-sidebar/` | ⏳ | |
| `views/panels/` | ⏳ | |
| `views/backup-manager/` | ⏳ | |
| `views/buffer-switcher/` | ⏳ | |
| `views/excalidraw-editor/` | ⏳ | |
| `views/export-button/` | ⏳ | |
| `views/export-dialog/` | ⏳ | |
| `views/export-dialog-manager/` | ⏳ | |
| `views/keyboard-shortcuts-help/` | ⏳ | |
| `views/save-status-indicator/` | ⏳ | |
| `views/update-checker/` | ⏳ | |
| `views/word-count-badge/` | ⏳ | |
| `views/blocks/` | ⏳ | |
| `views/utils/` | ⏳ | |
| `views/diagram/` | ⏳ | 从 fn/ 迁移 |
| `views/drawing/` | ⏳ | 从 fn/ 迁移 |
| `views/editor/` | ⏳ | 从 fn/ 迁移 |
| `views/editor-history/` | ⏳ | 从 fn/ 迁移 |
| `views/theme/` | ⏳ | 从 fn/ 迁移 |
| `views/icon-theme/` | ⏳ | 从 fn/ 迁移 |
| `views/writing/` | ⏳ | 从 fn/ 迁移 |
| `views/ledger/` | ⏳ | 从 fn/ 迁移 |

**检查项**:
- [ ] 只依赖 `hooks/`, `types/`
- [ ] 不直接依赖 `flows/`, `io/`, `pipes/`, `state/`
- [ ] 纯展示组件，数据通过 props 传入
- [ ] 命名符合 `*.view.tsx` / `*.container.fn.tsx` 规范

---

## 阶段 3: 依赖规则验证

### Task 3.1: 创建依赖检查脚本
- [ ] 创建脚本检查各层依赖关系
- [ ] 输出违规依赖报告

### Task 3.2: 修复违规依赖
根据审核结果修复违规依赖：

| 层 | 允许依赖 | 禁止依赖 |
|---|---------|---------|
| `views/` | `hooks/`, `types/` | `flows/`, `io/`, `pipes/`, `state/` |
| `hooks/` | `flows/`, `state/`, `types/` | `io/`, `pipes/` |
| `flows/` | `pipes/`, `io/`, `state/`, `types/` | `views/`, `hooks/` |
| `pipes/` | `utils/`, `types/` | `io/`, `state/`, `flows/`, `hooks/`, `views/` |
| `io/` | `types/` | 其他所有 |
| `state/` | `types/` | 其他所有 |
| `utils/` | `types/` | 其他所有 |

---

## 阶段 4: 文件命名规范化

### Task 4.1: 重命名不符合规范的文件

**命名规范**:
| 目录 | 后缀 | 示例 |
|------|------|------|
| `io/api/` | `.api.ts` | `workspace.api.ts` |
| `io/storage/` | `.storage.ts` | `settings.storage.ts` |
| `io/file/` | `.file.ts` | `dialog.file.ts` |
| `pipes/` | `.pipe.ts` | `node.tree.pipe.ts` |
| `flows/` | `.flow.ts` | `create-workspace.flow.ts` |
| `hooks/` | `use-*.ts` | `use-workspace.ts` |
| `views/` | `.view.tsx` | `file-tree.view.tsx` |
| `state/` | `.state.ts` | `selection.state.ts` |
| `utils/` | `.util.ts` | `date.util.ts` |

**待重命名文件**:
- [ ] `pipes/` 中的 `*.fn.ts` → `*.pipe.ts`
- [ ] `flows/` 中的 `*.action.ts` → `*.flow.ts`

---

## 阶段 5: 完成未完成的迁移

### Task 5.1: 合并 queries/ 到 hooks/
- [ ] 移动 `queries/*.queries.ts` 到 `hooks/`
- [ ] 更新导入路径
- [ ] 验证功能正常

### Task 5.2: 迁移 db/ 到 io/db/
- [ ] 移动 `db/*.ts` 到 `io/db/`
- [ ] 更新导入路径
- [ ] 验证功能正常

### Task 5.3: 迁移 log/ 到 io/log/
- [ ] 移动 `log/*.ts` 到 `io/log/`
- [ ] 更新导入路径
- [ ] 验证功能正常

---

## 阶段 6: 清理旧目录

**前置条件**: 阶段 1-5 全部完成，所有测试通过

### Task 6.1: 删除旧目录
- [ ] 删除 `components/` 目录
- [ ] 删除 `actions/` 目录
- [ ] 删除 `fn/` 目录
- [ ] 删除 `stores/` 目录
- [ ] 删除 `lib/` 目录
- [ ] 删除 `queries/` 目录（Task 5.1 完成后）
- [ ] 删除 `db/` 目录（Task 5.2 完成后）
- [ ] 删除 `log/` 目录（Task 5.3 完成后）

### Task 6.2: 最终验证
- [ ] 运行 `bun run lint`
- [ ] 运行 `bun run test`
- [ ] 运行 `bun run desktop:dev`
- [ ] 手动测试核心功能

---

## 阶段 7: 文档更新

### Task 7.1: 更新项目文档
- [ ] 更新 `.kiro/steering/structure.md`
- [ ] 更新 README 中的项目结构说明

---

## 进度跟踪

| 阶段 | 状态 | 完成日期 |
|------|------|----------|
| 阶段 1: 验证迁移正确性 | ⏳ 待开始 | - |
| 阶段 2: 代码逻辑审核 | ⏳ 待开始 | - |
| 阶段 3: 依赖规则验证 | ⏳ 待开始 | - |
| 阶段 4: 文件命名规范化 | ⏳ 待开始 | - |
| 阶段 5: 完成未完成的迁移 | ⏳ 待开始 | - |
| 阶段 6: 清理旧目录 | ⏳ 待开始 | - |
| 阶段 7: 文档更新 | ⏳ 待开始 | - |

---

## 审核记录

### 发现的问题

（审核过程中记录发现的问题）

| 文件 | 问题描述 | 修复方案 | 状态 |
|------|---------|---------|------|
| | | | |

### 已修复的问题

（记录已修复的问题）

| 文件 | 问题描述 | 修复日期 |
|------|---------|----------|
| | | |

---

## Git 提交规范

每个任务完成后：
```bash
git add -A
git commit -m "refactor: [阶段X] 任务描述"
```

示例：
- `refactor: [阶段2] 审核 pipes/ 层，修复依赖问题`
- `refactor: [阶段4] 重命名 flows/ 文件为 *.flow.ts`
- `refactor: [阶段6] 删除旧的 components/ 目录`
