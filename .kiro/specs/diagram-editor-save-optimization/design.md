# Design Document

## Introduction

本设计文档描述了 DiagramEditor 保存优化功能的技术实现方案。核心目标是将实时渲染改为基于保存的渲染，减少编辑时的性能开销和视觉干扰。

## Architecture Overview

### 当前架构

```
用户输入 → handleCodeChange → debouncedPreview (500ms) → renderDiagram
                           → updateContent → EditorSaveService (1000ms) → DB
```

问题：每次输入都会触发预览渲染，即使使用了 500ms 防抖，频繁输入仍会导致多次渲染。

### 目标架构

```
用户输入 → handleCodeChange → updateContent (标记未保存)
                                    ↓
                           [空闲检测 / 手动保存]
                                    ↓
                              saveContent → DB
                                    ↓
                              renderPreview → SVG
```

关键变化：
1. 预览渲染只在保存后触发
2. 自动保存使用空闲检测而非简单防抖
3. 自动保存默认关闭

## Components

### 1. DiagramStore 扩展

扩展现有 `DiagramStore` 添加保存相关设置：

```typescript
// types/diagram/diagram.interface.ts
export interface DiagramState {
  readonly krokiServerUrl: string;
  readonly enableKroki: boolean;
  // 新增
  readonly diagramAutoSave: boolean;        // 是否启用自动保存，默认 false
  readonly diagramAutoSaveDelay: number;    // 自动保存延迟（秒），默认 60
}

export interface DiagramActions {
  setKrokiServerUrl: (url: string) => void;
  setEnableKroki: (enabled: boolean) => void;
  testKrokiConnection: () => Promise<boolean>;
  // 新增
  setDiagramAutoSave: (enabled: boolean) => void;
  setDiagramAutoSaveDelay: (delay: number) => void;
}
```

### 2. useIdleSave Hook

新建 Hook 实现空闲检测保存逻辑：

```typescript
// hooks/use-idle-save.ts
export interface UseIdleSaveOptions {
  readonly nodeId: string;
  readonly contentType: ContentType;
  readonly enabled: boolean;              // 是否启用自动保存
  readonly idleTimeout: number;           // 空闲超时（毫秒）
  readonly onSaveSuccess?: () => void;
  readonly onSaveError?: (error: Error) => void;
  readonly onSaveComplete?: () => void;   // 保存完成回调（用于触发渲染）
}

export interface UseIdleSaveReturn {
  updateContent: (content: string) => void;
  saveNow: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  setInitialContent: (content: string) => void;
  isIdle: boolean;                        // 当前是否处于空闲状态
}
```

空闲检测逻辑：
1. 用户输入时重置空闲计时器
2. 计时器到期时标记为空闲状态
3. 空闲状态下触发自动保存
4. 保存完成后调用 `onSaveComplete` 回调

### 3. DiagramEditorContainer 修改

更新容器组件使用新的保存和渲染策略：

```typescript
// 关键变化
const { diagramAutoSave, diagramAutoSaveDelay } = useDiagramStore();

// 使用 useIdleSave 替代 useEditorSave
const { updateContent, saveNow, hasUnsavedChanges, setInitialContent } = useIdleSave({
  nodeId,
  contentType: "text",
  enabled: diagramAutoSave,
  idleTimeout: diagramAutoSaveDelay * 1000,
  onSaveComplete: () => {
    // 保存完成后触发渲染
    updatePreview(code);
  },
});

// 移除 debouncedPreview 调用
const handleCodeChange = useCallback((newCode: string) => {
  setCode(newCode);
  updateContent(newCode);
  // 不再调用 debouncedPreview
}, [updateContent]);

// 手动保存时也触发渲染
const handleManualSave = useCallback(async () => {
  await saveNow();
  updatePreview(code);
}, [saveNow, code, updatePreview]);
```

### 4. 保存状态指示组件

新建组件显示保存状态：

```typescript
// components/diagram-editor/save-status-indicator.view.fn.tsx
export interface SaveStatusIndicatorProps {
  readonly hasUnsavedChanges: boolean;
  readonly isSaving: boolean;
  readonly autoSaveEnabled: boolean;
}

export const SaveStatusIndicator = memo(({ 
  hasUnsavedChanges, 
  isSaving, 
  autoSaveEnabled 
}: SaveStatusIndicatorProps) => {
  // 显示状态：
  // - 未保存变更：黄色圆点 + "Unsaved"
  // - 保存中：旋转图标 + "Saving..."
  // - 已保存：绿色勾 + "Saved"
  // - 自动保存关闭：灰色图标 + "Auto-save off"
});
```

### 5. 设置界面扩展

在 `/settings/diagrams` 页面添加保存设置：

```typescript
// routes/settings/diagrams.tsx
// 新增 Auto-save Section
<div className="space-y-6">
  <h4>Auto-save Settings</h4>
  
  {/* 启用/禁用自动保存 */}
  <div className="flex items-center justify-between">
    <Label>Enable auto-save for diagrams</Label>
    <Switch checked={diagramAutoSave} onCheckedChange={setDiagramAutoSave} />
  </div>
  
  {/* 自动保存延迟（仅在启用时显示） */}
  {diagramAutoSave && (
    <div className="space-y-2">
      <Label>Auto-save delay (seconds)</Label>
      <Slider 
        min={10} 
        max={300} 
        value={diagramAutoSaveDelay}
        onChange={setDiagramAutoSaveDelay}
      />
      <p className="text-xs text-muted-foreground">
        Save after {diagramAutoSaveDelay} seconds of inactivity
      </p>
    </div>
  )}
</div>
```

## Data Models

### DiagramState 扩展

```typescript
interface DiagramState {
  // 现有字段
  readonly krokiServerUrl: string;
  readonly enableKroki: boolean;
  
  // 新增字段
  readonly diagramAutoSave: boolean;      // 默认: false
  readonly diagramAutoSaveDelay: number;  // 默认: 60 (秒)
}
```

### 持久化

设置通过 Zustand persist 中间件自动持久化到 localStorage，key 为 `diagram-settings`。

## Correctness Properties

### Property 1: 自动保存默认关闭

```
INVARIANT: 新安装或重置设置后，diagramAutoSave === false
```

### Property 2: 空闲检测准确性

```
INVARIANT: 
  IF 用户在 idleTimeout 时间内有输入
  THEN 不触发自动保存
  
INVARIANT:
  IF 用户停止输入超过 idleTimeout 时间 AND diagramAutoSave === true
  THEN 触发自动保存
```

### Property 3: 预览渲染时机

```
INVARIANT:
  预览渲染 ONLY 在以下情况触发:
  1. 初始加载完成
  2. 手动保存 (Ctrl+S) 完成
  3. 自动保存完成
  
INVARIANT:
  用户输入时 NOT 触发预览渲染
```

### Property 4: 保存延迟范围

```
INVARIANT: 10 <= diagramAutoSaveDelay <= 300
```

### Property 5: 手动保存始终可用

```
INVARIANT:
  无论 diagramAutoSave 设置如何，Ctrl+S 始终触发立即保存和渲染
```

## Error Handling

### 保存失败

1. 显示 toast 错误提示
2. 保留未保存状态指示
3. 不触发预览渲染
4. 用户可重试手动保存

### 渲染失败

1. 显示错误信息在预览区域
2. 提供重试按钮
3. 不影响保存状态

## Performance Considerations

### 优化点

1. **减少渲染次数**: 从每次输入渲染改为仅保存后渲染
2. **减少网络请求**: PlantUML 渲染请求大幅减少
3. **减少 CPU 使用**: Mermaid 客户端渲染次数减少

### 预期改进

- 输入延迟: 消除渲染导致的卡顿
- 网络流量: PlantUML 请求减少 90%+
- 电池消耗: 减少不必要的计算

## Migration Strategy

### 向后兼容

1. 新增字段使用默认值，不影响现有用户
2. 现有 `useEditorSave` hook 保持不变，其他编辑器不受影响
3. 渐进式迁移：先实现功能，后续可扩展到其他编辑器

### 数据迁移

无需数据迁移，新字段通过 Zustand persist 自动处理默认值。

## Testing Strategy

### 单元测试

1. `useIdleSave` hook 测试
   - 空闲检测逻辑
   - 保存触发时机
   - 回调调用

2. `DiagramStore` 测试
   - 新增 actions 测试
   - 默认值测试
   - 范围限制测试

### 集成测试

1. `DiagramEditorContainer` 测试
   - 保存后渲染触发
   - 输入时不渲染
   - 手动保存流程

### E2E 测试

1. 设置页面测试
   - 开关自动保存
   - 调整延迟时间
   - 设置持久化

## File Structure

```
apps/desktop/src/
├── types/diagram/
│   └── diagram.interface.ts          # 修改：添加新字段
├── stores/
│   └── diagram.store.ts              # 修改：添加新 actions
├── hooks/
│   ├── use-editor-save.ts            # 保持不变
│   └── use-idle-save.ts              # 新增：空闲检测保存 hook
├── components/diagram-editor/
│   ├── diagram-editor.container.fn.tsx  # 修改：使用新保存策略
│   ├── diagram-editor.view.fn.tsx       # 修改：添加保存状态显示
│   ├── diagram-editor.types.ts          # 修改：添加新 props
│   └── save-status-indicator.view.fn.tsx # 新增：保存状态指示组件
└── routes/settings/
    └── diagrams.tsx                  # 修改：添加保存设置 UI
```
