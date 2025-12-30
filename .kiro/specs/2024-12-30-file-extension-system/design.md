# Design Document

## Overview

为所有文件类型添加后缀名，实现扩展名驱动的编辑器选择。这使得 Grain 更像一个本地文件管理应用，用户可以通过修改后缀名来切换编辑器。

## Architecture

### 扩展名映射流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        文件名 (title)                            │
│                  diary-1735550400-14-30-00.grain                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   getEditorTypeByFilename()                      │
│                        纯函数映射                                │
│                                                                  │
│  .grain      → "lexical"                                        │
│  .excalidraw → "excalidraw"                                     │
│  .mermaid    → "diagram"                                        │
│  .plantuml   → "diagram"                                        │
│  .js/.ts/... → "code"                                           │
│  unknown     → "code" (fallback)                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      编辑器选择                                  │
│                                                                  │
│  "lexical"    → LexicalEditor (MultiEditorContainer)            │
│  "excalidraw" → ExcalidrawEditorContainer                       │
│  "diagram"    → DiagramEditorContainer                          │
│  "code"       → CodeEditorContainer (未来)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Monaco 语言检测流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        文件名 (title)                            │
│                  code-1735550400-14-30-00.js                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   getMonacoLanguage()                            │
│                        纯函数映射                                │
│                                                                  │
│  .js         → "javascript"                                     │
│  .ts         → "typescript"                                     │
│  .py         → "python"                                         │
│  .json       → "json"                                           │
│  .md         → "markdown"                                       │
│  .html       → "html"                                           │
│  .css        → "css"                                            │
│  .sql        → "sql"                                            │
│  .sh         → "shell"                                          │
│  .yaml/.yml  → "yaml"                                           │
│  unknown     → "plaintext"                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 扩展名常量定义

```typescript
// fn/editor/editor-extension.const.ts

/** 编辑器类型 */
export type EditorType = "lexical" | "excalidraw" | "diagram" | "code";

/** 文件扩展名常量 */
export const FILE_EXTENSIONS = {
  GRAIN: ".grain",
  EXCALIDRAW: ".excalidraw",
  MERMAID: ".mermaid",
  PLANTUML: ".plantuml",
  // Code extensions
  JS: ".js",
  TS: ".ts",
  PY: ".py",
  JSON: ".json",
  MD: ".md",
  HTML: ".html",
  CSS: ".css",
  SQL: ".sql",
  SH: ".sh",
  YAML: ".yaml",
  YML: ".yml",
} as const;

/** NodeType 到默认扩展名的映射 */
export const NODE_TYPE_EXTENSION_MAP: Record<string, string> = {
  diary: FILE_EXTENSIONS.GRAIN,
  wiki: FILE_EXTENSIONS.GRAIN,
  todo: FILE_EXTENSIONS.GRAIN,
  note: FILE_EXTENSIONS.GRAIN,
  ledger: FILE_EXTENSIONS.GRAIN,
  file: FILE_EXTENSIONS.GRAIN,
  drawing: FILE_EXTENSIONS.EXCALIDRAW,
  mermaid: FILE_EXTENSIONS.MERMAID,
  plantuml: FILE_EXTENSIONS.PLANTUML,
  code: FILE_EXTENSIONS.JS,
};
```

### 2. 扩展名到编辑器映射函数

```typescript
// fn/editor/get-editor-type.fn.ts

import type { EditorType } from "./editor-extension.const";

/** 扩展名到编辑器类型的映射 */
const EXTENSION_TO_EDITOR: Record<string, EditorType> = {
  ".grain": "lexical",
  ".excalidraw": "excalidraw",
  ".mermaid": "diagram",
  ".plantuml": "diagram",
  // Code extensions
  ".js": "code",
  ".ts": "code",
  ".py": "code",
  ".json": "code",
  ".md": "code",
  ".html": "code",
  ".css": "code",
  ".sql": "code",
  ".sh": "code",
  ".yaml": "code",
  ".yml": "code",
};

/**
 * 根据文件名获取编辑器类型
 * 纯函数，无副作用
 */
export const getEditorTypeByFilename = (filename: string): EditorType => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) return "code"; // 无扩展名，默认 code
  
  const ext = filename.slice(lastDotIndex).toLowerCase();
  return EXTENSION_TO_EDITOR[ext] ?? "code";
};
```

### 3. Monaco 语言检测函数

```typescript
// fn/editor/get-monaco-language.fn.ts

/** 扩展名到 Monaco 语言的映射 */
const EXTENSION_TO_MONACO: Record<string, string> = {
  ".js": "javascript",
  ".ts": "typescript",
  ".py": "python",
  ".json": "json",
  ".md": "markdown",
  ".html": "html",
  ".css": "css",
  ".sql": "sql",
  ".sh": "shell",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".mermaid": "markdown", // Mermaid 使用 markdown 高亮
  ".plantuml": "plaintext",
};

/**
 * 根据文件名获取 Monaco 语言标识符
 * 纯函数，无副作用
 */
export const getMonacoLanguage = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) return "plaintext";
  
  const ext = filename.slice(lastDotIndex).toLowerCase();
  return EXTENSION_TO_MONACO[ext] ?? "plaintext";
};
```

### 4. 模板配置更新

每个模板配置的 `generateTitle` 函数需要添加扩展名：

```typescript
// 示例：diary.config.ts
export const diaryConfig: TemplateConfig<DiaryTemplateParams> = {
  // ...
  generateTitle: (params: DiaryTemplateParams): string => {
    const date = params.date ?? new Date();
    const timestamp = Math.floor(date.getTime() / 1000);
    const time = dayjs(date).format("HH-mm-ss");
    return `diary-${timestamp}-${time}.grain`; // 添加 .grain 扩展名
  },
  // ...
};
```

## Data Models

### 扩展名映射表

| NodeType | 默认扩展名 | EditorType | Monaco Language |
|----------|-----------|------------|-----------------|
| `diary` | `.grain` | `lexical` | N/A |
| `wiki` | `.grain` | `lexical` | N/A |
| `todo` | `.grain` | `lexical` | N/A |
| `note` | `.grain` | `lexical` | N/A |
| `ledger` | `.grain` | `lexical` | N/A |
| `file` | `.grain` | `lexical` | N/A |
| `drawing` | `.excalidraw` | `excalidraw` | N/A |
| `mermaid` | `.mermaid` | `diagram` | `markdown` |
| `plantuml` | `.plantuml` | `diagram` | `plaintext` |
| `code` | `.js` | `code` | `javascript` |

### 代码扩展名映射

| 扩展名 | Monaco Language |
|--------|-----------------|
| `.js` | `javascript` |
| `.ts` | `typescript` |
| `.py` | `python` |
| `.json` | `json` |
| `.md` | `markdown` |
| `.html` | `html` |
| `.css` | `css` |
| `.sql` | `sql` |
| `.sh` | `shell` |
| `.yaml`, `.yml` | `yaml` |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Extension to Editor Type Mapping

*For any* filename with a known extension, `getEditorTypeByFilename` SHALL return the correct editor type: `.grain` → "lexical", `.excalidraw` → "excalidraw", `.mermaid`/`.plantuml` → "diagram", code extensions → "code".

**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

### Property 2: Unknown Extension Fallback

*For any* filename with an unknown or missing extension, `getEditorTypeByFilename` SHALL return "code" as the fallback editor type.

**Validates: Requirements 2.6**

### Property 3: Template Title Generation

*For any* template type and valid parameters, the generated title SHALL end with the correct extension for that type.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

### Property 4: Monaco Language Detection

*For any* filename with a known code extension, `getMonacoLanguage` SHALL return the correct Monaco language identifier.

**Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11**

### Property 5: Extension Change Updates Editor

*For any* file rename that changes the extension, the system SHALL use the new extension to determine the editor type.

**Validates: Requirements 4.1**

## Error Handling

### 无扩展名文件

- 默认使用 `code` 编辑器
- 默认使用 `plaintext` 语法高亮

### 未知扩展名

- 默认使用 `code` 编辑器
- 默认使用 `plaintext` 语法高亮

## Testing Strategy

### 单元测试

1. **getEditorTypeByFilename 测试**
   - 测试所有已知扩展名映射
   - 测试未知扩展名返回 "code"
   - 测试无扩展名返回 "code"
   - 测试大小写不敏感

2. **getMonacoLanguage 测试**
   - 测试所有已知代码扩展名映射
   - 测试未知扩展名返回 "plaintext"

3. **模板配置测试**
   - 测试每个模板生成的标题包含正确扩展名

### 属性测试

使用 fast-check 进行属性测试：

1. **Property 1 & 2**: 生成随机文件名，验证编辑器类型映射
2. **Property 3**: 生成随机模板参数，验证标题扩展名
3. **Property 4**: 生成随机代码文件名，验证 Monaco 语言
