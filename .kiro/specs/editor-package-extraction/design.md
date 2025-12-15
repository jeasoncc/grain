# Design Document: Editor Package Extraction

## Overview

本设计文档描述将编辑器模块从 `apps/desktop/src/components/editor` 抽取为独立的 Turborepo package (`packages/editor`) 的技术方案。

### Goals

1. 创建独立的 `@novel-editor/editor` 包
2. 保持与现有 desktop 应用的完全兼容
3. 提供清晰的模块结构和 TypeScript 类型支持
4. 支持多编辑器实例的独立状态管理

### Non-Goals

1. 不改变编辑器的核心功能逻辑
2. 不修改 Lexical 的使用方式
3. 不引入新的编辑器功能

## Architecture

### Package Structure

```
packages/editor/
├── package.json
├── tsconfig.json
├── vite.config.ts              # 构建配置
├── src/
│   ├── index.ts                # 主入口，导出所有公共 API
│   ├── components/
│   │   ├── Editor.tsx          # 核心编辑器组件
│   │   ├── EditorInstance.tsx  # 单个编辑器实例包装器
│   │   ├── MultiEditorContainer.tsx
│   │   └── index.ts
│   ├── nodes/
│   │   ├── mention-node.tsx
│   │   ├── tag-node.tsx
│   │   └── index.ts
│   ├── plugins/
│   │   ├── mentions-plugin.tsx
│   │   ├── mention-tooltip-plugin.tsx
│   │   ├── tag-picker-plugin.tsx
│   │   ├── tag-transform-plugin.tsx
│   │   └── index.ts
│   ├── themes/
│   │   ├── PlaygroundEditorTheme.ts
│   │   ├── PlaygroundEditorTheme.css
│   │   └── index.ts
│   └── types/
│       └── index.ts            # 公共类型定义
└── dist/                       # 构建输出
```

### Dependency Graph

```mermaid
graph TD
    subgraph "packages/editor"
        E[Editor] --> N[Nodes]
        E --> P[Plugins]
        E --> T[Themes]
        MEC[MultiEditorContainer] --> EI[EditorInstance]
        EI --> E
    end
    
    subgraph "Peer Dependencies"
        React[react]
        Lexical[lexical]
        LexicalReact[@lexical/react]
    end
    
    subgraph "apps/desktop"
        SW[StoryWorkspace] --> MEC
    end
    
    E --> React
    E --> Lexical
    E --> LexicalReact
```

## Components and Interfaces

### 1. Editor Component

核心编辑器组件，封装 LexicalComposer 和所有必要插件。

```typescript
export interface EditorProps {
  /** 初始编辑器状态 (JSON 字符串) */
  initialState?: string | null;
  /** 内容变化回调 */
  onChange?: (state: SerializedEditorState) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 编辑器命名空间 */
  namespace?: string;
}
```

### 2. EditorInstance Component

单个编辑器实例的包装器，管理滚动位置和可见性。

```typescript
export interface EditorInstanceProps {
  tabId: string;
  initialState?: string | null;
  isVisible: boolean;
  initialScrollTop?: number;
  onContentChange?: (state: SerializedEditorState) => void;
  onScrollChange?: (scrollTop: number) => void;
  placeholder?: string;
  readOnly?: boolean;
}
```

### 3. MultiEditorContainer Component

多编辑器容器，管理多个 EditorInstance 的生命周期。

```typescript
export interface EditorTab {
  id: string;
  title: string;
  type?: string;
  nodeId?: string;
}

export interface EditorInstanceState {
  serializedState?: SerializedEditorState;
  scrollTop?: number;
}

export interface MultiEditorContainerProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  editorStates: Record<string, EditorInstanceState>;
  onContentChange: (tabId: string, state: SerializedEditorState) => void;
  onScrollChange: (tabId: string, scrollTop: number) => void;
  placeholder?: string;
  readOnly?: boolean;
  emptyState?: React.ReactNode;
}
```

## Data Models

### Custom Node Types

```typescript
// MentionNode 序列化格式
export interface SerializedMentionNode extends SerializedLexicalNode {
  mentionName: string;
  mentionId?: string;
  type: 'mention';
  version: 1;
}

// TagNode 序列化格式
export interface SerializedTagNode extends SerializedLexicalNode {
  tagName: string;
  tagId?: string;
  type: 'tag';
  version: 1;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Package Export Completeness

*For any* expected public API (Editor, EditorInstance, MultiEditorContainer, nodes, plugins, themes), importing from `@novel-editor/editor` should provide access to that API.

**Validates: Requirements 1.2**

### Property 2: Custom Node API Completeness

*For any* custom node type (MentionNode, TagNode), the package should export the node class, `$createNode` function, and `$isNode` type guard.

**Validates: Requirements 2.3**

### Property 3: Editor State Independence

*For any* two editor instances with different tabIds, content changes in one instance should not affect the state of the other instance.

**Validates: Requirements 3.1**

### Property 4: Scroll Position Preservation

*For any* tab switch operation, the scroll position of the previously active editor should be preserved and restored when switching back.

**Validates: Requirements 3.2**

### Property 5: Content Change Callback

*For any* content modification in an editor instance, the `onContentChange` callback should be invoked with the updated serialized state.

**Validates: Requirements 3.3**

### Property 6: Undo/Redo History Independence

*For any* two editor instances, performing undo in one instance should not affect the content or history of the other instance.

**Validates: Requirements 3.4**

## Error Handling

### Build Errors

1. **Missing Peer Dependencies**: 如果消费应用未安装 peer dependencies，构建时应提供清晰的错误信息
2. **TypeScript 类型错误**: 确保所有导出的类型与实现一致

### Runtime Errors

1. **Editor Initialization Error**: 使用 `onError` 回调捕获 Lexical 初始化错误
2. **Invalid Initial State**: 当 `initialState` 不是有效的 JSON 时，优雅降级为空编辑器

## Testing Strategy

### Property-Based Testing Library

使用 **fast-check** 作为属性测试库，配合 **Vitest** 测试框架。

### Unit Tests

1. **组件渲染测试**: 验证 Editor、EditorInstance、MultiEditorContainer 正确渲染
2. **Props 传递测试**: 验证 props 正确传递到子组件
3. **回调触发测试**: 验证 onChange、onScrollChange 等回调正确触发

### Property-Based Tests

每个属性测试必须：
- 运行至少 100 次迭代
- 使用注释标注对应的 correctness property
- 格式：`**Feature: editor-package-extraction, Property {number}: {property_text}**`
