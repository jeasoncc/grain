# Design Document

## Overview

本设计文档描述了编辑器统一保存机制的技术实现方案。核心目标是让 `useEditorSave` hook 读取全局设置，并确保 Monaco 编辑器（DiagramEditor）和 Lexical 编辑器使用一致的保存逻辑。

### 设计目标

1. **统一配置**：`useEditorSave` 读取 `useSettings` 中的 `autoSave` 和 `autoSaveInterval`
2. **状态同步**：保存状态与 `EditorTab.isDirty` 同步
3. **基于保存的渲染**：DiagramEditor 的预览只在保存后触发
4. **范围验证**：autoSaveInterval 限制在 1-60 秒

## Architecture

### 当前架构

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
│  useEditorSave({ autoSaveDelay: 1000 }) ◄── 硬编码延迟          │
│       │                                                          │
│       ▼                                                          │
│  EditorSaveService ──► updateContentByNodeId()                  │
│                                                                  │
│  debouncedPreview() ◄── 实时预览（问题：输入时频繁渲染）        │
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
│  5. 提供 onSaveSuccess 回调                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│ DiagramEditor       │         │ 其他编辑器          │
│                     │         │ (未来可迁移)        │
│ - 移除实时预览      │         │                     │
│ - onSaveSuccess     │         │                     │
│   触发渲染          │         │                     │
└─────────────────────┘         └─────────────────────┘
```

## Components

### 1. useEditorSave Hook 修改

修改 `useEditorSave` hook 以读取全局设置：

```typescript
// hooks/use-editor-save.ts

export interface UseEditorSaveOptions {
  readonly nodeId: string;
  readonly contentType: ContentType;
  /** @deprecated 使用全局设置代替 */
  readonly autoSaveDelay?: number;
  readonly initialContent?: string;
  readonly onSaveSuccess?: () => void;
  readonly onSaveError?: (error: Error) => void;
  /** 标签页 ID，用于更新 isDirty 状态 */
  readonly tabId?: string;
}

export function useEditorSave(options: UseEditorSaveOptions): UseEditorSaveReturn {
  // 读取全局设置
  const { autoSave, autoSaveInterval } = useSettings();
  
  // 转换为毫秒，如果禁用自动保存则设为 0
  const effectiveDelay = autoSave 
    ? autoSaveInterval * 1000 
    : 0; // 0 表示禁用自动保存
  
  // 获取 tab dirty 状态更新函数
  const setTabDirty = useEditorTabsStore((s) => s.setTabDirty);
  
  // ... 现有逻辑，使用 effectiveDelay 替代 autoSaveDelay
  
  // 在 markAsUnsaved 时同步更新 tab dirty 状态
  const updateContent = useCallback((content: string) => {
    markAsUnsaved();
    if (options.tabId) {
      setTabDirty(options.tabId, true);
    }
    saveService.updateContent(content);
  }, [/* deps */]);
  
  // 在保存成功时同步更新 tab dirty 状态
  // ... 在 onSaved 回调中添加 setTabDirty(tabId, false)
}
```

### 2. EditorSaveService 修改

修改 `createEditorSaveService` 以支持禁用自动保存：

```typescript
// fn/save/editor-save.service.ts

export const createEditorSaveService = (config: EditorSaveConfig) => {
  const { autoSaveDelay = DEFAULT_AUTOSAVE_DELAY } = config;
  
  // 如果 autoSaveDelay 为 0，禁用自动保存
  const isAutoSaveEnabled = autoSaveDelay > 0;
  
  const debouncedSave = isAutoSaveEnabled
    ? debounce(saveContent, autoSaveDelay)
    : { 
        // 空操作，不触发自动保存
        cancel: () => {},
        (...args: any[]) => {} 
      };
  
  return {
    updateContent: (content: string): void => {
      pendingContent = content;
      if (isAutoSaveEnabled) {
        debouncedSave(content);
      }
      // 如果禁用自动保存，只更新 pendingContent，不触发保存
    },
    // ... 其他方法保持不变
  };
};
```

### 3. useSettings Store 修改

添加范围验证：

```typescript
// hooks/use-settings.ts

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      // 默认值
      autoSave: true,
      autoSaveInterval: 3, // 默认 3 秒
      
      // Setter with validation
      setAutoSaveInterval: (interval: number) => {
        // 范围限制：1-60 秒
        const validated = Math.max(1, Math.min(60, interval));
        set({ autoSaveInterval: validated });
      },
      // ...
    }),
    { name: "grain-settings" }
  )
);
```

### 4. DiagramEditorContainer 修改

移除实时预览，改为保存后渲染：

```typescript
// components/diagram-editor/diagram-editor.container.fn.tsx

export const DiagramEditorContainer = memo(function DiagramEditorContainer({
  nodeId,
  diagramType,
  className,
}: DiagramEditorContainerProps) {
  // ... 现有代码
  
  // 获取当前 tab ID
  const activeTabId = useEditorTabsStore((s) => s.activeTabId);
  
  const { updateContent, saveNow, hasUnsavedChanges, setInitialContent } =
    useEditorSave({
      nodeId,
      contentType: "text",
      tabId: activeTabId ?? undefined, // 传递 tabId
      onSaveSuccess: () => {
        logger.success("[DiagramEditor] 内容保存成功");
        // 保存成功后触发预览渲染
        updatePreview(code);
      },
      onSaveError: (error) => {
        logger.error("[DiagramEditor] 保存内容失败:", error);
        toast.error("Failed to save diagram");
      },
    });
  
  // 代码变化处理 - 移除实时预览
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      // 移除: debouncedPreview(newCode);
      updateContent(newCode);
    },
    [updateContent],
  );
  
  // 手动保存后也触发预览
  const handleManualSave = useCallback(async () => {
    if (!hasUnsavedChanges()) {
      toast.info("No changes to save");
      return;
    }
    logger.info("[DiagramEditor] 手动保存触发");
    await saveNow();
    // onSaveSuccess 会触发 updatePreview
  }, [hasUnsavedChanges, saveNow]);
  
  // ...
});
```

### 5. Settings Page 修改

调整 autoSaveInterval 输入范围：

```typescript
// routes/settings/general.tsx

<Input
  type="number"
  value={autoSaveInterval}
  onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
  min={1}   // 从 10 改为 1
  max={60}  // 从 3600 改为 60
  className="h-8 w-20 text-center"
/>
```

## Data Models

### UseEditorSaveOptions 扩展

```typescript
export interface UseEditorSaveOptions {
  readonly nodeId: string;
  readonly contentType: ContentType;
  /** @deprecated 使用全局设置代替，保留用于向后兼容 */
  readonly autoSaveDelay?: number;
  readonly initialContent?: string;
  readonly onSaveSuccess?: () => void;
  readonly onSaveError?: (error: Error) => void;
  /** 标签页 ID，用于更新 isDirty 状态 */
  readonly tabId?: string;
}
```

### SettingsState 约束

```typescript
interface SettingsState {
  autoSave: boolean;           // 默认: true
  autoSaveInterval: number;    // 默认: 3, 范围: 1-60 秒
  // ... 其他字段
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Settings Reading and Conversion

*For any* autoSaveInterval value in Settings_Store, the useEditorSave hook SHALL read this value and convert it to milliseconds (value * 1000) for use in the debounce delay.

**Validates: Requirements 1.1, 1.2, 1.5**

### Property 2: Range Validation

*For any* input value to setAutoSaveInterval, the Settings_Store SHALL clamp the value to the range [1, 60]. Values less than 1 become 1, values greater than 60 become 60.

**Validates: Requirements 2.1, 2.2**

### Property 3: Auto-save Disabled Behavior

*For any* content update when autoSave is false, the system SHALL NOT trigger automatic save. Only manual save (saveNow) SHALL persist content to the database.

**Validates: Requirements 1.3**

### Property 4: Dirty State Synchronization

*For any* content update through useEditorSave, the corresponding EditorTab.isDirty SHALL be true. *For any* successful save operation, the corresponding EditorTab.isDirty SHALL be false.

**Validates: Requirements 3.1, 3.2**

### Property 5: Preview Rendering Timing

*For any* content change in DiagramEditor, preview rendering SHALL only be triggered after a successful save operation (manual or auto-save). Content changes without save SHALL NOT trigger preview rendering.

**Validates: Requirements 4.1, 4.2**

## Error Handling

### 保存失败

1. 显示 toast 错误提示
2. 保留 `isDirty = true` 状态
3. 不触发预览渲染
4. 用户可重试手动保存 (Ctrl+S)

### 设置读取失败

1. 使用默认值（autoSave: true, autoSaveInterval: 3）
2. 记录警告日志
3. 不影响编辑器正常使用

### 渲染失败

1. 显示错误信息在预览区域
2. 提供重试按钮
3. 不影响保存状态

## Testing Strategy

### 单元测试

1. **useSettings Store 测试**
   - 测试默认值（autoSave: true, autoSaveInterval: 3）
   - 测试 setAutoSaveInterval 范围限制（1-60）
   - 测试设置持久化

2. **useEditorSave Hook 测试**
   - 测试读取 Settings 配置
   - 测试 autoSave=false 时禁用自动保存
   - 测试 tabId 参数更新 isDirty 状态
   - 测试 onSaveSuccess 回调调用

3. **EditorSaveService 测试**
   - 测试 autoSaveDelay=0 时禁用自动保存
   - 测试防抖逻辑

### 属性测试

使用 fast-check 进行属性测试：

1. **Property 2: Range Validation**
   ```typescript
   // Feature: diagram-editor-save-optimization, Property 2: Range Validation
   fc.assert(
     fc.property(fc.integer(), (input) => {
       setAutoSaveInterval(input);
       const result = useSettings.getState().autoSaveInterval;
       return result >= 1 && result <= 60;
     }),
     { numRuns: 100 }
   );
   ```

2. **Property 3: Auto-save Disabled Behavior**
   ```typescript
   // Feature: diagram-editor-save-optimization, Property 3: Auto-save Disabled
   fc.assert(
     fc.property(fc.string(), (content) => {
       // Setup: autoSave = false
       useSettings.setState({ autoSave: false });
       const { updateContent } = useEditorSave({ nodeId: 'test', contentType: 'text' });
       
       updateContent(content);
       // Advance timers
       vi.advanceTimersByTime(10000);
       
       // Verify: no save was triggered
       return mockSave.mock.calls.length === 0;
     }),
     { numRuns: 100 }
   );
   ```

### 集成测试

1. **DiagramEditorContainer 测试**
   - 测试输入时不触发预览渲染
   - 测试保存后触发预览渲染
   - 测试手动保存 (Ctrl+S) 流程

### E2E 测试

1. **设置页面测试**
   - 测试修改 autoSaveInterval 范围
   - 测试开关 autoSave
   - 测试设置持久化

## File Changes

```
apps/desktop/src/
├── hooks/
│   └── use-editor-save.ts              # 修改：读取 useSettings，添加 tabId 参数
│   └── use-settings.ts                 # 修改：添加范围验证
├── fn/save/
│   └── editor-save.service.ts          # 修改：支持 autoSaveDelay=0 禁用自动保存
├── components/diagram-editor/
│   └── diagram-editor.container.fn.tsx # 修改：移除实时预览，使用 onSaveSuccess
└── routes/settings/
    └── general.tsx                     # 修改：调整 input min/max 范围
```

## Migration Notes

无需数据迁移。Settings Store 使用 Zustand persist，新字段会自动使用默认值。
