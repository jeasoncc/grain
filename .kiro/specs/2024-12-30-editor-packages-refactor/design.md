# Design Document

## Overview

将编辑器组件迁移到 packages 目录作为独立包，并新增 Code 类型支持代码编辑。这使得编辑器可以在不同应用间复用，同时保持统一的保存逻辑。

## Architecture

### 目标目录结构

```
packages/
├── editor/              # Lexical 富文本编辑器（已有）
├── diagram-editor/      # Mermaid/PlantUML 图表编辑器（待迁移）
│   ├── src/
│   │   ├── diagram-editor.view.fn.tsx
│   │   ├── diagram-editor.types.ts
│   │   └── index.ts
│   └── package.json
├── excalidraw-editor/   # Excalidraw 绘图编辑器（待迁移）
│   ├── src/
│   │   ├── excalidraw-editor.view.fn.tsx
│   │   ├── excalidraw-editor.types.ts
│   │   └── index.ts
│   └── package.json
└── code-editor/         # Monaco 代码编辑器（新建）
    ├── src/
    │   ├── code-editor.view.fn.tsx
    │   ├── code-editor.types.ts
    │   └── index.ts
    └── package.json
```

### 编辑器包职责划分

```
┌─────────────────────────────────────────────────────────────────┐
│                    packages/xxx-editor                           │
│                                                                  │
│  职责：                                                          │
│  - 纯 UI 渲染                                                   │
│  - 接收 props（内容、回调）                                      │
│  - 不关心保存逻辑                                                │
│  - 不关心配置来源                                                │
│                                                                  │
│  导出：                                                          │
│  - XxxEditorView (纯展示组件)                                   │
│  - XxxEditorProps (类型定义)                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ props
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    apps/desktop/components                       │
│                                                                  │
│  职责：                                                          │
│  - 连接 hooks/stores                                            │
│  - 使用 useEditorSave hook                                      │
│  - 传递回调给 View 组件                                         │
│                                                                  │
│  组件：                                                          │
│  - XxxEditorContainer (容器组件)                                │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Code NodeType 添加

```typescript
// types/node/node.schema.ts

export const NodeTypeSchema = z.enum([
  "folder",
  "file",
  "diary",
  "wiki",
  "todo",
  "note",
  "ledger",
  "drawing",
  "plantuml",
  "mermaid",
  "code",  // 新增
]);
```

### 2. CodeEditor View 组件

```typescript
// packages/code-editor/src/code-editor.view.fn.tsx

import Editor from "@monaco-editor/react";
import { memo, useCallback, useEffect, useRef } from "react";

export interface CodeEditorViewProps {
  readonly code: string;
  readonly language: string;
  readonly theme?: "light" | "dark";
  readonly onCodeChange: (code: string) => void;
  readonly onSave: () => void;
}

export const CodeEditorView = memo(function CodeEditorView({
  code,
  language,
  theme = "light",
  onCodeChange,
  onSave,
}: CodeEditorViewProps) {
  const editorRef = useRef<any>(null);

  // Ctrl+S 快捷键
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    },
    [onSave]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Editor
      height="100%"
      language={language}
      theme={theme === "dark" ? "vs-dark" : "light"}
      value={code}
      onChange={(value) => onCodeChange(value ?? "")}
      onMount={(editor) => {
        editorRef.current = editor;
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        wordWrap: "on",
        automaticLayout: true,
      }}
    />
  );
});
```

### 3. CodeEditor Container 组件

```typescript
// apps/desktop/src/components/code-editor/code-editor.container.fn.tsx

import { CodeEditorView } from "@grain/code-editor";
import { memo, useCallback, useEffect, useState } from "react";
import { getContentByNodeId } from "@/db";
import { getMonacoLanguage } from "@/fn/editor";
import { useEditorSave } from "@/hooks/use-editor-save";
import { useTheme } from "@/hooks/use-theme";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";

export interface CodeEditorContainerProps {
  readonly nodeId: string;
  readonly filename: string;
  readonly className?: string;
}

export const CodeEditorContainer = memo(function CodeEditorContainer({
  nodeId,
  filename,
  className,
}: CodeEditorContainerProps) {
  const { isDark } = useTheme();
  const activeTabId = useEditorTabsStore((s) => s.activeTabId);
  
  const [code, setCode] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 根据文件名检测语言
  const language = getMonacoLanguage(filename);
  
  // 统一保存逻辑
  const { updateContent, saveNow, setInitialContent } = useEditorSave({
    nodeId,
    contentType: "text",
    tabId: activeTabId ?? undefined,
    onSaveSuccess: () => {
      console.log("[CodeEditor] 保存成功");
    },
    onSaveError: (error) => {
      console.error("[CodeEditor] 保存失败:", error);
    },
  });
  
  // 加载内容
  useEffect(() => {
    const loadContent = async () => {
      const result = await getContentByNodeId(nodeId)();
      if (result._tag === "Right" && result.right) {
        setCode(result.right.content);
        setInitialContent(result.right.content);
      }
      setIsInitialized(true);
    };
    loadContent();
  }, [nodeId, setInitialContent]);
  
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      updateContent(newCode);
    },
    [updateContent]
  );
  
  if (!isInitialized) {
    return <div className={className}>Loading...</div>;
  }
  
  return (
    <div className={className}>
      <CodeEditorView
        code={code}
        language={language}
        theme={isDark ? "dark" : "light"}
        onCodeChange={handleCodeChange}
        onSave={saveNow}
      />
    </div>
  );
});
```

### 4. Code 模板配置

```typescript
// actions/templated/code.config.ts

import dayjs from "dayjs";
import { z } from "zod";
import { getDateFolderStructure } from "@/fn/date";
import type { TemplateConfig } from "./create-templated-file.action";

export interface CodeTemplateParams {
  readonly date?: Date;
}

export const codeParamsSchema = z.object({
  date: z.date().optional(),
});

export const codeConfig: TemplateConfig<CodeTemplateParams> = {
  name: "Code",
  rootFolder: "Code",
  fileType: "code",
  tag: "code",
  generateTemplate: (params: CodeTemplateParams): string => {
    const date = params.date ?? new Date();
    const formattedDate = dayjs(date).format("YYYY-MM-DD HH:mm:ss");
    return `// Created by Grain - ${formattedDate}\n\n`;
  },
  generateFolderPath: (params: CodeTemplateParams): string[] => {
    const date = params.date ?? new Date();
    const structure = getDateFolderStructure(date);
    return [structure.yearFolder, structure.monthFolder, structure.dayFolder];
  },
  generateTitle: (params: CodeTemplateParams): string => {
    const date = params.date ?? new Date();
    const timestamp = Math.floor(date.getTime() / 1000);
    const time = dayjs(date).format("HH-mm-ss");
    return `code-${timestamp}-${time}.js`;
  },
  paramsSchema: codeParamsSchema,
  foldersCollapsed: true,
};
```

### 5. ActivityBar Code 按钮

```typescript
// 在 ActivityBar 组件中添加 Code 按钮
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCreateCode}
    >
      <Code className="size-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent side="right">Create Code File</TooltipContent>
</Tooltip>
```

## Data Models

### NodeType 更新

```typescript
export type NodeType =
  | "folder"
  | "file"
  | "diary"
  | "wiki"
  | "todo"
  | "note"
  | "ledger"
  | "drawing"
  | "plantuml"
  | "mermaid"
  | "code";  // 新增
```

### Code 文件结构

```
Code/
├── year-2024-Dragon/
│   └── month-12-December/
│       └── day-30-Monday/
│           └── code-1735550400-14-30-00.js
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Code Template Generation

*For any* date, the code template SHALL generate: correct folder path (Code/year/month/day), correct title pattern (code-{timestamp}-{time}.js), and correct initial content (// Created by Grain - {date}).

**Validates: Requirements 3.3, 3.4, 3.5**

### Property 2: Language Detection from Extension

*For any* filename with a known code extension, the CodeEditor SHALL detect and use the correct Monaco language for syntax highlighting.

**Validates: Requirements 5.2, 5.3**

## Error Handling

### 编辑器包加载失败

- 显示错误提示
- 提供重试按钮

### 语言检测失败

- 默认使用 plaintext
- 不阻塞编辑功能

## Testing Strategy

### 单元测试

1. **Code 模板配置测试**
   - 测试 generateFolderPath 生成正确路径
   - 测试 generateTitle 生成正确文件名
   - 测试 generateTemplate 生成正确内容

2. **CodeEditor 组件测试**
   - 测试语言检测
   - 测试 Ctrl+S 快捷键

### 集成测试

1. **Code 文件创建流程**
   - 点击 ActivityBar Code 按钮
   - 验证文件创建在正确位置
   - 验证文件内容正确

2. **编辑器包导入测试**
   - 验证 @grain/code-editor 可正确导入
   - 验证组件渲染正常
