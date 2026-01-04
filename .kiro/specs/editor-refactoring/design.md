# Design Document: Editor Refactoring

## Overview

本设计文档描述 Grain 编辑器包的重构方案，建立清晰的编辑器分类体系。编辑器按**功能类型**（Document、Code、Diagram）和**底层技术**（Lexical、Tiptap、Monaco、CodeMirror）两个维度组织。

### 设计目标

1. **可插拔架构** - 通过统一接口，支持运行时切换不同编辑器实现
2. **内存优化** - 按需加载编辑器，减少初始包大小
3. **实验平台** - 便于对比不同编辑器在 WebView 中的性能表现
4. **向后兼容** - 保持现有功能和数据格式兼容
5. **文件类型匹配** - 根据文件后缀自动选择合适的编辑器

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Editor Architecture                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   apps/desktop  │
                                    │   (消费者)       │
                                    └────────┬────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         @grain/editor-core          │
                          │         (统一接口层)                 │
                          │                                     │
                          │  ┌─────────────────────────────┐   │
                          │  │ DocumentEditorAdapter       │   │
                          │  │ CodeEditorAdapter           │   │
                          │  │ DiagramEditorAdapter        │   │
                          │  │ SerializedContent           │   │
                          │  │ EditorProvider              │   │
                          │  │ FileTypeResolver            │   │
                          │  └─────────────────────────────┘   │
                          └──────────────────┬──────────────────┘
                                             │
          ┌──────────────────┬───────────────┼───────────────┬──────────────────┐
          │                  │               │               │                  │
          ▼                  ▼               ▼               ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ editor-lexical  │ │ editor-tiptap   │ │ editor-monaco   │ │editor-codemirror│ │excalidraw-editor│
│                 │ │                 │ │                 │ │                 │ │                 │
│ ├── /document   │ │ ├── /document   │ │ ├── /document   │ │ ├── /document   │ │ (独立，无替代)  │
│ ├── /code       │ │ ├── /code       │ │ ├── /code       │ │ ├── /code       │ │                 │
│ └── /diagram    │ │ └── /diagram    │ │ └── /diagram    │ │ └── /diagram    │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 编辑器能力矩阵

| 编辑器 | Document | Code | Diagram | 包大小 | 特点 |
|--------|----------|------|---------|--------|------|
| **Lexical** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ~200KB | Meta 维护，富文本强 |
| **Tiptap** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ~150KB | ProseMirror 封装，WebView 友好 |
| **Monaco** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~2MB | VS Code 同款，代码编辑强 |
| **CodeMirror** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ~300KB | 轻量级，性能好 |

### Monaco Document 模式

Monaco 的 Document 模式是 **Markdown 编辑 + 实时预览** 的分屏模式：

```
┌─────────────────────────────────────────────────────────────┐
│                    Monaco Document Editor                    │
├────────────────────────────┬────────────────────────────────┤
│                            │                                │
│   # Markdown Source        │   Rendered Preview             │
│                            │                                │
│   ## Heading               │   Heading                      │
│   - List item              │   • List item                  │
│   **bold** text            │   bold text                    │
│                            │                                │
│   ```js                    │   ┌──────────────────────┐    │
│   const x = 1;             │   │ const x = 1;         │    │
│   ```                      │   └──────────────────────┘    │
│                            │                                │
└────────────────────────────┴────────────────────────────────┘
```

## Components and Interfaces

### 1. Editor Core (`@grain/editor-core`)

#### 1.1 File Type Resolver

```typescript
// packages/editor-core/src/types/file-type.interface.ts

export type EditorType = 'document' | 'code' | 'diagram' | 'drawing';

export interface FileTypeMapping {
  readonly extensions: readonly string[];
  readonly editorType: EditorType;
  readonly defaultLanguage?: string;
  readonly diagramType?: DiagramType;
}

// 文件后缀到编辑器类型的映射
export const FILE_TYPE_MAPPINGS: readonly FileTypeMapping[] = [
  // Document (富文本)
  { extensions: ['.grain', '.note'], editorType: 'document' },
  
  // Markdown (可用 Document 或 Code 模式)
  { extensions: ['.md', '.mdx', '.markdown'], editorType: 'document', defaultLanguage: 'markdown' },
  
  // Code (代码文件)
  { extensions: ['.js', '.jsx'], editorType: 'code', defaultLanguage: 'javascript' },
  { extensions: ['.ts', '.tsx'], editorType: 'code', defaultLanguage: 'typescript' },
  { extensions: ['.py'], editorType: 'code', defaultLanguage: 'python' },
  { extensions: ['.rs'], editorType: 'code', defaultLanguage: 'rust' },
  { extensions: ['.go'], editorType: 'code', defaultLanguage: 'go' },
  { extensions: ['.java'], editorType: 'code', defaultLanguage: 'java' },
  { extensions: ['.c', '.h'], editorType: 'code', defaultLanguage: 'c' },
  { extensions: ['.cpp', '.hpp', '.cc'], editorType: 'code', defaultLanguage: 'cpp' },
  { extensions: ['.cs'], editorType: 'code', defaultLanguage: 'csharp' },
  { extensions: ['.rb'], editorType: 'code', defaultLanguage: 'ruby' },
  { extensions: ['.php'], editorType: 'code', defaultLanguage: 'php' },
  { extensions: ['.html', '.htm'], editorType: 'code', defaultLanguage: 'html' },
  { extensions: ['.css'], editorType: 'code', defaultLanguage: 'css' },
  { extensions: ['.scss', '.sass'], editorType: 'code', defaultLanguage: 'scss' },
  { extensions: ['.json'], editorType: 'code', defaultLanguage: 'json' },
  { extensions: ['.yaml', '.yml'], editorType: 'code', defaultLanguage: 'yaml' },
  { extensions: ['.toml'], editorType: 'code', defaultLanguage: 'toml' },
  { extensions: ['.sql'], editorType: 'code', defaultLanguage: 'sql' },
  { extensions: ['.sh', '.bash', '.zsh'], editorType: 'code', defaultLanguage: 'shell' },
  { extensions: ['.xml'], editorType: 'code', defaultLanguage: 'xml' },
  
  // Diagram (图表)
  { extensions: ['.mermaid', '.mmd'], editorType: 'diagram', diagramType: 'mermaid' },
  { extensions: ['.plantuml', '.puml', '.pu'], editorType: 'diagram', diagramType: 'plantuml' },
  
  // Drawing (绘图)
  { extensions: ['.excalidraw'], editorType: 'drawing' },
];

// 解析文件类型
export const resolveFileType = (filename: string): FileTypeMapping | null => {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return FILE_TYPE_MAPPINGS.find(m => m.extensions.includes(ext)) ?? null;
};

// 获取编辑器类型
export const getEditorType = (filename: string): EditorType => {
  const mapping = resolveFileType(filename);
  return mapping?.editorType ?? 'document'; // 默认使用 document
};
```

#### 1.2 DocumentEditorAdapter Interface

```typescript
// packages/editor-core/src/types/document.interface.ts

export interface DocumentEditorAdapter {
  // Content Operations
  getContent(): SerializedContent;
  setContent(content: SerializedContent): void;
  isEmpty(): boolean;
  
  // Rich Text Formatting
  toggleBold(): void;
  toggleItalic(): void;
  toggleStrike(): void;
  toggleCode(): void;
  
  // Block Operations
  insertHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void;
  insertList(type: 'bullet' | 'ordered' | 'task'): void;
  insertBlockquote(): void;
  insertHorizontalRule(): void;
  insertCodeBlock(language?: string): void;
  insertTable(rows: number, cols: number): void;
  
  // Link Operations
  insertLink(url: string, text?: string): void;
  
  // Event Handlers
  onChange(callback: (content: SerializedContent) => void): () => void;
  onFocus(callback: () => void): () => void;
  onBlur(callback: () => void): () => void;
  onSave(callback: () => void): () => void;
  
  // Lifecycle
  focus(): void;
  blur(): void;
  destroy(): void;
}

// Monaco Document 特有接口（Markdown 分屏预览）
export interface MarkdownDocumentEditorAdapter extends DocumentEditorAdapter {
  // 预览控制
  togglePreview(): void;
  isPreviewVisible(): boolean;
  setPreviewPosition(position: 'right' | 'bottom'): void;
  
  // 同步滚动
  enableSyncScroll(enabled: boolean): void;
}
```
```

#### 1.2 CodeEditorAdapter Interface

```typescript
// packages/editor-core/src/types/code.interface.ts

export type SupportedLanguage = 
  | 'javascript' | 'typescript' | 'python' | 'rust' | 'go'
  | 'java' | 'c' | 'cpp' | 'csharp' | 'ruby' | 'php'
  | 'html' | 'css' | 'scss' | 'json' | 'yaml' | 'toml'
  | 'markdown' | 'sql' | 'shell' | 'plaintext';

export interface CodeEditorAdapter {
  // Content Operations
  getContent(): string;
  setContent(content: string): void;
  
  // Language
  getLanguage(): SupportedLanguage;
  setLanguage(language: SupportedLanguage): void;
  
  // Code Operations
  formatCode(): Promise<void>;
  insertSnippet(snippet: string): void;
  getSelectedText(): string;
  replaceSelection(text: string): void;
  
  // Event Handlers
  onChange(callback: (content: string) => void): () => void;
  onFocus(callback: () => void): () => void;
  onBlur(callback: () => void): () => void;
  onSave(callback: () => void): () => void;
  
  // Lifecycle
  focus(): void;
  blur(): void;
  destroy(): void;
}
```

#### 1.3 DiagramEditorAdapter Interface

```typescript
// packages/editor-core/src/types/diagram.interface.ts

export type DiagramType = 'mermaid' | 'plantuml';

export interface DiagramEditorAdapter {
  // Content Operations
  getSource(): string;
  setSource(source: string): void;
  
  // Diagram Type
  getDiagramType(): DiagramType;
  setDiagramType(type: DiagramType): void;
  
  // Rendering
  render(): Promise<string>; // Returns SVG string
  getPreviewElement(): HTMLElement | null;
  
  // Event Handlers
  onChange(callback: (source: string) => void): () => void;
  onRenderComplete(callback: (svg: string) => void): () => void;
  onRenderError(callback: (error: Error) => void): () => void;
  
  // Lifecycle
  focus(): void;
  blur(): void;
  destroy(): void;
}
```

#### 1.4 SerializedContent Type

```typescript
// packages/editor-core/src/types/content.interface.ts

export type ContentFormat = 'json' | 'markdown' | 'html';

export interface SerializedContent {
  readonly format: ContentFormat;
  readonly data: string;
  readonly version: number;
}

// Factory functions
export const createJsonContent = (data: object): SerializedContent => ({
  format: 'json',
  data: JSON.stringify(data),
  version: 1,
});

export const createMarkdownContent = (markdown: string): SerializedContent => ({
  format: 'markdown',
  data: markdown,
  version: 1,
});

export const createHtmlContent = (html: string): SerializedContent => ({
  format: 'html',
  data: html,
  version: 1,
});
```

#### 1.5 EditorConfig Type

```typescript
// packages/editor-core/src/types/config.interface.ts

export type DocumentEditorType = 'lexical' | 'tiptap' | 'monaco' | 'codemirror';
export type CodeEditorType = 'lexical' | 'tiptap' | 'monaco' | 'codemirror';
export type DiagramEditorType = 'lexical' | 'tiptap' | 'monaco' | 'codemirror';

export interface EditorConfig {
  readonly documentEditor: DocumentEditorType;
  readonly codeEditor: CodeEditorType;
  readonly diagramEditor: DiagramEditorType;
}

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  documentEditor: 'lexical',
  codeEditor: 'monaco',
  diagramEditor: 'monaco',
};

// 编辑器实现注册表
export interface EditorRegistry {
  document: Record<DocumentEditorType, () => Promise<DocumentEditorAdapter>>;
  code: Record<CodeEditorType, () => Promise<CodeEditorAdapter>>;
  diagram: Record<DiagramEditorType, () => Promise<DiagramEditorAdapter>>;
}
```

### 2. EditorProvider Component

```typescript
// packages/editor-core/src/components/editor-provider.tsx

import { createContext, useContext, ReactNode } from 'react';
import type { EditorConfig } from '../types';

interface EditorProviderProps {
  readonly config: EditorConfig;
  readonly children: ReactNode;
}

const EditorConfigContext = createContext<EditorConfig | null>(null);

export const EditorProvider = ({ config, children }: EditorProviderProps) => (
  <EditorConfigContext.Provider value={config}>
    {children}
  </EditorConfigContext.Provider>
);

export const useEditorConfig = (): EditorConfig => {
  const config = useContext(EditorConfigContext);
  if (!config) {
    throw new Error('useEditorConfig must be used within EditorProvider');
  }
  return config;
};
```

### 3. Package Structure

#### 3.1 editor-core

```
packages/editor-core/
├── package.json
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── document.interface.ts
│   │   ├── code.interface.ts
│   │   ├── diagram.interface.ts
│   │   ├── content.interface.ts
│   │   ├── config.interface.ts
│   │   ├── file-type.interface.ts
│   │   └── error.interface.ts
│   └── components/
│       └── editor-provider.tsx
└── vite.config.ts
```

#### 3.2 editor-lexical

```
packages/editor-lexical/
├── package.json
├── src/
│   ├── index.ts                    # Main exports
│   ├── document/
│   │   ├── index.ts
│   │   ├── lexical-document-editor.tsx
│   │   ├── lexical-document-adapter.ts
│   │   ├── nodes/                  # Custom nodes (Mention, Tag, etc.)
│   │   ├── plugins/                # Editor plugins
│   │   └── themes/                 # Editor themes
│   ├── code/
│   │   ├── index.ts
│   │   ├── lexical-code-editor.tsx
│   │   └── lexical-code-adapter.ts
│   └── diagram/
│       ├── index.ts
│       ├── lexical-diagram-editor.tsx
│       └── lexical-diagram-adapter.ts
└── vite.config.ts
```

#### 3.3 editor-tiptap

```
packages/editor-tiptap/
├── package.json
├── src/
│   ├── index.ts
│   ├── document/
│   │   ├── index.ts
│   │   ├── tiptap-document-editor.tsx
│   │   ├── tiptap-document-adapter.ts
│   │   └── extensions/             # Tiptap extensions
│   ├── code/
│   │   ├── index.ts
│   │   ├── tiptap-code-editor.tsx
│   │   └── tiptap-code-adapter.ts
│   └── diagram/
│       ├── index.ts
│       ├── tiptap-diagram-editor.tsx
│       └── tiptap-diagram-adapter.ts
└── vite.config.ts
```

#### 3.4 editor-monaco

```
packages/editor-monaco/
├── package.json
├── src/
│   ├── index.ts
│   ├── document/                   # Markdown 分屏预览模式
│   │   ├── index.ts
│   │   ├── monaco-document-editor.tsx
│   │   ├── monaco-document-adapter.ts
│   │   └── markdown-preview.tsx    # Markdown 渲染预览
│   ├── code/
│   │   ├── index.ts
│   │   ├── monaco-code-editor.tsx
│   │   └── monaco-code-adapter.ts
│   └── diagram/
│       ├── index.ts
│       ├── monaco-diagram-editor.tsx  # Split view: code + preview
│       └── monaco-diagram-adapter.ts
└── vite.config.ts
```

#### 3.5 editor-codemirror (新增)

```
packages/editor-codemirror/
├── package.json
├── src/
│   ├── index.ts
│   ├── document/                   # Markdown 分屏预览模式
│   │   ├── index.ts
│   │   ├── codemirror-document-editor.tsx
│   │   ├── codemirror-document-adapter.ts
│   │   └── markdown-preview.tsx
│   ├── code/
│   │   ├── index.ts
│   │   ├── codemirror-code-editor.tsx
│   │   └── codemirror-code-adapter.ts
│   └── diagram/
│       ├── index.ts
│       ├── codemirror-diagram-editor.tsx
│       └── codemirror-diagram-adapter.ts
└── vite.config.ts
```

### 4. CodeMirror 依赖

```json
// packages/editor-codemirror/package.json
{
  "name": "@grain/editor-codemirror",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "@codemirror/state": "^6.0.0",
    "@codemirror/view": "^6.0.0",
    "@codemirror/language": "^6.0.0",
    "@codemirror/commands": "^6.0.0",
    "@codemirror/autocomplete": "^6.0.0",
    "@codemirror/lang-javascript": "^6.0.0",
    "@codemirror/lang-python": "^6.0.0",
    "@codemirror/lang-rust": "^6.0.0",
    "@codemirror/lang-markdown": "^6.0.0",
    "@codemirror/lang-json": "^6.0.0",
    "@codemirror/lang-html": "^6.0.0",
    "@codemirror/lang-css": "^6.0.0",
    "@codemirror/lang-sql": "^6.0.0"
  }
}
```

## Data Models

### Content Serialization Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Content Serialization Flow                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘

Editor Internal State                    SerializedContent                    Storage
┌─────────────────────┐                 ┌─────────────────┐                 ┌─────────┐
│ Lexical EditorState │ ──serialize──▶  │ { format: 'json'│ ──save──▶       │ SQLite  │
│ Tiptap JSON         │                 │   data: '...',  │                 │ content │
│ Monaco Text         │ ◀──deserialize─ │   version: 1 }  │ ◀──load──       │ table   │
└─────────────────────┘                 └─────────────────┘                 └─────────┘
```

### Content Format Compatibility

| Source Editor | Target Format | Conversion |
|---------------|---------------|------------|
| Lexical | JSON | Native (Lexical state) |
| Lexical | Markdown | Via `@lexical/markdown` |
| Lexical | HTML | Via `@lexical/html` |
| Tiptap | JSON | Native (ProseMirror JSON) |
| Tiptap | Markdown | Via custom serializer |
| Tiptap | HTML | Via `editor.getHTML()` |
| Monaco | Text | Native (plain text) |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Content Round-Trip Consistency

*For any* valid editor content, serializing to `SerializedContent` and then deserializing back should produce semantically equivalent content.

**Validates: Requirements 1.6, 3.5, 4.7, 5.5**

### Property 2: Editor Type Selection

*For any* valid `EditorConfig`, the `EditorProvider` should render the correct editor implementation for each editor type (document, code, diagram).

**Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6**

### Property 3: Content Preservation on Editor Switch

*For any* valid content and any two compatible editor implementations, switching from one editor to another should preserve the content's semantic meaning.

**Validates: Requirements 6.7, 7.2**

### Property 4: Tiptap Formatting Operations

*For any* formatting operation (bold, italic, heading, list, etc.) applied to valid content, the Tiptap editor should correctly apply the format and the result should be serializable.

**Validates: Requirements 4.2, 4.4**

## Error Handling

### Error Types

```typescript
// packages/editor-core/src/types/error.interface.ts

export type EditorErrorCode =
  | 'CONTENT_PARSE_ERROR'      // Failed to parse content
  | 'CONTENT_SERIALIZE_ERROR'  // Failed to serialize content
  | 'UNSUPPORTED_FORMAT'       // Content format not supported
  | 'EDITOR_NOT_INITIALIZED'   // Editor not ready
  | 'RENDER_ERROR'             // Diagram render failed
  | 'MIGRATION_ERROR';         // Content migration failed

export interface EditorError {
  readonly code: EditorErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

export const createEditorError = (
  code: EditorErrorCode,
  message: string,
  details?: unknown
): EditorError => ({ code, message, details });
```

### Error Handling Strategy

1. **Content Parse Errors** - Return empty editor state with error notification
2. **Serialize Errors** - Retry with fallback format (JSON → Markdown → HTML)
3. **Unsupported Format** - Attempt automatic migration
4. **Render Errors** - Show error message in preview area

## Testing Strategy

### Unit Tests

- Interface compliance tests for each adapter
- Content serialization/deserialization tests
- Error handling tests

### Property-Based Tests

Using `fast-check` for property-based testing:

1. **Round-trip test**: Generate random content, serialize, deserialize, compare
2. **Editor switch test**: Generate content, switch editors, verify preservation
3. **Formatting test**: Generate content, apply random formats, verify result

### Integration Tests

- Editor rendering tests with React Testing Library
- Content persistence tests with mock storage
- Editor switching tests

### Test Configuration

- Minimum 100 iterations per property test
- Each test tagged with: **Feature: editor-refactoring, Property {number}: {description}**
