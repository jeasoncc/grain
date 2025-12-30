# Design Document

## Overview

本设计文档描述 DiagramEditor 用户体验改进的技术实现方案，包括 Monaco 主题同步和可拖动面板两个功能。

## Architecture

### 组件架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DiagramEditorContainer                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        DiagramEditorView                          │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                      PanelGroup                             │  │  │
│  │  │  ┌──────────────────┐  ┌───┐  ┌──────────────────────────┐  │  │  │
│  │  │  │      Panel       │  │ R │  │         Panel            │  │  │  │
│  │  │  │  (CodeEditor)    │  │ e │  │    (DiagramPreview)      │  │  │  │
│  │  │  │                  │  │ s │  │                          │  │  │  │
│  │  │  │  ┌────────────┐  │  │ i │  │  ┌────────────────────┐  │  │  │  │
│  │  │  │  │ Monaco     │  │  │ z │  │  │ DiagramPreviewView │  │  │  │  │
│  │  │  │  │ Editor     │  │  │ e │  │  │                    │  │  │  │  │
│  │  │  │  │            │  │  │   │  │  │                    │  │  │  │  │
│  │  │  │  │ Theme:     │  │  │ H │  │  │                    │  │  │  │  │
│  │  │  │  │ grain-xxx  │  │  │ a │  │  │                    │  │  │  │  │
│  │  │  │  └────────────┘  │  │ n │  │  └────────────────────┘  │  │  │  │
│  │  │  └──────────────────┘  │ d │  └──────────────────────────┘  │  │  │
│  │  │                        │ l │                                │  │  │
│  │  │                        │ e │                                │  │  │
│  │  └────────────────────────┴───┴────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 数据流

```
┌─────────────────┐
│   ThemeStore    │
│  (Zustand)      │
└────────┬────────┘
         │ useTheme()
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DiagramEditorContainer                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  const { currentTheme } = useTheme()                            │   │
│  │                                                                  │   │
│  │  // 传递完整主题对象给 View                                       │   │
│  │  <DiagramEditorView theme={currentTheme} ... />                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ props: { theme: Theme }
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DiagramEditorView                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  <CodeEditorView theme={theme} ... />                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ props: { theme: Theme }
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CodeEditorView                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  // 在 onMount 时注册并应用主题                                   │   │
│  │  const themeName = registerMonacoTheme(monaco, theme)           │   │
│  │  monaco.editor.setTheme(themeName)                              │   │
│  │                                                                  │   │
│  │  // 主题变化时更新                                                │   │
│  │  useEffect(() => {                                              │   │
│  │    if (monacoRef.current && theme) {                            │   │
│  │      const name = registerMonacoTheme(monacoRef.current, theme) │   │
│  │      monacoRef.current.editor.setTheme(name)                    │   │
│  │    }                                                            │   │
│  │  }, [theme])                                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### Component 1: monaco-theme.fn.ts (已创建)

**Purpose:** 纯函数模块，负责将应用主题转换为 Monaco 主题

**Interface:**
```typescript
// 生成 Monaco 主题名称
export const getMonacoThemeName = (themeKey: string): string

// 根据应用主题生成 Monaco 主题数据
export const generateMonacoTheme = (theme: Theme): MonacoThemeData

// 注册 Monaco 主题（带缓存）
export const registerMonacoTheme = (
  monaco: typeof import("monaco-editor"),
  theme: Theme
): string

// 清除已注册主题缓存（用于测试）
export const clearRegisteredThemes = (): void

// 检查主题是否已注册
export const isThemeRegistered = (themeKey: string): boolean
```

**Behavior:**
- `generateMonacoTheme` 将 Theme 的 colors 映射到 Monaco 的 IStandaloneThemeData
- 包含编辑器颜色（背景、前景、选择、光标等）
- 包含语法高亮规则（注释、关键字、字符串、数字等）
- 使用缓存避免重复注册相同主题

### Component 2: CodeEditorView 更新

**Purpose:** 更新代码编辑器组件以支持动态主题

**Interface Changes:**
```typescript
// code-editor.types.ts
interface CodeEditorViewProps {
  // 现有属性...
  
  // 修改：从 "light" | "dark" 改为完整 Theme 对象
  readonly theme?: Theme;
}
```

**Behavior:**
- 在 `onMount` 时注册并应用当前主题
- 监听 `theme` prop 变化，动态更新 Monaco 主题
- 保持向后兼容：如果未传入 theme，使用默认 light/dark

### Component 3: DiagramEditorView 更新

**Purpose:** 添加可拖动面板支持

**Interface Changes:**
```typescript
// diagram-editor.types.ts
interface DiagramEditorViewProps {
  // 现有属性...
  
  // 修改：从 "light" | "dark" 改为完整 Theme 对象
  readonly theme?: Theme;
}
```

**Layout Changes:**
```tsx
// 从简单 flex 布局
<div className="flex h-full w-full">
  <div className="flex-1">...</div>
  <div className="flex-1">...</div>
</div>

// 改为 PanelGroup 布局
<PanelGroup direction="horizontal" autoSaveId="diagram-editor-layout">
  <Panel id="code-editor" order={1} defaultSize={50} minSize={20} maxSize={80}>
    <CodeEditorView ... />
  </Panel>
  <PanelResizeHandle className="..." />
  <Panel id="preview" order={2} defaultSize={50} minSize={20} maxSize={80}>
    <DiagramPreviewView ... />
  </Panel>
</PanelGroup>
```

### Component 4: DiagramEditorContainer 更新

**Purpose:** 传递完整主题对象给 View

**Changes:**
```typescript
// 从
const { isDark } = useTheme();
<DiagramEditorView theme={isDark ? "dark" : "light"} ... />

// 改为
const { currentTheme } = useTheme();
<DiagramEditorView theme={currentTheme} ... />
```

## Data Models

### Monaco Theme Data

```typescript
// Monaco 主题数据结构
interface MonacoThemeData {
  base: "vs" | "vs-dark";
  inherit: boolean;
  rules: ITokenThemeRule[];
  colors: IColors;
}

// Token 规则
interface ITokenThemeRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}
```

### Theme Color Mapping

| 应用主题颜色 | Monaco 编辑器颜色 |
|-------------|------------------|
| colors.background | editor.background |
| colors.foreground | editor.foreground |
| colors.editorSelection | editor.selectionBackground |
| colors.editorLineHighlight | editor.lineHighlightBackground |
| colors.editorCursor / colors.primary | editorCursor.foreground |
| colors.mutedForeground | editorLineNumber.foreground |
| colors.border | editorIndentGuide.background |
| colors.primary | editorBracketMatch.border |
| colors.card | editorGroupHeader.tabsBackground |
| colors.popover | editorWidget.background |
| colors.input | input.background |
| colors.accent | list.activeSelectionBackground |

## Error Handling

### Monaco 主题注册失败

```typescript
export const registerMonacoTheme = (
  monaco: typeof import("monaco-editor"),
  theme: Theme
): string => {
  const themeName = getMonacoThemeName(theme.key);
  
  try {
    if (!registeredThemes.has(themeName)) {
      const themeData = generateMonacoTheme(theme);
      monaco.editor.defineTheme(themeName, themeData);
      registeredThemes.add(themeName);
    }
    return themeName;
  } catch (error) {
    logger.error("[Monaco] 主题注册失败:", error);
    // 回退到默认主题
    return theme.type === "light" ? "vs" : "vs-dark";
  }
};
```

### 面板尺寸持久化失败

PanelGroup 的 `autoSaveId` 会自动处理 localStorage 读写错误，无需额外处理。

## Testing Strategy

### 单元测试

1. **monaco-theme.fn.test.ts**
   - `generateMonacoTheme` 生成正确的主题数据
   - `getMonacoThemeName` 生成正确的主题名称
   - `registerMonacoTheme` 正确注册主题并缓存
   - `clearRegisteredThemes` 正确清除缓存
   - `isThemeRegistered` 正确检查注册状态

2. **code-editor.view.fn.test.tsx**
   - 传入 Theme 对象时正确应用主题
   - 主题变化时正确更新 Monaco 主题
   - 未传入主题时使用默认主题

3. **diagram-editor.view.fn.test.tsx**
   - PanelGroup 正确渲染
   - 面板尺寸限制正确（20%-80%）
   - resize handle 正确渲染

### 集成测试

- 主题切换时 Monaco 编辑器颜色正确更新
- 拖动 resize handle 时面板尺寸正确变化
- 刷新页面后面板尺寸正确恢复

## Performance Considerations

### 主题缓存

- 使用 `Set<string>` 缓存已注册的主题名称
- 避免重复调用 `monaco.editor.defineTheme`
- 主题数据在内存中只生成一次

### 面板渲染

- PanelGroup 使用 CSS flexbox，性能优秀
- resize handle 使用 CSS transition，动画流畅
- autoSaveId 使用 localStorage，读写开销小

## Dependencies

### 现有依赖

- `react-resizable-panels`: ^3.0.6 (已安装)
- `@monaco-editor/react`: 已安装
- `zustand`: 状态管理

### 无需新增依赖

所有功能使用现有依赖实现。
