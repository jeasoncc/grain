# Design Document: NodeType Unification

## Overview

本设计文档描述如何统一 NodeType 类型定义，确保所有模板化文件类型都有对应的 NodeType 枚举值。主要变更包括扩展 NodeType 枚举、更新模板配置文件、确保类型安全和向后兼容性。

## 审查发现的问题

### 问题 1: NodeType 重复定义

当前有 **3 处** 定义了 NodeType：

| 文件 | 定义 | 状态 |
|------|------|------|
| `types/node/node.interface.ts` | `"folder" \| "file" \| "canvas" \| "diary" \| "drawing"` | 主定义 |
| `types/node/node.schema.ts` | `z.enum(["folder", "file", "canvas", "diary"])` | 缺少 drawing |
| `db/schema.ts` | `"folder" \| "file" \| "canvas" \| "diary"` | 已废弃，缺少 drawing |

### 问题 2: 模板配置使用错误的 fileType

| 配置文件 | 当前 fileType | 应该使用 |
|---------|--------------|----------|
| wiki.config.ts | `"file"` | `"wiki"` |
| todo.config.ts | `"file"` | `"todo"` |
| note.config.ts | `"file"` | `"note"` |
| ledger.config.ts | `"file"` | `"ledger"` |

### 问题 3: Zod Schema 与 Interface 不同步

`NodeTypeSchema` 在 `node.schema.ts` 中定义为：
```typescript
export const NodeTypeSchema = z.enum(["folder", "file", "canvas", "diary"]);
```

但 `NodeType` 在 `node.interface.ts` 中定义为：
```typescript
export type NodeType = "folder" | "file" | "canvas" | "diary" | "drawing";
```

**缺少 `drawing` 类型！**

### 解决方案

1. **单一来源**: 从 `NodeTypeSchema` 推断 `NodeType` 类型
2. **同步更新**: 所有 NodeType 定义必须同步
3. **删除废弃代码**: 移除 `db/schema.ts` 中的重复定义

## Architecture

### 当前架构

```
NodeType (types/node/node.interface.ts)
    │
    ├── "folder"   → 文件夹
    ├── "file"     → 通用文件（wiki/todo/note/ledger 都用这个）
    ├── "canvas"   → 旧版画布（已废弃）
    ├── "diary"    → 日记
    └── "drawing"  → Excalidraw 绘图
```

### 目标架构

```
NodeType (types/node/node.interface.ts)
    │
    ├── "folder"   → 文件夹
    ├── "file"     → 通用文本文件
    ├── "diary"    → 日记
    ├── "wiki"     → Wiki 条目
    ├── "todo"     → 待办事项
    ├── "note"     → 笔记
    ├── "ledger"   → 记账
    ├── "drawing"  → Excalidraw 绘图
    ├── "plantuml" → PlantUML 图表
    └── "mermaid"  → Mermaid 图表
```

### 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        NodeType 定义                             │
│              types/node/node.interface.ts                        │
│                                                                  │
│  export type NodeType =                                          │
│    | "folder" | "file" | "diary" | "wiki" | "todo"              │
│    | "note" | "ledger" | "drawing" | "plantuml" | "mermaid";    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Date Template Factory                         │
│         actions/templated/configs/date-template.factory.ts       │
│                                                                  │
│  fileType: Exclude<NodeType, "folder">                          │
│  // 排除 folder，只允许文件类型                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Template Configs                            │
│                                                                  │
│  diary.config.ts  → fileType: "diary"                           │
│  wiki.config.ts   → fileType: "wiki"                            │
│  todo.config.ts   → fileType: "todo"                            │
│  note.config.ts   → fileType: "note"                            │
│  ledger.config.ts → fileType: "ledger"                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
│                      db/database.ts                              │
│                                                                  │
│  nodes 表存储 type 字段，值为 NodeType                            │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. NodeType 类型定义（单一来源）

**文件**: `apps/desktop/src/types/node/node.schema.ts`

```typescript
import { z } from "zod";

/**
 * 节点类型 Zod Schema（单一来源）
 * 
 * 所有 NodeType 的定义都从这里派生，确保一致性。
 */
export const NodeTypeSchema = z.enum([
  "folder",    // 容器节点，可以包含子节点
  "file",      // 通用文本文件，使用 Lexical 编辑器
  "diary",     // 日记条目
  "wiki",      // Wiki 知识条目
  "todo",      // 待办事项
  "note",      // 笔记
  "ledger",    // 记账条目
  "drawing",   // Excalidraw 绘图文件
  "plantuml",  // PlantUML 图表
  "mermaid",   // Mermaid 图表
]);

/**
 * 从 Schema 推断的 NodeType 类型
 */
export type NodeType = z.infer<typeof NodeTypeSchema>;
```

**文件**: `apps/desktop/src/types/node/node.interface.ts`

```typescript
// 从 schema 导入类型，确保单一来源
import type { NodeType } from "./node.schema";
export type { NodeType };

/**
 * 文件类型（排除 folder）
 * 用于模板配置等只接受文件类型的场景
 */
export type FileNodeType = Exclude<NodeType, "folder">;
```

### 2. Date Template Factory 更新

**文件**: `apps/desktop/src/actions/templated/configs/date-template.factory.ts`

```typescript
import type { FileNodeType } from "@/types/node";

export interface DateTemplateOptions {
  readonly name: string;
  readonly rootFolder: string;
  readonly fileType: FileNodeType;  // 使用 FileNodeType 而非 Exclude<NodeType, "folder">
  readonly tag: string;
  readonly prefix: string;
  readonly generateContent: (date: Date) => string;
  readonly includeDayFolder?: boolean;
  readonly foldersCollapsed?: boolean;
}
```

### 3. 模板配置更新

每个模板配置文件需要更新 `fileType` 字段：

| 配置文件 | 当前 fileType | 新 fileType |
|---------|--------------|-------------|
| diary.config.ts | `"diary"` | `"diary"` (不变) |
| wiki.config.ts | `"file"` | `"wiki"` |
| todo.config.ts | `"file"` | `"todo"` |
| note.config.ts | `"file"` | `"note"` |
| ledger.config.ts | `"file"` | `"ledger"` |

## Data Models

### NodeInterface 更新

```typescript
export interface NodeInterface {
  readonly id: UUID;
  readonly workspace: UUID;
  readonly parent: UUID | null;
  readonly type: NodeType;  // 使用扩展后的 NodeType
  readonly title: string;
  readonly order: number;
  readonly collapsed?: boolean;
  readonly createDate: ISODateString;
  readonly lastEdit: ISODateString;
  readonly tags?: string[];
}
```

### 数据库兼容性

现有数据库中的节点类型：
- `"folder"` → 保持不变
- `"file"` → 保持不变（通用文件）
- `"diary"` → 保持不变
- `"canvas"` → 运行时映射为 `"drawing"`

新创建的节点将使用新的类型值（wiki、todo、note、ledger 等）。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Template Config FileType Consistency

*For any* template config created by `createDateTemplateConfig`, the `fileType` field should match the template's semantic type (e.g., wiki config should have fileType "wiki").

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 2: FileNodeType Excludes Folder

*For any* value of type `FileNodeType`, it should never be equal to `"folder"`.

**Validates: Requirements 4.1**

### Property 3: Data Preservation During Load

*For any* existing node loaded from the database, its `type` field should be preserved exactly as stored (no automatic conversion).

**Validates: Requirements 3.2, 5.1**

## Error Handling

### 类型错误

- **编译时**: TypeScript 会在使用无效 NodeType 时报错
- **运行时**: Zod schema 验证会拒绝无效的 type 值

### 向后兼容错误

- 旧版 `"canvas"` 类型：在渲染时映射为 `"drawing"` 处理
- 未知类型：降级为 `"file"` 类型处理

## Testing Strategy

### 单元测试

1. **NodeType 定义测试**
   - 验证 NodeType 包含所有预期值
   - 验证 FileNodeType 排除 folder

2. **模板配置测试**
   - 验证每个配置的 fileType 正确
   - 验证创建的节点具有正确的 type

### 属性测试

1. **Property 1**: 使用 fast-check 生成随机模板配置，验证 fileType 一致性
2. **Property 2**: 验证 FileNodeType 约束
3. **Property 3**: 模拟数据库加载，验证类型保留

### 测试框架

- **单元测试**: Vitest
- **属性测试**: fast-check
- **最小迭代次数**: 100 次
