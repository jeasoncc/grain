# Design Document: Diagram Editor

## Overview

本设计文档描述如何为 Grain 编辑器添加 Mermaid 和 PlantUML 图表编辑功能。设计遵循项目现有的函数式架构，复用 `createDateTemplateConfig` 工厂函数创建模板配置，并创建新的 `DiagramEditor` 组件用于代码编辑和实时预览。

## Architecture

### 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        Activity Bar                              │
│  [Mermaid Button] [PlantUML Button]                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Create Actions                                │
│  createMermaidCompatAsync / createPlantUMLCompatAsync           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Template Configs                              │
│  mermaidConfig / plantumlConfig (via createDateTemplateConfig)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database                                    │
│  nodes 表 (type: "mermaid" | "plantuml")                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Story Workspace                                │
│  根据 tab.type 渲染 DiagramEditorContainer                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Diagram Editor                                 │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │   Code Editor   │  │    Preview      │                       │
│  │   (textarea)    │  │  (Kroki SVG)    │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### 文件结构

```
apps/desktop/src/
├── actions/templated/
│   ├── configs/
│   │   ├── mermaid.config.ts          # Mermaid 模板配置
│   │   └── plantuml.config.ts         # PlantUML 模板配置
│   ├── create-mermaid.action.ts       # Mermaid 创建 action
│   └── create-plantuml.action.ts      # PlantUML 创建 action
├── components/
│   └── diagram-editor/
│       ├── diagram-editor.view.fn.tsx       # 纯展示组件
│       ├── diagram-editor.container.fn.tsx  # 容器组件
│       ├── diagram-editor.types.ts          # 类型定义
│       └── index.ts                         # 导出
└── fn/content/
    └── diagram.content.fn.ts          # 图表内容生成函数
```

## Components and Interfaces

### 1. 模板配置

**文件**: `apps/desktop/src/actions/templated/configs/mermaid.config.ts`

```typescript
import { createDateTemplateConfig } from "./date-template.factory";
import { generateMermaidContent } from "@/fn/content";

export const mermaidConfig = createDateTemplateConfig({
  name: "Mermaid",
  rootFolder: "Mermaid",
  fileType: "mermaid",
  tag: "mermaid",
  prefix: "mermaid",
  generateContent: generateMermaidContent,
  includeDayFolder: false,  // 不需要日期文件夹
});
```

**文件**: `apps/desktop/src/actions/templated/configs/plantuml.config.ts`

```typescript
import { createDateTemplateConfig } from "./date-template.factory";
import { generatePlantUMLContent } from "@/fn/content";

export const plantumlConfig = createDateTemplateConfig({
  name: "PlantUML",
  rootFolder: "PlantUML",
  fileType: "plantuml",
  tag: "plantuml",
  prefix: "plantuml",
  generateContent: generatePlantUMLContent,
  includeDayFolder: false,
});
```

### 2. 内容生成函数

**文件**: `apps/desktop/src/fn/content/diagram.content.fn.ts`

```typescript
/**
 * 生成默认 Mermaid 内容
 */
export const generateMermaidContent = (date: Date): string => {
  return `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;
};

/**
 * 生成默认 PlantUML 内容
 */
export const generatePlantUMLContent = (date: Date): string => {
  return `@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi there
@enduml`;
};
```

### 3. DiagramEditor 组件

**文件**: `apps/desktop/src/components/diagram-editor/diagram-editor.types.ts`

```typescript
/**
 * 图表类型
 */
export type DiagramType = "mermaid" | "plantuml";

/**
 * DiagramEditorView Props
 */
export interface DiagramEditorViewProps {
  /** 图表代码 */
  readonly code: string;
  /** 图表类型 */
  readonly diagramType: DiagramType;
  /** 预览 SVG 内容 */
  readonly previewSvg: string | null;
  /** 是否正在加载预览 */
  readonly isLoading: boolean;
  /** 错误信息 */
  readonly error: string | null;
  /** Kroki 是否已配置 */
  readonly isKrokiConfigured: boolean;
  /** 代码变化回调 */
  readonly onCodeChange: (code: string) => void;
  /** 打开设置回调 */
  readonly onOpenSettings: () => void;
  /** 重试回调 */
  readonly onRetry: () => void;
}

/**
 * DiagramEditorContainer Props
 */
export interface DiagramEditorContainerProps {
  /** 节点 ID */
  readonly nodeId: string;
  /** 图表类型 */
  readonly diagramType: DiagramType;
  /** 样式类名 */
  readonly className?: string;
}
```

**文件**: `apps/desktop/src/components/diagram-editor/diagram-editor.view.fn.tsx`

```typescript
export const DiagramEditorView = memo(({
  code,
  diagramType,
  previewSvg,
  isLoading,
  error,
  isKrokiConfigured,
  onCodeChange,
  onOpenSettings,
  onRetry,
}: DiagramEditorViewProps) => {
  // 如果 Kroki 未配置，显示配置提示
  if (!isKrokiConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p>Kroki server not configured</p>
          <Button onClick={onOpenSettings}>Configure Kroki</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 代码编辑区 */}
      <div className="flex-1 border-r">
        <textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          className="w-full h-full p-4 font-mono text-sm resize-none"
          placeholder={`Enter ${diagramType} code...`}
        />
      </div>
      
      {/* 预览区 */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && <div>Loading preview...</div>}
        {error && (
          <div className="text-destructive">
            <p>{error}</p>
            <Button onClick={onRetry}>Retry</Button>
          </div>
        )}
        {previewSvg && (
          <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
        )}
      </div>
    </div>
  );
});
```

### 4. Activity Bar 更新

需要在 `ActivityBarProps` 中添加：

```typescript
interface ActivityBarProps {
  // ... 现有 props
  readonly onCreateMermaid: () => void;
  readonly onCreatePlantUML: () => void;
}
```

需要在 `IconTheme` 中添加图标：

```typescript
activityBar: {
  // ... 现有图标
  mermaid: LucideIcon;
  plantuml: LucideIcon;
}
```

## Data Models

### 节点类型

已在 `NodeTypeSchema` 中定义：
- `"mermaid"` - Mermaid 图表
- `"plantuml"` - PlantUML 图表

### 内容格式

图表内容直接存储为纯文本（Mermaid 或 PlantUML 语法），不使用 JSON 包装。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Diagram Config Folder Path Consistency

*For any* date and diagram config (mermaid or plantuml), the generated folder path should follow the pattern: `[rootFolder]/year-YYYY-{Zodiac}/month-MM-{MonthName}`.

**Validates: Requirements 1.2, 2.2**

### Property 2: Content Persistence Round Trip

*For any* valid diagram content, saving to database then loading should return the same content.

**Validates: Requirements 5.3**

### Property 3: Preview Update on Code Change

*For any* code change in the editor, the preview should update after the debounce delay (not immediately, not never).

**Validates: Requirements 3.2**

## Error Handling

### Kroki 服务错误

1. **未配置**: 显示配置提示，引导用户到设置页面
2. **网络错误**: 显示错误信息和重试按钮
3. **语法错误**: 显示 Kroki 返回的错误信息

### 内容加载错误

1. **节点不存在**: 显示错误提示
2. **内容解析失败**: 使用默认模板内容

## Testing Strategy

### 单元测试

1. **配置测试** (`mermaid.config.test.ts`, `plantuml.config.test.ts`)
   - 验证 fileType、rootFolder、tag 配置正确
   - 验证内容生成函数返回有效语法

2. **内容生成测试** (`diagram.content.fn.test.ts`)
   - 验证 Mermaid 默认内容包含 flowchart 语法
   - 验证 PlantUML 默认内容包含 @startuml/@enduml

3. **组件测试** (`diagram-editor.view.fn.test.tsx`)
   - 验证分屏布局渲染
   - 验证 Kroki 未配置时显示提示
   - 验证错误状态显示

### 属性测试

使用 fast-check 进行属性测试：

1. **Property 1**: 生成随机日期，验证文件夹路径格式
2. **Property 2**: 生成随机图表内容，验证保存/加载一致性
3. **Property 3**: 模拟代码变化，验证防抖行为

### 测试框架

- **单元测试**: Vitest
- **属性测试**: fast-check
- **最小迭代次数**: 100 次

