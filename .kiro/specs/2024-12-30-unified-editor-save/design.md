# Design Document

## Overview

本设计文档描述如何统一所有编辑器的保存逻辑，确保 Lexical、Excalidraw、DiagramEditor 和未来的 CodeEditor 都使用相同的保存机制。同时将 TabType 复用 NodeType，消除重复的类型定义。

## Architecture

### 当前架构问题

```
┌─────────────────────────────────────────────────────────────────┐
│                    StoryWorkspaceContainer                       │
│  (Lexical 编辑器)                                                │
│                                                                  │
│  useSettings() ──► autoSave, autoSaveInterval                   │
│       │                                                          │
│       ▼                                                          │
│  自己实现的定时器逻辑 ──► saveService.saveDocument()            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DiagramEditorContainer                        │
│  (Monaco 编辑器)                                                 │
│                                                                  │
│  useEditorSave({ ... }) ✅ 已使用统一 hook                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ExcalidrawEditorContainer                     │
│  (Excalidraw 编辑器)                                             │
│                                                                  │
│  自己实现的 debounce + throttle 逻辑                            │
│  自己管理 hasUnsavedChanges ref                                 │
│  自己调用 updateContentByNodeId()                               │
└─────────────────────────────────────────────────────────────────┘
```

### 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       useSettings Store                          │
│  autoSave: boolean (default: true)                              │
│  autoSaveInterval: number (default: 3, range: 1-60 seconds)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       useEditorSave Hook                         │
│                                                                  │
│  1. 读取 useSettings 的 autoSave 和 autoSaveInterval            │
│  2. 转换 autoSaveInterval 为毫秒                                │
│  3. 当 autoSave=false 时禁用自动保存                            │
│  4. 更新 EditorTab.isDirty 状态                                 │
│  5. 提供 onSaveSuccess/onSaveError 回调                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┬────────────────┐
          │                │                │                │
          ▼                ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Lexical      │  │ Excalidraw   │  │ Diagram      │  │ Code         │
│ Editor       │  │ Editor       │  │ Editor       │  │ Editor       │
│              │  │              │  │              │  │ (未来)       │
│ onSaveSuccess│  │ onSaveSuccess│  │ onSaveSuccess│  │ onSaveSuccess│
│ → 无特殊处理 │  │ → 无特殊处理 │  │ → 触发渲染   │  │ → 无特殊处理 │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

## Components and Interfaces

### 1. TabType 复用 NodeType

```typescript
// apps/desktop/src/types/editor-tab/editor-tab.interface.ts

import type { NodeType } from "@/types/node";

/**
 * TabType 复用 NodeType，排除 folder
 * 当 NodeType 新增类型时，TabType 自动包含
 */
export type TabType = Exclude<NodeType, "folder">;
```

### 2. useEditorSave Hook 接口（已存在，无需修改）

```typescript
// apps/desktop/src/hooks/use-editor-save.ts

export interface UseEditorSaveOptions {
  readonly nodeId: string;
  readonly contentType: ContentType;
  readonly initialContent?: string;
  readonly onSaveSuccess?: () => void;
  readonly onSaveError?: (error: Error) => void;
  readonly tabId?: string;
}

export interface UseEditorSaveReturn {
  updateContent: (content: string) => void;
  saveNow: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  setInitialContent: (content: string) => void;
}
```

### 3. 编辑器容器接口

每个编辑器容器组件需要：
- 接收 `nodeId` 和 `tabId` props
- 使用 `useEditorSave` hook
- 通过 `onSaveSuccess` 处理保存后的特殊逻辑（如 DiagramEditor 的预览渲染）

## Data Models

### EditorTab 接口更新

```typescript
export interface EditorTab {
  readonly id: string;
  readonly workspaceId: string;
  readonly nodeId: string;
  readonly title: string;
  readonly type: TabType;  // 复用 NodeType
  readonly isDirty?: boolean;
}
```

### ContentType 与 NodeType 映射

| NodeType | ContentType | 编辑器 |
|----------|-------------|--------|
| `file`, `diary`, `wiki`, `todo`, `note`, `ledger` | `lexical` | Lexical |
| `drawing` | `excalidraw` | Excalidraw |
| `mermaid`, `plantuml` | `text` | DiagramEditor |
| `code` (未来) | `text` | CodeEditor |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Settings Configuration Applied Correctly

*For any* valid settings configuration (autoSave boolean, autoSaveInterval 1-60), the useEditorSave hook SHALL correctly apply these settings: when autoSave is false, no automatic saves occur; when autoSave is true, saves are debounced by autoSaveInterval * 1000 milliseconds.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: isDirty State Synchronization

*For any* content change and save cycle, the isDirty state SHALL be correctly synchronized: after content change, isDirty becomes true; after successful save, isDirty becomes false; the hook's state and EditorTab store state SHALL always match.

**Validates: Requirements 2.1, 2.2, 2.4**

### Property 3: Callback Invocation on Save

*For any* save operation, the appropriate callback SHALL be invoked: onSaveSuccess when save succeeds, onSaveError with error details when save fails.

**Validates: Requirements 3.2, 3.4**

### Property 4: Migration Preserves Functionality

*For any* editor that is migrated to use useEditorSave, all existing save behaviors SHALL be preserved: auto-save timing, manual save (Ctrl+S), dirty state indication, and error handling.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

## Error Handling

### 保存失败处理

1. **网络错误**: 通过 `onSaveError` 回调通知编辑器，显示 toast 提示
2. **数据库错误**: 同上，并记录错误日志
3. **组件卸载时保存失败**: 记录错误日志，不阻塞卸载流程

### 状态恢复

- 保存失败后，`isDirty` 保持为 `true`
- 用户可以重试保存或继续编辑

## Testing Strategy

### 单元测试

1. **useEditorSave hook 测试**
   - 测试 autoSave=false 时不触发自动保存
   - 测试 autoSaveInterval 转换为毫秒
   - 测试 isDirty 状态同步
   - 测试回调函数调用

2. **TabType 类型测试**
   - 验证 TabType 排除 folder
   - 验证 TabType 包含所有其他 NodeType

### 属性测试

使用 fast-check 进行属性测试：

1. **Property 1**: 生成随机 settings 配置，验证 hook 行为
2. **Property 2**: 生成随机内容变更序列，验证 isDirty 状态
3. **Property 3**: 模拟成功/失败保存，验证回调调用
4. **Property 4**: 对比迁移前后的行为一致性

### 集成测试

1. **DiagramEditor 集成测试** - 验证保存后触发预览渲染
2. **Excalidraw 集成测试** - 验证 JSON 序列化保存
3. **Lexical 集成测试** - 验证富文本保存

## Migration Plan

### Phase 1: TabType 复用 NodeType

1. 修改 `editor-tab.interface.ts`，将 TabType 改为 `Exclude<NodeType, "folder">`
2. 删除独立的 TabType 定义
3. 运行类型检查，修复任何类型错误

### Phase 2: 迁移 ExcalidrawEditorContainer

1. 引入 `useEditorSave` hook
2. 移除自定义的 debounce/throttle 保存逻辑
3. 保留 Excalidraw 特有的 JSON 序列化逻辑
4. 测试验证

### Phase 3: 迁移 StoryWorkspaceContainer (Lexical)

1. 引入 `useEditorSave` hook
2. 移除自定义的定时器保存逻辑
3. 保留 Lexical 特有的 SerializedEditorState 处理
4. 测试验证

### Phase 4: 验证 DiagramEditor

1. 确认 DiagramEditor 已正确使用 `useEditorSave`
2. 验证 `onSaveSuccess` 触发预览渲染的逻辑正常工作
