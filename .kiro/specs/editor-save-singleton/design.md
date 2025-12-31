# Design Document: 编辑器保存服务单例化

## Overview

本设计将编辑器保存服务从"每组件一实例"改为"单例多 model"模式，解决 Tab 切换时的状态丢失和竞态条件问题。

### 问题分析

当前架构问题：

```
组件 A 挂载 → 创建 SaveService A → 编辑内容 → pendingContent 存在
     ↓
Tab 切换
     ↓
组件 A 卸载 → 清理 effect 执行 → 但 serviceRef 可能已被 useMemo 清理
     ↓
组件 B 挂载 → 创建 SaveService B → 加载内容
     ↓
组件 A 的 pendingContent 丢失！
```

### 解决方案

单例多 model 模式：

```
SaveServiceManager (单例)
├── models: Map<nodeId, SaveModel>
│   ├── nodeId-1 → SaveModel { pendingContent, lastSavedContent, ... }
│   ├── nodeId-2 → SaveModel { pendingContent, lastSavedContent, ... }
│   └── nodeId-3 → SaveModel { pendingContent, lastSavedContent, ... }
│
组件只连接，不创建/销毁：
├── 组件挂载 → manager.getOrCreate(nodeId) → 获取已有 model
├── 组件编辑 → manager.updateContent(nodeId, content)
├── 组件卸载 → 什么都不做（model 保留）
└── Tab 关闭 → manager.dispose(nodeId)（可选）
```

## Architecture

### 数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Save Service Manager Architecture                     │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │      SaveServiceManager (单例)       │
                    │                                     │
                    │  ┌─────────────────────────────┐   │
                    │  │     models: Map<nodeId,     │   │
                    │  │              SaveModel>     │   │
                    │  └─────────────────────────────┘   │
                    │                                     │
                    │  Methods:                           │
                    │  - getOrCreate(nodeId, config)      │
                    │  - updateContent(nodeId, content)   │
                    │  - saveNow(nodeId)                  │
                    │  - hasUnsavedChanges(nodeId)        │
                    │  - setInitialContent(nodeId, c)     │
                    │  - dispose(nodeId)                  │
                    └──────────────┬──────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Code Editor       │ │   Diagram Editor    │ │  Excalidraw Editor  │
│                     │ │                     │ │                     │
│ mount:              │ │ mount:              │ │ mount:              │
│  getOrCreate()      │ │  getOrCreate()      │ │  getOrCreate()      │
│  setInitialContent()│ │  setInitialContent()│ │  setInitialContent()│
│                     │ │                     │ │                     │
│ edit:               │ │ edit:               │ │ edit:               │
│  updateContent()    │ │  updateContent()    │ │  updateContent()    │
│                     │ │                     │ │                     │
│ Ctrl+S:             │ │ Ctrl+S:             │ │ Ctrl+S:             │
│  saveNow()          │ │  saveNow()          │ │  saveNow()          │
│                     │ │                     │ │                     │
│ unmount:            │ │ unmount:            │ │ unmount:            │
│  (nothing)          │ │  (nothing)          │ │  (nothing)          │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### 依赖关系

```
lib/save-service-manager.ts (新增)
       │
       │ 被依赖
       ▼
hooks/use-unified-save.ts (重构)
       │
       │ 被依赖
       ▼
components/code-editor/code-editor.container.fn.tsx (简化)
components/diagram-editor/diagram-editor.container.fn.tsx (简化)
components/excalidraw-editor/excalidraw-editor.container.fn.tsx (简化)
```

## Components and Interfaces

### SaveModel Interface

```typescript
// lib/save-service-manager.ts

/**
 * 单个节点的保存状态模型
 */
interface SaveModel {
  /** 节点 ID */
  readonly nodeId: string;
  /** 内容类型 */
  readonly contentType: ContentType;
  /** 待保存的内容 */
  pendingContent: string | null;
  /** 上次保存的内容 */
  lastSavedContent: string;
  /** 是否正在保存 */
  isSaving: boolean;
  /** 防抖保存函数 */
  debouncedSave: DebouncedFunction<[string], Promise<boolean>> | null;
  /** Tab ID（用于更新 isDirty） */
  tabId?: string;
}
```

### SaveServiceManager Interface

```typescript
/**
 * 保存服务管理器配置
 */
export interface SaveModelConfig {
  /** 节点 ID */
  readonly nodeId: string;
  /** 内容类型 */
  readonly contentType: ContentType;
  /** 自动保存延迟（毫秒），0 禁用 */
  readonly autoSaveDelay?: number;
  /** Tab ID */
  readonly tabId?: string;
  /** 保存开始回调 */
  readonly onSaving?: () => void;
  /** 保存成功回调 */
  readonly onSaved?: () => void;
  /** 保存失败回调 */
  readonly onError?: (error: Error) => void;
}

/**
 * 保存服务管理器接口
 */
export interface SaveServiceManagerInterface {
  /**
   * 获取或创建 SaveModel
   * 如果已存在，更新配置；如果不存在，创建新的
   */
  readonly getOrCreate: (config: SaveModelConfig) => void;

  /**
   * 更新内容（触发防抖自动保存）
   */
  readonly updateContent: (nodeId: string, content: string) => void;

  /**
   * 立即保存
   */
  readonly saveNow: (nodeId: string) => Promise<boolean>;

  /**
   * 设置初始内容（不触发保存）
   */
  readonly setInitialContent: (nodeId: string, content: string) => void;

  /**
   * 是否有未保存的更改
   */
  readonly hasUnsavedChanges: (nodeId: string) => boolean;

  /**
   * 获取待保存的内容
   */
  readonly getPendingContent: (nodeId: string) => string | null;

  /**
   * 清理指定节点的 model
   */
  readonly dispose: (nodeId: string) => void;

  /**
   * 清理所有 model
   */
  readonly disposeAll: () => void;

  /**
   * 获取所有有未保存更改的节点 ID
   */
  readonly getUnsavedNodeIds: () => string[];

  /**
   * 保存所有未保存的内容
   */
  readonly saveAll: () => Promise<void>;
}
```

### useUnifiedSave Hook (重构)

```typescript
// hooks/use-unified-save.ts

/**
 * 统一编辑器保存 Hook（单例模式）
 * 
 * 组件只负责连接 SaveServiceManager，不负责创建/销毁服务
 */
export function useUnifiedSave(options: UseUnifiedSaveOptions): UseUnifiedSaveReturn {
  const { nodeId, contentType, tabId, initialContent, onSaveSuccess, onSaveError } = options;

  // 读取全局设置
  const { autoSave, autoSaveInterval } = useSettings();
  const effectiveDelay = autoSave ? (autoSaveInterval ?? 3) * 1000 : 0;

  // Store 连接
  const { markAsUnsaved, markAsSaving, markAsSaved, markAsError } = useSaveStore();
  const setTabDirty = useEditorTabsStore((s) => s.setTabDirty);

  // 注册/更新 model（组件挂载时）
  useEffect(() => {
    saveServiceManager.getOrCreate({
      nodeId,
      contentType,
      autoSaveDelay: effectiveDelay,
      tabId,
      onSaving: markAsSaving,
      onSaved: () => {
        markAsSaved();
        onSaveSuccess?.();
      },
      onError: (error) => {
        markAsError(error.message);
        onSaveError?.(error);
      },
    });
  }, [nodeId, contentType, effectiveDelay, tabId]);

  // 设置初始内容
  useEffect(() => {
    if (initialContent !== undefined) {
      saveServiceManager.setInitialContent(nodeId, initialContent);
    }
  }, [nodeId, initialContent]);

  // 注册 Ctrl+S 快捷键
  useEffect(() => {
    const handleSave = () => saveServiceManager.saveNow(nodeId);
    keyboardShortcutManager.registerShortcut("ctrl+s", handleSave);
    keyboardShortcutManager.registerShortcut("meta+s", handleSave);
    return () => {
      keyboardShortcutManager.unregisterShortcut("ctrl+s");
      keyboardShortcutManager.unregisterShortcut("meta+s");
    };
  }, [nodeId]);

  // 注意：组件卸载时不清理 model！

  return {
    updateContent: (content: string) => {
      markAsUnsaved();
      saveServiceManager.updateContent(nodeId, content);
    },
    saveNow: () => saveServiceManager.saveNow(nodeId),
    hasUnsavedChanges: () => saveServiceManager.hasUnsavedChanges(nodeId),
    setInitialContent: (content: string) => saveServiceManager.setInitialContent(nodeId, content),
  };
}
```

## Data Models

### SaveModel 状态

```typescript
interface SaveModel {
  // 标识
  nodeId: string;
  contentType: ContentType;
  tabId?: string;

  // 内容状态
  pendingContent: string | null;  // 待保存的内容
  lastSavedContent: string;       // 上次保存的内容

  // 保存状态
  isSaving: boolean;

  // 防抖函数
  debouncedSave: DebouncedFunction | null;

  // 回调
  onSaving?: () => void;
  onSaved?: () => void;
  onError?: (error: Error) => void;
}
```

### 状态转换

```
初始状态:
  pendingContent = null
  lastSavedContent = ""

setInitialContent(content):
  lastSavedContent = content
  pendingContent = null (不变)

updateContent(content):
  pendingContent = content
  触发 debouncedSave

saveNow():
  if pendingContent !== null && pendingContent !== lastSavedContent:
    isSaving = true
    保存到 DB
    lastSavedContent = pendingContent
    pendingContent = null
    isSaving = false

hasUnsavedChanges():
  return pendingContent !== null && pendingContent !== lastSavedContent
```

## Tab 切换流程

```
Tab A (active) → Tab B (active)

1. 用户点击 Tab B
2. Store 更新 activeTabId
3. 组件 A 卸载（什么都不做，model 保留）
4. 组件 B 挂载
5. 组件 B 调用 getOrCreate(nodeId-B)
6. 组件 B 从 DB 加载内容
7. 组件 B 调用 setInitialContent(content)

切换回 Tab A:
1. 用户点击 Tab A
2. Store 更新 activeTabId
3. 组件 B 卸载（什么都不做，model 保留）
4. 组件 A 挂载
5. 组件 A 调用 getOrCreate(nodeId-A)
6. 发现 model 已存在，检查 pendingContent
7. 如果有 pendingContent，使用它；否则从 DB 加载
```

## 清理策略

### 何时清理

1. **Tab 关闭时** - 当用户关闭 Tab（不是切换），可以清理对应的 model
2. **应用退出时** - 调用 saveAll() 保存所有未保存的内容，然后 disposeAll()
3. **内存压力时** - 可选：清理长时间未使用的 model

### 清理实现

```typescript
// 在 editor-tabs.store 中，当 Tab 关闭时
const closeTab = (tabId: string) => {
  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    // 先保存
    saveServiceManager.saveNow(tab.nodeId);
    // 然后清理
    saveServiceManager.dispose(tab.nodeId);
  }
  // 更新 tabs 状态...
};
```

## Error Handling

### 保存失败

```typescript
const saveContent = async (nodeId: string): Promise<boolean> => {
  const model = models.get(nodeId);
  if (!model || model.pendingContent === null) return true;

  model.isSaving = true;
  model.onSaving?.();

  try {
    const result = await updateContentByNodeId(nodeId, model.pendingContent, model.contentType)();
    if (E.isRight(result)) {
      model.lastSavedContent = model.pendingContent;
      model.pendingContent = null;
      model.onSaved?.();
      return true;
    } else {
      // 保存失败，保留 pendingContent 以便重试
      model.onError?.(new Error(result.left.message));
      return false;
    }
  } catch (error) {
    model.onError?.(error instanceof Error ? error : new Error("Unknown error"));
    return false;
  } finally {
    model.isSaving = false;
  }
};
```

## Testing Strategy

### 单元测试

1. **getOrCreate** - 创建新 model / 获取已有 model
2. **updateContent** - 更新 pendingContent / 触发防抖
3. **saveNow** - 保存成功 / 保存失败 / 无内容
4. **hasUnsavedChanges** - 有更改 / 无更改
5. **dispose** - 清理 model / 取消防抖

### 集成测试

1. **Tab 切换** - 切换后内容保留
2. **快速切换** - 多次快速切换不丢失内容
3. **Tab 关闭** - 关闭前保存

