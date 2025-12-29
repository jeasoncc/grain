# Design Document

## Overview

本设计文档描述如何引入 Monaco Editor 并重构编辑器架构，实现统一的代码编辑和保存逻辑。

## 设计哲学：数据如气息流动

软件的生命在于数据的流动，而非功能的堆砌。

正如中国古老思想中"气息"在生命体内的流动——从口入，经五脏六腑，复从口出——软件中的数据也应当如此：**从用户而来，经过层层管道的纯净变换，最终回到用户身上**。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          数据流动的生命周期                                   │
│                                                                             │
│    用户输入                                                      用户感知    │
│       │                                                            ▲       │
│       │  ┌──────────────────────────────────────────────────────┐  │       │
│       │  │                    数据管道                           │  │       │
│       ▼  │                                                      │  │       │
│    ┌─────┴─────┐    ┌──────────┐    ┌──────────┐    ┌──────────┴────┐     │
│    │  Editor   │───▶│  Action  │───▶│    DB    │───▶│    Store      │     │
│    │ (入口)    │    │ (变换)   │    │ (持久化) │    │  (状态/出口)   │     │
│    └───────────┘    └──────────┘    └──────────┘    └───────────────┘     │
│                                                                             │
│    气息从口入，经五脏六腑，复从口出                                           │
│    数据从用户来，经管道变换，回到用户                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**核心原则**：
1. **单向流动** - 数据只能沿着管道单向流动，不能逆流
2. **管道纯净** - 每个管道节点（函数）都是纯函数，不产生副作用
3. **统一入口** - 所有编辑器的数据变更都流向同一个保存管道
4. **统一出口** - 所有保存结果都通过同一个 Store 反馈给 UI

## Architecture

### 统一的数据流架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           StoryWorkspace                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    统一快捷键处理层                                    │   │
│  │  Ctrl+S → useManualSave hook → EditorSaveService                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│         ┌────────────────────┼────────────────────┐                        │
│         │                    │                    │                        │
│         ▼                    ▼                    ▼                        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│  │   Lexical   │     │  Excalidraw │     │   Monaco    │                  │
│  │   Editor    │     │   Editor    │     │   Editor    │                  │
│  │ (diary/wiki)│     │  (drawing)  │     │(mermaid/uml)│                  │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                  │
│         │                   │                   │                          │
│         │    onChange       │    onChange       │    onChange              │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             │                                              │
│                             ▼                                              │
│                  ┌─────────────────────┐                                   │
│                  │  EditorSaveService  │  ← 统一的保存管道                  │
│                  │  (防抖 + 序列化)     │                                   │
│                  └──────────┬──────────┘                                   │
│                             │                                              │
│                             ▼                                              │
│                  ┌─────────────────────┐                                   │
│                  │ updateContentByNodeId │  ← DB 函数                      │
│                  └──────────┬──────────┘                                   │
│                             │                                              │
│                             ▼                                              │
│                  ┌─────────────────────┐                                   │
│                  │     SaveStore       │  ← 状态反馈                       │
│                  │  (saving/saved/err) │                                   │
│                  └──────────┬──────────┘                                   │
│                             │                                              │
│                             ▼                                              │
│                  ┌─────────────────────┐                                   │
│                  │  SaveStatusIndicator │  ← UI 展示                       │
│                  └─────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 快捷键事件流（Ctrl+S 保存）

所有编辑器的 Ctrl+S 都流向同一个保存管道，确保数据流动的一致性：

```
用户按下 Ctrl+S
       │
       ▼
┌──────────────────┐
│  Editor 组件      │  Monaco/Lexical/Excalidraw 各自捕获
└────────┬─────────┘
         │ onSave callback
         ▼
┌──────────────────┐
│  useEditorSave   │  统一的 Hook，连接 SaveService
└────────┬─────────┘
         │ saveNow()
         ▼
┌──────────────────┐
│ EditorSaveService│  纯函数，处理保存逻辑
└────────┬─────────┘
         │ updateContentByNodeId()
         ▼
┌──────────────────┐
│    IndexedDB     │  持久化
└────────┬─────────┘
         │ 成功/失败
         ▼
┌──────────────────┐
│    SaveStore     │  更新状态
└────────┬─────────┘
         │ status: saved/error
         ▼
┌──────────────────┐
│ SaveStatusIndicator │  用户看到反馈
└──────────────────┘
```

### 组件层次结构

```
StoryWorkspace
├── EditorTabs
├── MultiEditorContainer (Lexical - diary/wiki/file)
├── ExcalidrawEditorContainer (drawing)
└── DiagramEditorContainer (mermaid/plantuml)
    ├── CodeEditorView (Monaco)
    └── DiagramPreviewView
```

## Component Design

### 1. CodeEditor 组件

**位置**: `components/code-editor/`

**文件结构**:
```
code-editor/
├── code-editor.types.ts
├── code-editor.view.fn.tsx      # Monaco 包装组件
├── code-editor.container.fn.tsx # 连接 hooks/stores
├── code-editor.languages.ts     # 自定义语言定义
└── index.ts
```

**类型定义**:
```typescript
// code-editor.types.ts

/** 支持的代码语言 */
export type CodeLanguage = 
  | "plantuml" 
  | "mermaid" 
  | "json" 
  | "markdown" 
  | "javascript" 
  | "typescript";

/** CodeEditorView Props */
export interface CodeEditorViewProps {
  /** 代码内容 */
  readonly value: string;
  /** 代码语言 */
  readonly language: CodeLanguage;
  /** 主题 */
  readonly theme: "light" | "dark";
  /** 内容变化回调 */
  readonly onChange: (value: string) => void;
  /** 保存回调 (Ctrl+S) */
  readonly onSave?: () => void;
  /** 是否只读 */
  readonly readOnly?: boolean;
  /** 占位符文本 */
  readonly placeholder?: string;
  /** 编辑器选项 */
  readonly options?: MonacoEditorOptions;
}

/** CodeEditorContainer Props */
export interface CodeEditorContainerProps {
  /** 节点 ID */
  readonly nodeId: string;
  /** 代码语言 */
  readonly language: CodeLanguage;
  /** 样式类名 */
  readonly className?: string;
}
```

**View 组件**:
```typescript
// code-editor.view.fn.tsx
import Editor from "@monaco-editor/react";
import { memo, useCallback } from "react";
import type { CodeEditorViewProps } from "./code-editor.types";

export const CodeEditorView = memo(function CodeEditorView({
  value,
  language,
  theme,
  onChange,
  onSave,
  readOnly = false,
  placeholder,
  options,
}: CodeEditorViewProps) {
  // 处理键盘快捷键
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    // 注册 Ctrl+S 保存
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });
  }, [onSave]);

  return (
    <Editor
      value={value}
      language={language}
      theme={theme === "dark" ? "vs-dark" : "light"}
      onChange={(value) => onChange(value ?? "")}
      onMount={handleEditorMount}
      options={{
        readOnly,
        minimap: { enabled: false },
        lineNumbers: "on",
        wordWrap: "on",
        fontSize: 14,
        tabSize: 2,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        ...options,
      }}
    />
  );
});
```

### 2. EditorSaveService 重构

**位置**: `fn/save/editor-save.service.ts`

**设计原则**:
- 纯函数式设计
- 支持所有内容类型
- 统一的防抖和状态管理

```typescript
// fn/save/editor-save.service.ts
import { debounce } from "es-toolkit";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { updateContentByNodeId } from "@/db";
import type { ContentType } from "@/types/content";

/** 保存配置 */
export interface SaveConfig {
  readonly nodeId: string;
  readonly contentType: ContentType;
  readonly autoSaveDelay: number;
  readonly onSaving?: () => void;
  readonly onSaved?: () => void;
  readonly onError?: (error: Error) => void;
}

/** 创建保存服务实例 */
export const createEditorSaveService = (config: SaveConfig) => {
  let lastSavedContent = "";
  let pendingContent: string | null = null;

  const saveContent = async (content: string): Promise<void> => {
    if (content === lastSavedContent) return;
    
    config.onSaving?.();
    
    const result = await updateContentByNodeId(
      config.nodeId,
      content,
      config.contentType
    )();

    if (result._tag === "Right") {
      lastSavedContent = content;
      pendingContent = null;
      config.onSaved?.();
    } else {
      config.onError?.(new Error(result.left.message));
    }
  };

  const debouncedSave = debounce(saveContent, config.autoSaveDelay);

  return {
    /** 更新内容（触发防抖保存） */
    updateContent: (content: string) => {
      pendingContent = content;
      debouncedSave(content);
    },
    
    /** 立即保存 */
    saveNow: async () => {
      debouncedSave.cancel();
      if (pendingContent !== null) {
        await saveContent(pendingContent);
      }
    },
    
    /** 设置初始内容（不触发保存） */
    setInitialContent: (content: string) => {
      lastSavedContent = content;
    },
    
    /** 清理资源 */
    dispose: () => {
      debouncedSave.cancel();
    },
    
    /** 是否有未保存的更改 */
    hasUnsavedChanges: () => pendingContent !== null && pendingContent !== lastSavedContent,
  };
};
```

### 3. DiagramEditor 重构

**重构后的结构**:
```
diagram-editor/
├── diagram-editor.types.ts
├── diagram-editor.view.fn.tsx      # 分屏布局
├── diagram-editor.container.fn.tsx # 数据管理
├── diagram-preview.view.fn.tsx     # 预览组件
└── index.ts
```

**Container 组件重构**:
```typescript
// diagram-editor.container.fn.tsx
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { CodeEditorView } from "@/components/code-editor";
import { createEditorSaveService } from "@/fn/save";
import { useContentByNodeId } from "@/hooks/use-content";
import { useTheme } from "@/hooks/use-theme";
import { useSaveStore } from "@/stores/save.store";
import type { DiagramEditorContainerProps } from "./diagram-editor.types";
import { DiagramEditorView } from "./diagram-editor.view.fn";

export const DiagramEditorContainer = memo(function DiagramEditorContainer({
  nodeId,
  diagramType,
  className,
}: DiagramEditorContainerProps) {
  const content = useContentByNodeId(nodeId);
  const { isDark } = useTheme();
  const { markAsUnsaved, markAsSaving, markAsSaved } = useSaveStore();
  
  const [code, setCode] = useState("");
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  
  // 创建保存服务
  const saveService = useMemo(() => 
    createEditorSaveService({
      nodeId,
      contentType: "text",
      autoSaveDelay: 1000,
      onSaving: markAsSaving,
      onSaved: markAsSaved,
      onError: () => { /* handle error */ },
    }),
    [nodeId, markAsSaving, markAsSaved]
  );
  
  // 初始化内容
  useEffect(() => {
    if (content?.content) {
      setCode(content.content);
      saveService.setInitialContent(content.content);
    }
  }, [content, saveService]);
  
  // 清理
  useEffect(() => {
    return () => {
      saveService.saveNow();
      saveService.dispose();
    };
  }, [saveService]);
  
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    markAsUnsaved();
    saveService.updateContent(newCode);
    // 触发预览更新...
  }, [saveService, markAsUnsaved]);
  
  const handleManualSave = useCallback(() => {
    saveService.saveNow();
  }, [saveService]);
  
  return (
    <DiagramEditorView
      code={code}
      diagramType={diagramType}
      previewSvg={previewSvg}
      theme={isDark ? "dark" : "light"}
      onCodeChange={handleCodeChange}
      onSave={handleManualSave}
      // ...other props
    />
  );
});
```

### 4. Monaco 语言定义

**PlantUML 语法高亮**:
```typescript
// code-editor.languages.ts
import type { Monaco } from "@monaco-editor/react";

export const registerPlantUMLLanguage = (monaco: Monaco) => {
  monaco.languages.register({ id: "plantuml" });
  
  monaco.languages.setMonarchTokensProvider("plantuml", {
    keywords: [
      "@startuml", "@enduml", "@startmindmap", "@endmindmap",
      "participant", "actor", "boundary", "control", "entity", "database",
      "class", "interface", "enum", "abstract",
      "package", "namespace", "node", "folder", "frame", "cloud",
      "if", "else", "endif", "while", "endwhile", "repeat", "until",
      "fork", "again", "end", "split", "detach",
    ],
    arrows: ["->", "-->", "->>", "-->>", "<-", "<--", "<<-", "<<--", "..>", "<.."],
    
    tokenizer: {
      root: [
        [/@\w+/, "keyword"],
        [/\b(participant|actor|class|interface)\b/, "keyword"],
        [/->|-->|->>|-->>|<-|<--|<<-|<<--|\.\.>|<\.\./, "operator"],
        [/"[^"]*"/, "string"],
        [/'[^']*'/, "string"],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/\b\d+\b/, "number"],
      ],
      comment: [
        [/\*\//, "comment", "@pop"],
        [/./, "comment"],
      ],
    },
  });
};

export const registerMermaidLanguage = (monaco: Monaco) => {
  monaco.languages.register({ id: "mermaid" });
  
  monaco.languages.setMonarchTokensProvider("mermaid", {
    keywords: [
      "graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram",
      "erDiagram", "gantt", "pie", "journey", "gitGraph",
      "TB", "TD", "BT", "RL", "LR",
      "participant", "actor", "note", "loop", "alt", "opt", "par", "end",
      "class", "subgraph",
    ],
    
    tokenizer: {
      root: [
        [/\b(graph|flowchart|sequenceDiagram|classDiagram)\b/, "keyword"],
        [/\b(TB|TD|BT|RL|LR)\b/, "keyword"],
        [/-->|---|-\.-|==>|-.->/, "operator"],
        [/\[.*?\]/, "string"],
        [/\(.*?\)/, "string"],
        [/\{.*?\}/, "string"],
        [/%%.*$/, "comment"],
        [/"[^"]*"/, "string"],
        [/\b\d+\b/, "number"],
      ],
    },
  });
};
```

## File Structure

```
apps/desktop/src/
├── components/
│   ├── code-editor/                    # 新增
│   │   ├── code-editor.types.ts
│   │   ├── code-editor.view.fn.tsx
│   │   ├── code-editor.container.fn.tsx
│   │   ├── code-editor.languages.ts
│   │   └── index.ts
│   │
│   ├── diagram-editor/                 # 重构
│   │   ├── diagram-editor.types.ts
│   │   ├── diagram-editor.view.fn.tsx  # 使用 CodeEditorView
│   │   ├── diagram-editor.container.fn.tsx
│   │   ├── diagram-preview.view.fn.tsx # 新增：预览组件
│   │   └── index.ts
│   │
│   └── story-workspace/                # 更新
│       └── story-workspace.container.fn.tsx
│
├── fn/
│   └── save/
│       ├── editor-save.service.ts      # 重构：统一保存服务
│       ├── save.service.ts             # 现有
│       └── index.ts
│
└── hooks/
    └── use-editor-save.ts              # 新增：保存 hook
```

## Dependencies

### 新增依赖

```json
{
  "dependencies": {
    "@monaco-editor/react": "^4.6.0"
  }
}
```

### Monaco 配置

Monaco Editor 默认会从 CDN 加载 worker 文件。为了更好的性能和离线支持，可以配置本地 worker：

```typescript
// main.tsx 或 App.tsx
import { loader } from "@monaco-editor/react";

// 可选：配置 Monaco 加载路径
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
  },
});
```

## Migration Plan

### Phase 1: 基础设施 (Task 1-3)
1. 安装 Monaco 依赖
2. 创建 CodeEditor 组件
3. 实现语言定义

### Phase 2: 保存逻辑重构 (Task 4-5)
4. 重构 EditorSaveService
5. 创建 useEditorSave hook

### Phase 3: DiagramEditor 重构 (Task 6-8)
6. 重构 DiagramEditor 使用 CodeEditor
7. 提取 DiagramPreview 组件
8. 集成统一保存逻辑

### Phase 4: 测试和优化 (Task 9-10)
9. 添加单元测试
10. 性能优化和懒加载

## Diagram Rendering Strategy

### 渲染策略分离

根据图表类型采用不同的渲染策略：

| 图表类型 | 渲染方式 | 依赖 | 离线支持 |
|---------|---------|------|---------|
| Mermaid | 客户端渲染 | mermaid.js | ✅ 完全支持 |
| PlantUML | 服务器渲染 | Kroki API | ❌ 需要网络 |

### Mermaid 客户端渲染

```typescript
// fn/diagram/mermaid.render.fn.ts
import mermaid from "mermaid";

/** 初始化 Mermaid 配置 */
export const initMermaid = (theme: "light" | "dark") => {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === "dark" ? "dark" : "default",
    securityLevel: "loose", // 允许点击事件等
    fontFamily: "inherit",
  });
};

/** 渲染 Mermaid 图表 */
export const renderMermaid = async (
  code: string,
  containerId: string
): Promise<{ svg: string } | { error: string }> => {
  try {
    const { svg } = await mermaid.render(containerId, code);
    return { svg };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : "Mermaid render failed" 
    };
  }
};
```

### PlantUML Kroki 渲染

```typescript
// fn/diagram/plantuml.render.fn.ts
import { getKrokiPlantUMLUrl } from "./diagram.fn";

/** 渲染 PlantUML 图表（通过 Kroki） */
export const renderPlantUML = async (
  code: string,
  krokiServerUrl: string
): Promise<{ svg: string } | { error: string }> => {
  const url = getKrokiPlantUMLUrl(krokiServerUrl);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: code,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { error: errorText || `HTTP ${response.status}` };
    }
    
    const svg = await response.text();
    return { svg };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : "Network error" 
    };
  }
};
```

### 统一渲染接口

```typescript
// fn/diagram/diagram.render.fn.ts
import type { DiagramType } from "@/components/diagram-editor/diagram-editor.types";
import { renderMermaid } from "./mermaid.render.fn";
import { renderPlantUML } from "./plantuml.render.fn";

export interface RenderConfig {
  readonly diagramType: DiagramType;
  readonly code: string;
  readonly krokiServerUrl?: string;
  readonly containerId?: string;
}

export const renderDiagram = async (
  config: RenderConfig
): Promise<{ svg: string } | { error: string }> => {
  switch (config.diagramType) {
    case "mermaid":
      return renderMermaid(config.code, config.containerId ?? "mermaid-preview");
    
    case "plantuml":
      if (!config.krokiServerUrl) {
        return { error: "Kroki server URL is required for PlantUML" };
      }
      return renderPlantUML(config.code, config.krokiServerUrl);
    
    default:
      return { error: `Unsupported diagram type: ${config.diagramType}` };
  }
};
```

### DiagramEditor 中的使用

```typescript
// diagram-editor.container.fn.tsx
const updatePreview = useCallback(async (newCode: string) => {
  if (!newCode.trim()) {
    setPreviewSvg(null);
    return;
  }

  setIsLoading(true);
  setError(null);

  const result = await renderDiagram({
    diagramType,
    code: newCode,
    krokiServerUrl: diagramType === "plantuml" ? krokiServerUrl : undefined,
    containerId: `diagram-preview-${nodeId}`,
  });

  if ("svg" in result) {
    setPreviewSvg(result.svg);
  } else {
    setError({
      type: diagramType === "mermaid" ? "syntax" : "network",
      message: result.error,
      retryable: diagramType === "plantuml",
      retryCount: 0,
    });
  }

  setIsLoading(false);
}, [diagramType, krokiServerUrl, nodeId]);
```

## Testing Strategy

### 单元测试
- CodeEditor 组件渲染测试
- 语言定义测试
- EditorSaveService 逻辑测试
- Mermaid 渲染函数测试
- PlantUML 渲染函数测试

### 集成测试
- DiagramEditor 完整流程测试
- 保存状态同步测试
- Mermaid 离线渲染测试

### E2E 测试
- 创建图表文件并编辑
- 验证语法高亮
- 验证自动保存
- 验证 Mermaid 离线工作
