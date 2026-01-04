# Design Document: Lexical Unified Editor

## Overview

本设计文档描述了 Grain 编辑器统一化重构的技术方案。目标是将 apps/desktop 主应用中的所有编辑功能统一使用 Lexical 编辑器实现，同时保留 packages/ 目录下的其他编辑器包作为后备军。

### 设计目标

1. **简化架构**：移除多编辑器配置，统一使用 Lexical
2. **减小包体积**：移除 Monaco 依赖
3. **保持灵活性**：editor-core 提供完整抽象层
4. **向后兼容**：保留其他编辑器包供未来使用

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              编辑器架构（Lexical Only）                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              packages/ (后备军，保留)                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│   │ editor-monaco   │  │ editor-tiptap   │  │editor-codemirror│  │editor-lexical│  │
│   │   (后备)        │  │   (后备)        │  │   (后备)        │  │  ✅ 使用中    │  │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│           │                    │                    │                   │          │
│           └────────────────────┴────────────────────┴───────────────────┘          │
│                                         │                                          │
│                                         ▼                                          │
│                          ┌─────────────────────────────┐                           │
│                          │       editor-core           │                           │
│                          │      (核心接口层)            │                           │
│                          │                             │                           │
│                          │  ┌───────────────────────┐  │                           │
│                          │  │ DocumentEditorAdapter │  │  ← 文档编辑器接口          │
│                          │  │ CodeEditorAdapter     │  │  ← 代码编辑器接口          │
│                          │  │ DiagramEditorAdapter  │  │  ← 图表编辑器接口          │
│                          │  │ FileTypeMapping       │  │  ← 文件类型映射            │
│                          │  │ ContentFormat         │  │  ← 内容格式定义            │
│                          │  └───────────────────────┘  │                           │
│                          └─────────────────────────────┘                           │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ 只引用 editor-lexical
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              apps/desktop (主应用)                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   用户操作                                                                           │
│       │                                                                             │
│       ▼                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                        story-workspace.container                             │   │
│   │                                                                             │   │
│   │   文件类型判断（仅区分 Excalidraw）                                           │   │
│   │       │                                                                     │   │
│   │       ├── .excalidraw ──────────▶ ExcalidrawEditorContainer                │   │
│   │       │                                                                     │   │
│   │       └── 其他所有文件 ──────────▶ MultiEditorContainer (Lexical)           │   │
│   │           │                                                                 │   │
│   │           ├── .grain (文档)                                                 │   │
│   │           ├── .js/.ts/.py (代码)  ← 全部用 Lexical 代码块                   │   │
│   │           ├── .mermaid/.plantuml (图表) ← 全部用 Lexical 代码块             │   │
│   │           └── .md/.json/.yaml (其他)                                        │   │
│   │                                                                             │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│   Settings 页面                                                                      │
│       │                                                                             │
│       └── ❌ 移除编辑器选择配置                                                      │
│           ✅ 保留：排版设置、行为设置、折叠图标风格                                   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. EditorType 类型定义

```typescript
// apps/desktop/src/fn/editor/editor-extension.const.ts

/**
 * 编辑器类型 - 只有两种
 * - lexical: Lexical 富文本编辑器（所有文本文件）
 * - excalidraw: Excalidraw 绘图编辑器（.excalidraw 文件）
 */
export type EditorType = "lexical" | "excalidraw";
```

### 2. 文件扩展名映射

```typescript
// apps/desktop/src/fn/editor/editor-extension.const.ts

/**
 * 扩展名到编辑器类型的映射
 * 只有 .excalidraw 使用 Excalidraw，其他全部使用 Lexical
 */
export const EXTENSION_TO_EDITOR_MAP: Record<string, EditorType> = {
  // Excalidraw 绘图编辑器
  ".excalidraw": "excalidraw",
  
  // 所有其他文件类型都使用 Lexical 编辑器
  ".grain": "lexical",
  ".mermaid": "lexical",
  ".plantuml": "lexical",
  ".js": "lexical",
  ".ts": "lexical",
  // ... 其他扩展名
};
```

### 3. 编辑器类型判断函数

```typescript
// apps/desktop/src/fn/editor/get-editor-type.fn.ts

/**
 * 根据文件名获取编辑器类型
 * 
 * @param filename - 文件名
 * @returns "excalidraw" 如果是 .excalidraw 文件，否则返回 "lexical"
 */
export const getEditorTypeByFilename = (filename: string): EditorType => {
  const extension = getFileExtension(filename);
  if (!extension) return "lexical";
  return EXTENSION_TO_EDITOR_MAP[extension] ?? "lexical";
};
```

### 4. StoryWorkspace 容器组件

```typescript
// apps/desktop/src/components/story-workspace/story-workspace.container.fn.tsx

/**
 * 工作空间容器 - 只使用两种编辑器
 */
const renderEditorContent = () => {
  if (!activeTab) {
    return <EmptyState />;
  }

  // 只有 .excalidraw 文件使用 Excalidraw 编辑器
  if (isExcalidrawTab) {
    return <ExcalidrawEditorContainer nodeId={activeTab.nodeId} />;
  }

  // 所有其他文件都使用 Lexical 编辑器
  return (
    <MultiEditorContainer
      tabs={lexicalTabs}
      activeTabId={activeTabId}
      editorStates={editorStates}
      onContentChange={handleMultiEditorContentChange}
      // ...
    />
  );
};
```

### 5. Editor Core 接口层

```typescript
// packages/editor-core/src/types/document.interface.ts

/**
 * 文档编辑器适配器接口
 * 定义富文本编辑的通用契约
 */
export interface DocumentEditorAdapter {
  getContent(): SerializedContent;
  setContent(content: SerializedContent): void;
  isEmpty(): boolean;
  toggleBold(): void;
  toggleItalic(): void;
  // ... 其他方法
  onChange(callback: (content: SerializedContent) => void): () => void;
  focus(): void;
  blur(): void;
  destroy(): void;
}
```

```typescript
// packages/editor-core/src/types/code.interface.ts

/**
 * 代码编辑器适配器接口
 * 定义代码编辑的通用契约
 */
export interface CodeEditorAdapter {
  getContent(): string;
  setContent(content: string): void;
  getLanguage(): SupportedLanguage;
  setLanguage(language: SupportedLanguage): void;
  formatCode(): Promise<void>;
  // ... 其他方法
  onChange(callback: (content: string) => void): () => void;
  focus(): void;
  blur(): void;
  destroy(): void;
}
```

```typescript
// packages/editor-core/src/types/diagram.interface.ts

/**
 * 图表编辑器适配器接口
 * 定义图表编辑的通用契约
 */
export interface DiagramEditorAdapter {
  getSource(): string;
  setSource(source: string): void;
  getDiagramType(): DiagramType;
  setDiagramType(type: DiagramType): void;
  render(): Promise<string>;
  // ... 其他方法
  onChange(callback: (source: string) => void): () => void;
  focus(): void;
  blur(): void;
  destroy(): void;
}
```

## Data Models

### EditorType 枚举

| 值 | 描述 | 使用场景 |
|---|------|---------|
| `"lexical"` | Lexical 编辑器 | 所有文本文件 |
| `"excalidraw"` | Excalidraw 编辑器 | .excalidraw 文件 |

### 文件扩展名分类

| 分类 | 扩展名 | 编辑器 |
|------|--------|--------|
| 富文本 | .grain, .note | Lexical |
| Markdown | .md, .mdx | Lexical |
| 代码 | .js, .ts, .py, .rs, .go, ... | Lexical |
| 图表 | .mermaid, .plantuml | Lexical |
| 绘图 | .excalidraw | Excalidraw |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Editor Type Selection Correctness

*For any* filename with extension, `getEditorTypeByFilename` SHALL return `"excalidraw"` if and only if the extension is `.excalidraw`, otherwise it SHALL return `"lexical"`.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 6.5, 7.1, 7.2, 7.3, 7.4**

### Property 2: Extension Extraction Correctness

*For any* filename, `getFileExtension` SHALL return the lowercase extension including the dot (e.g., ".js"), or empty string if no extension exists.

**Validates: Requirements 1.1, 1.2**

### Property 3: Excalidraw File Detection

*For any* filename, `isExcalidrawFile` SHALL return `true` if and only if the extension is `.excalidraw`.

**Validates: Requirements 1.2, 7.4**

### Property 4: Lexical File Detection

*For any* filename, `isLexicalFile` SHALL return `true` if and only if `getEditorTypeByFilename` returns `"lexical"`.

**Validates: Requirements 1.1, 1.3, 1.4**

## Error Handling

### 文件类型识别错误

| 场景 | 处理方式 |
|------|---------|
| 无扩展名文件 | 默认使用 Lexical 编辑器 |
| 未知扩展名 | 默认使用 Lexical 编辑器 |
| 空文件名 | 默认使用 Lexical 编辑器 |

### 编辑器加载错误

| 场景 | 处理方式 |
|------|---------|
| Lexical 加载失败 | 显示错误提示，允许重试 |
| Excalidraw 加载失败 | 显示错误提示，允许重试 |

## Testing Strategy

### 单元测试

1. **get-editor-type.fn.test.ts**
   - 测试各种扩展名的编辑器类型判断
   - 测试边界情况（无扩展名、空字符串等）

2. **editor-extension.const.test.ts**
   - 验证扩展名映射的完整性
   - 验证类型定义的正确性

### 属性测试

使用 fast-check 进行属性测试，验证编辑器类型选择的正确性：

```typescript
// get-editor-type.fn.test.ts

import fc from "fast-check";

describe("getEditorTypeByFilename - Property Tests", () => {
  /**
   * Property 1: Editor Type Selection Correctness
   * Feature: lexical-unified-editor, Property 1
   * Validates: Requirements 1.1, 1.2
   */
  it("should return excalidraw only for .excalidraw files", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (basename) => {
          const excalidrawFile = `${basename}.excalidraw`;
          const otherFile = `${basename}.grain`;
          
          expect(getEditorTypeByFilename(excalidrawFile)).toBe("excalidraw");
          expect(getEditorTypeByFilename(otherFile)).toBe("lexical");
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 集成测试

1. 验证 StoryWorkspace 正确渲染不同类型的编辑器
2. 验证文件创建流程使用正确的编辑器

### 测试配置

- 使用 Vitest 作为测试框架
- 使用 fast-check 进行属性测试
- 每个属性测试运行至少 100 次迭代
