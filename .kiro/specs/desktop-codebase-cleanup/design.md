# Design Document: Desktop Codebase Cleanup

## Overview

本设计文档描述了 desktop 应用代码库清理的实施方案。清理工作将分阶段进行，确保每个阶段都能独立验证，不会破坏现有功能。

## Architecture

清理工作不涉及架构变更，而是移除不再需要的代码层：

```
当前状态:
┌─────────────────────────────────────────────────────────────┐
│                     views/                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ ledger/     │  │ editor/     │  │ icon-theme/ │ ← 兼容层  │
│  │ (re-export) │  │ (re-export) │  │ (re-export) │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘

目标状态:
┌─────────────────────────────────────────────────────────────┐
│                     views/                                   │
│  (只保留实际的视图组件，移除所有兼容层)                        │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 清理分类

#### 1. 空兼容层文件

这些文件只包含重导出语句，没有实际逻辑：

| 文件路径 | 重导出目标 | 依赖数 |
|---------|-----------|--------|
| `io/db/index.ts` | (空) | 0 |
| `utils/error.util.ts` | `@/types/error` | 0 |
| `utils/save-service-manager.util.ts` | (空) | 0 |
| `hooks/use-theme-dom.ts` | `@/io/dom/theme.dom` | 0 |
| `views/ledger/index.ts` | `@/pipes/ledger` | 0 |
| `views/editor/index.ts` | `@/pipes/editor` | 0 |
| `views/icon-theme/index.ts` | `@/pipes/icon-theme` | 0 |
| `pipes/export/export.download.fn.ts` | `@/io/file/download.file` | 0 |
| `pipes/export/export.path.fn.ts` | (空) | 0 |
| `pipes/search/search.engine.fn.ts` | (空) | 0 |
| `pipes/format/format.bytes.fn.ts` | `@/utils/format.util` | 0 |

#### 2. 迁移代码

Dexie 到 SQLite 的迁移已完成，所有迁移函数现在返回 no-op：

```
flows/migration/
├── dexie-to-sqlite.migration.fn.ts      # 所有函数返回空结果
├── dexie-to-sqlite.migration.fn.test.ts # 测试文件
├── migration-sqlite-dependency-verification.property.test.ts
└── index.ts
```

Wiki 迁移也已完成：
- `flows/wiki/migrate-wiki.flow.ts` - 所有函数返回空结果

#### 3. 示例和测试文件

| 文件路径 | 用途 | 依赖数 |
|---------|------|--------|
| `examples/functional-logging-example.ts` | 日志系统使用示例 | 0 |
| `flows/log/performance-test.ts` | 性能测试脚本 | 0 |
| `flows/log/test-logger.flow.ts` | 日志测试工具 | 1 (被 example 引用) |

#### 4. 重复功能

| 重复模块 | 规范位置 | 原因 |
|---------|---------|------|
| `flows/data/clear-data.flow.ts` | `flows/backup/clear-data.flow.ts` | 功能完全重复 |
| `pipes/format/` | `utils/format.util.ts` | 只有重导出 |

#### 5. 需要更新的导入

| 文件 | 当前导入 | 应改为 |
|------|---------|--------|
| `flows/wiki/get-wiki-files.flow.ts` | `@/pipes/wiki/wiki.builder` | `@/types/wiki` |

#### 6. 需要移除的 deprecated 别名

| 文件 | 别名 | 替代 |
|------|------|------|
| `state/ui.state.ts` | `useUIState` | `useUIStore` |
| `state/editor-history.state.ts` | `useEditorHistory` | `useEditorHistoryStore` |
| `state/diagram.state.ts` | `useDiagramSettings` | `useDiagramStore` |
| `state/sidebar.state.ts` | `useUnifiedSidebarStore` | `useSidebarStore` |

## Data Models

无数据模型变更。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

由于这是一个代码清理任务，主要涉及静态分析和文件删除，没有运行时行为需要通过属性测试验证。

验证方式：
1. **构建验证**: 每次删除后运行 `bun run build` 确保无编译错误
2. **类型检查**: 运行 `bun run typecheck` 确保类型正确
3. **测试验证**: 运行 `bun run test` 确保现有测试通过

## Error Handling

### 删除前检查

在删除任何文件前，必须：

1. 使用 grep 搜索确认没有导入该文件
2. 检查 index.ts 是否导出该模块
3. 如果有导入，先更新导入路径

### 回滚策略

所有删除操作通过 git 进行，可以随时回滚：

```bash
# 如果发现问题，回滚到上一个提交
git reset --hard HEAD~1
```

## Testing Strategy

### 验证步骤

每个清理阶段完成后执行：

```bash
# 1. 类型检查
bun run typecheck

# 2. 构建检查
bun run build

# 3. 运行测试
bun run test
```

### 分阶段验证

1. **阶段 1**: 删除空兼容层 → 验证
2. **阶段 2**: 删除迁移代码 → 验证
3. **阶段 3**: 删除示例文件 → 验证
4. **阶段 4**: 删除重复功能 → 验证
5. **阶段 5**: 更新导入和移除别名 → 验证

## Implementation Notes

### 删除顺序

按依赖关系从叶子节点开始删除：

1. 先删除没有任何依赖的文件
2. 再删除目录
3. 最后更新 index.ts 导出

### Git 提交策略

每个清理类别一个提交：

```bash
git commit -m "refactor: remove empty compatibility layers"
git commit -m "refactor: remove Dexie migration code"
git commit -m "refactor: remove example and test files"
git commit -m "refactor: remove duplicate functionality"
git commit -m "refactor: update imports and remove deprecated aliases"
```
