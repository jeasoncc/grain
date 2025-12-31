---
inclusion: manual
---

# 设计模式指南

记录项目中重要的设计模式和抽象原则，避免重复实现相似功能。

## 业务逻辑抽象审查

### 核心原则

**相似的业务逻辑必须抽象为高阶函数**，而不是复制粘贴。

### 案例：模板化文件创建

#### 问题识别

Diary 和 Wiki 创建逻辑几乎相同：

```typescript
// ❌ 重复模式 - diary
export const createDiary = (params) => {
  const content = generateDiaryContent(params.date);     // 1. 生成模板
  const parsed = JSON.parse(content);                    // 2. 解析 JSON
  const result = await createFileInTree({                // 3. 创建文件
    workspaceId: params.workspaceId,
    title: structure.filename,
    folderPath: [DIARY_ROOT, yearFolder, monthFolder, dayFolder],
    type: "diary",
    tags: ["diary"],
    content,
  });
  return { node: result.node, content, parsedContent };  // 4. 返回结果
};

// ❌ 重复模式 - wiki（结构完全相同！）
export const createWiki = (params) => {
  const content = generateWikiTemplate(params.name);     // 1. 生成模板
  const parsed = JSON.parse(content);                    // 2. 解析 JSON
  const result = await createFileInTree({                // 3. 创建文件
    workspaceId: params.workspaceId,
    title: params.name,
    folderPath: [WIKI_ROOT],
    type: "file",
    tags: ["wiki"],
    content,
  });
  return { node: result.node, content, parsedContent };  // 4. 返回结果
};
```

#### 正确抽象

```typescript
// ✅ 高阶函数抽象
interface TemplateConfig<T> {
  readonly name: string;
  readonly rootFolder: string;
  readonly fileType: Exclude<NodeType, "folder">;     // 排除 folder 类型
  readonly tag: string;
  readonly generateTemplate: (params: T) => string;
  readonly generateFolderPath: (params: T) => string[];
  readonly generateTitle: (params: T) => string;
  readonly paramsSchema: z.ZodSchema<T>;
  readonly foldersCollapsed?: boolean;
}

const createTemplatedFile = <T>(config: TemplateConfig<T>) => 
  (params: TemplatedFileParams<T>): TE.TaskEither<AppError, TemplatedFileResult> =>
    pipe(
      TE.Do,
      TE.bind("content", () => TE.of(config.generateTemplate(params.templateParams))),
      TE.bind("parsed", ({ content }) => parseJsonSafe(content)),
      TE.chain(({ content, parsed }) => 
        pipe(
          createFileInTree({
            workspaceId: params.workspaceId,
            title: config.generateTitle(params.templateParams),
            folderPath: [config.rootFolder, ...config.generateFolderPath(params.templateParams)],
            type: config.fileType,
            tags: [config.tag],
            content,
            foldersCollapsed: config.foldersCollapsed ?? true,
          }),
          TE.map(result => ({ node: result.node, content, parsedContent: parsed }))
        )
      )
    );
```

#### 配置实例化

```typescript
// Diary 配置
const diaryConfig: TemplateConfig<CreateDiaryParams> = {
  name: "日记",
  rootFolder: "Diary",
  fileType: "diary",
  tag: "diary",
  generateTemplate: (params) => generateDiaryContent(params.date || new Date()),
  generateFolderPath: (params) => {
    const s = getDiaryFolderStructure(params.date || new Date());
    return [s.yearFolder, s.monthFolder, s.dayFolder];
  },
  generateTitle: (params) => getDiaryFolderStructure(params.date || new Date()).filename,
  paramsSchema: createDiaryParamsSchema,
  foldersCollapsed: true,
};

// Wiki 配置
const wikiConfig: TemplateConfig<WikiCreationParams> = {
  name: "Wiki",
  rootFolder: "Wiki",
  fileType: "file",
  tag: "wiki",
  generateTemplate: (params) => generateWikiTemplate(params.name),
  generateFolderPath: () => [],
  generateTitle: (params) => params.name,
  paramsSchema: wikiCreationParamsSchema,
  foldersCollapsed: true,
};

// 实例化
export const createDiary = createTemplatedFile(diaryConfig);
export const createWiki = createTemplatedFile(wikiConfig);
```

### 其他可抽象的模式

#### 1. 标准 CRUD Actions

```typescript
// ❌ 重复：createNode, createDrawing, createWorkspace
// ✅ 抽象：
const createEntity = <T, R>(config: EntityConfig<T, R>) => 
  (params: T): TE.TaskEither<AppError, R> => /* ... */;
```

#### 2. 导出功能

```typescript
// ❌ 重复：exportToMarkdown, exportToJSON, exportToOrgmode
// ✅ 抽象：
const exportWithFormat = <T>(config: ExportConfig<T>) => 
  (content: Content): TE.TaskEither<AppError, string> => /* ... */;
```

#### 3. 搜索过滤

```typescript
// ❌ 重复：searchNodes, searchWorkspaces, searchDrawings
// ✅ 抽象：
const searchEntities = <T>(config: SearchConfig<T>) => 
  (query: string): TE.TaskEither<AppError, T[]> => /* ... */;
```

## 抽象原则

### 何时抽象

| 条件 | 行动 |
|------|------|
| 相同模式出现 3 次 | 必须抽象 |
| 结构相似度 > 80% | 考虑抽象 |
| 预期会有更多实例 | 提前抽象 |

### 何时不抽象

| 条件 | 原因 |
|------|------|
| 只有 2 个实例且不会扩展 | 过度工程 |
| 业务逻辑差异大 | 强制抽象增加复杂度 |
| 为了抽象而抽象 | 代码可读性下降 |

### 抽象层级

```
具体实现 → 模板函数 → 高阶函数 → 通用框架
```

选择合适的层级，避免过度抽象。

## 重构指导

### 识别重复模式的信号

1. **复制粘贴代码**：发现自己在复制代码时
2. **相似的文件结构**：多个 action 文件结构几乎一样
3. **相同的错误处理**：错误处理逻辑完全相同
4. **相似的测试用例**：测试结构和断言几乎一样

### 重构步骤

1. **提取共同接口**：定义配置接口
2. **创建高阶函数**：实现通用逻辑
3. **配置实例化**：为每个具体场景创建配置
4. **渐进式迁移**：逐步替换现有实现
5. **测试验证**：确保功能不变

## 文件组织建议

```
src/actions/
├── templated/                    # 模板化文件创建
│   ├── create-templated-file.action.ts  # 高阶函数
│   ├── configs/
│   │   ├── diary.config.ts       # Diary 配置
│   │   ├── wiki.config.ts        # Wiki 配置
│   │   └── index.ts
│   ├── create-diary.action.ts    # 实例化导出
│   ├── create-wiki.action.ts     # 实例化导出
│   └── index.ts
```

## 统一保存架构

### 核心原则

**不管是自动保存还是手动保存，都调用同一个保存函数。**

手动保存是核心功能，自动保存是辅助功能。所有编辑器（Lexical、Excalidraw、Diagram、Code）共用同一套保存逻辑。

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        触发保存的方式                            │
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│   │  Ctrl+S      │    │  自动保存     │    │  组件卸载    │      │
│   │  (手动)      │    │  (防抖)      │    │  (清理)      │      │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│          │                   │                   │               │
│          └───────────────────┼───────────────────┘               │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   saveContent   │  ← 核心保存函数           │
│                    │   (统一入口)    │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                    │
│        ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│        │ 更新 DB  │  │ 更新 Tab │  │ 更新 UI  │                │
│        │          │  │ isDirty  │  │ SaveStore│                │
│        └──────────┘  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
Editor onChange
       │
       ▼
┌─────────────────┐
│  updateContent  │ ← 更新待保存内容 + 标记 isDirty
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐                ┌─────────────────┐
│  debouncedSave  │                │    saveNow      │
│  (自动保存)     │                │  (Ctrl+S)       │
└────────┬────────┘                └────────┬────────┘
         │                                  │
         └──────────────┬───────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   saveContent   │ ← 核心保存函数（唯一入口）
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ DB 更新  │  │ Tab 状态 │  │ UI 状态  │
   │          │  │ isDirty  │  │ SaveStore│
   └──────────┘  └──────────┘  └──────────┘
```

### 实现结构

```typescript
// fn/save/unified-save.service.ts - 核心保存服务
interface UnifiedSaveConfig {
  nodeId: string;
  contentType: ContentType;
  autoSaveDelay?: number;      // 0 = 禁用自动保存
  tabId?: string;              // 用于更新 isDirty
  setTabDirty?: (tabId: string, isDirty: boolean) => void;
  onSaving?: () => void;
  onSaved?: () => void;
  onError?: (error: Error) => void;
}

const createUnifiedSaveService = (config: UnifiedSaveConfig) => {
  // 核心保存函数 - 所有保存操作的唯一入口
  const saveContent = async (content: string): Promise<boolean> => {
    // 1. 更新 DB
    // 2. 更新 Tab.isDirty = false
    // 3. 通知 SaveStore
  };

  return {
    updateContent,      // 触发防抖自动保存
    saveNow,           // 立即保存（Ctrl+S）
    hasUnsavedChanges,
    setInitialContent,
    dispose,
  };
};
```

```typescript
// hooks/use-unified-save.ts - React Hook
const useUnifiedSave = (options: UseUnifiedSaveOptions) => {
  // 1. 读取全局设置（autoSave, autoSaveInterval）
  // 2. 创建 UnifiedSaveService 实例
  // 3. 注册 Ctrl+S 快捷键
  // 4. 组件卸载时自动保存
  
  return {
    updateContent,
    saveNow,
    hasUnsavedChanges,
    setInitialContent,
  };
};
```

### 使用示例

```typescript
// 所有编辑器统一使用方式
function MyEditor({ nodeId, tabId }: Props) {
  const { updateContent, saveNow, hasUnsavedChanges } = useUnifiedSave({
    nodeId,
    tabId,
    contentType: "lexical", // 或 "excalidraw", "text"
    onSaveSuccess: () => console.log("保存成功"),
  });

  const handleChange = (newContent: string) => {
    updateContent(newContent); // 触发防抖自动保存
  };

  // Ctrl+S 会自动调用 saveNow()

  return <Editor onChange={handleChange} />;
}
```

### 关键设计决策

| 决策 | 原因 |
|------|------|
| 单一保存函数 | 确保所有保存操作产生相同的副作用 |
| Hook 内注册快捷键 | 避免多个 Hook 处理同一快捷键 |
| Tab.isDirty 在保存函数内更新 | 确保状态同步，避免遗漏 |
| 自动保存可禁用 | 用户可能只想手动保存 |

### 避免的反模式

```typescript
// ❌ 错误：两套独立的保存逻辑
useEditorSave({ ... });  // 自动保存
useManualSave({ ... });  // 手动保存（Ctrl+S）
// 问题：两者使用不同的保存函数，状态不同步

// ✅ 正确：统一的保存逻辑
useUnifiedSave({ ... });  // 自动保存 + 手动保存都在这里
```

## 编辑器主题颜色传递

### 核心原则

**应用层有 30+ 主题，但编辑器组件只需要 light/dark 基础主题 + 自定义颜色。**

编辑器包（packages）是独立的，不应该依赖应用的主题系统。通过 `themeColors` prop 传递颜色配置。

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     主题颜色传递架构                             │
│                                                                  │
│   应用层（30+ 主题）                                              │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Theme { colors: ThemeColors }                           │  │
│   │  - background, foreground, editorSelection, ...          │  │
│   └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  getEditorThemeColors(theme)                             │  │
│   │  提取编辑器需要的颜色子集                                  │  │
│   └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│   Container 组件                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  const { currentTheme } = useTheme();                    │  │
│   │  const themeColors = getEditorThemeColors(currentTheme); │  │
│   └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│            ┌───────────────┴───────────────┐                    │
│            ▼                               ▼                    │
│   DiagramEditorContainer          CodeEditorContainer           │
│   ┌──────────────────┐            ┌──────────────────┐         │
│   │ themeColors={...}│            │ themeColors={...}│         │
│   └────────┬─────────┘            └────────┬─────────┘         │
│            │                               │                    │
│            ▼                               ▼                    │
│   DiagramEditorView               CodeEditorView                │
│   ┌──────────────────┐            ┌──────────────────┐         │
│   │ 透传给内部       │            │ 注册 Monaco 主题 │         │
│   │ CodeEditorView   │            │ 应用自定义颜色   │         │
│   └──────────────────┘            └──────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 颜色接口

```typescript
// packages/code-editor/src/code-editor.types.ts
interface EditorThemeColors {
  readonly background?: string;      // 编辑器背景色
  readonly foreground?: string;      // 文本颜色
  readonly selection?: string;       // 选中文本背景色
  readonly lineHighlight?: string;   // 当前行高亮
  readonly cursor?: string;          // 光标颜色
  readonly lineNumber?: string;      // 行号颜色
  readonly lineNumberActive?: string; // 活动行号颜色
}
```

### 颜色提取函数

```typescript
// apps/desktop/src/fn/theme/editor-theme.fn.ts
const getEditorThemeColors = (theme: Theme | undefined): EditorThemeColors | undefined => {
  if (!theme) return undefined;
  const { colors } = theme;
  return {
    background: colors.background,
    foreground: colors.foreground,
    selection: colors.editorSelection,
    lineHighlight: colors.editorLineHighlight,
    cursor: colors.editorCursor,
    lineNumber: colors.mutedForeground,
    lineNumberActive: colors.foreground,
  };
};
```

### 使用示例

```typescript
// Container 组件
function CodeEditorContainer({ nodeId }: Props) {
  const { isDark, currentTheme } = useTheme();
  const themeColors = useMemo(
    () => getEditorThemeColors(currentTheme),
    [currentTheme],
  );

  return (
    <CodeEditorView
      theme={isDark ? "dark" : "light"}
      themeColors={themeColors}
      // ...
    />
  );
}

// DiagramEditor 透传给内部的 CodeEditor
function DiagramEditorView({ theme, themeColors, ... }: Props) {
  return (
    <CodeEditorView
      theme={theme}
      themeColors={themeColors}
      // ...
    />
  );
}
```

### 关键设计决策

| 决策 | 原因 |
|------|------|
| packages 只接受 light/dark | 第三方库（Monaco、Mermaid）只支持两种基础主题 |
| themeColors 可选 | 不传时使用默认主题颜色 |
| Container 负责提取颜色 | 保持 View 组件纯净，不依赖应用层 |
| DiagramEditor 透传颜色 | 父子组件共享同一套颜色配置 |

---

**使用场景**：当发现代码重复或相似模式时，参考此文件进行抽象设计。
