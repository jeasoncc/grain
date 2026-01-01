# Design Document: Editor Save Queue

## Overview

本设计实现一个基于 p-queue 的编辑器保存队列服务，解决 Code、Diagram、Excalidraw 编辑器在 Tab 切换时的内容丢失问题。

### 问题分析

当前架构中，这三个编辑器使用 `key={activeTab.id}` 导致 Tab 切换时组件销毁重建：

```
Tab A (active) → Tab B (active)
     ↓
Component A unmounts → useEffect cleanup → saveNow() [async]
     ↓                                          ↓
Component B mounts → loadContent() [async]      ↓
     ↓                                          ↓
DB read ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←← DB write (可能还未完成)
```

竞态条件：新组件的 DB 读取可能早于旧组件的 DB 写入完成。

### 解决方案

引入保存队列，确保加载前等待保存完成：

```
Tab A (active) → Tab B (active)
     ↓
Component A unmounts → enqueueSave(nodeId, saveFn) [fire-and-forget]
     ↓
Component B mounts → waitForSave(nodeId) → loadContent()
                          ↓
                    等待 nodeId 的保存完成
```

## Architecture

### 数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Editor Save Queue Architecture                   │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │         Save Queue Service          │
                    │         (Singleton, p-queue)        │
                    │                                     │
                    │  ┌─────────────────────────────┐   │
                    │  │     pendingSaves: Map       │   │
                    │  │   nodeId → Promise<void>    │   │
                    │  └─────────────────────────────┘   │
                    │                                     │
                    │  ┌─────────────────────────────┐   │
                    │  │     queue: PQueue           │   │
                    │  │   concurrency: 1            │   │
                    │  └─────────────────────────────┘   │
                    └──────────────┬──────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Code Editor       │ │   Diagram Editor    │ │  Excalidraw Editor  │
│                     │ │                     │ │                     │
│ unmount:            │ │ unmount:            │ │ unmount:            │
│  enqueueSave()      │ │  enqueueSave()      │ │  enqueueSave()      │
│                     │ │                     │ │                     │
│ mount:              │ │ mount:              │ │ mount:              │
│  waitForSave()      │ │  waitForSave()      │ │  waitForSave()      │
│  → loadContent()    │ │  → loadContent()    │ │  → loadContent()    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### 依赖关系

```
lib/save-queue.ts (新增)
       │
       │ 被依赖
       ▼
hooks/use-unified-save.ts (修改)
       │
       │ 被依赖
       ▼
components/code-editor/code-editor.container.fn.tsx (修改)
components/diagram-editor/diagram-editor.container.fn.tsx (修改)
components/excalidraw-editor/excalidraw-editor.container.fn.tsx (修改)
```

## Components and Interfaces

### Save Queue Service

```typescript
// lib/save-queue.ts

import PQueue from "p-queue";

/**
 * 保存任务函数类型
 */
export type SaveFunction = () => Promise<boolean>;

/**
 * 保存队列服务接口
 */
export interface SaveQueueService {
  /**
   * 将保存任务入队
   * 如果同一 nodeId 已有待处理任务，替换为新任务
   * 
   * @param nodeId - 节点 ID
   * @param saveFn - 保存函数
   */
  readonly enqueueSave: (nodeId: string, saveFn: SaveFunction) => void;

  /**
   * 等待指定节点的保存完成
   * 如果没有待处理任务，立即返回
   * 超时后自动返回（不抛出异常）
   * 
   * @param nodeId - 节点 ID
   * @param timeout - 超时时间（毫秒），默认 5000
   */
  readonly waitForSave: (nodeId: string, timeout?: number) => Promise<void>;

  /**
   * 检查是否有待处理的保存任务
   * 
   * @param nodeId - 节点 ID
   */
  readonly hasPendingSave: (nodeId: string) => boolean;

  /**
   * 获取待处理保存的节点 ID 列表（用于调试）
   */
  readonly getPendingNodeIds: () => string[];
}

/**
 * 创建保存队列服务
 */
export const createSaveQueueService = (): SaveQueueService => {
  // p-queue 实例，concurrency=1 确保顺序执行
  const queue = new PQueue({ concurrency: 1 });
  
  // 待处理保存任务 Map
  // key: nodeId, value: { promise, saveFn }
  const pendingSaves = new Map<string, {
    promise: Promise<void>;
    saveFn: SaveFunction;
  }>();

  return {
    enqueueSave: (nodeId, saveFn) => { /* ... */ },
    waitForSave: async (nodeId, timeout = 5000) => { /* ... */ },
    hasPendingSave: (nodeId) => pendingSaves.has(nodeId),
    getPendingNodeIds: () => Array.from(pendingSaves.keys()),
  };
};

/**
 * 单例实例
 */
export const saveQueueService = createSaveQueueService();
```

### useUnifiedSave Hook 修改

```typescript
// hooks/use-unified-save.ts (修改部分)

import { saveQueueService } from "@/lib/save-queue";

// 在 cleanup effect 中使用队列
useEffect(() => {
  return () => {
    if (serviceRef.current) {
      const service = serviceRef.current;

      // 如果有未保存的更改，入队保存（fire-and-forget）
      if (service.hasUnsavedChanges()) {
        logger.info("[useUnifiedSave] 组件卸载，入队保存");
        saveQueueService.enqueueSave(nodeId, () => service.saveNow());
        
        // 清除 isDirty 状态（因为已入队）
        if (tabId && setTabDirty) {
          setTabDirty(tabId, false);
        }
      }

      // 清理资源
      service.dispose();
      serviceRef.current = null;
    }
  };
}, [nodeId, tabId, setTabDirty]);
```

### Editor Container 修改

```typescript
// components/code-editor/code-editor.container.fn.tsx (修改部分)

import { saveQueueService } from "@/lib/save-queue";

// 加载内容前等待保存完成
useEffect(() => {
  const loadContent = async () => {
    logger.info("[CodeEditor] 加载内容:", nodeId);

    // 等待该节点的待处理保存完成
    await saveQueueService.waitForSave(nodeId);

    const result = await getContentByNodeId(nodeId)();
    // ... 其余加载逻辑
  };

  loadContent();
}, [nodeId, setInitialContent]);
```

## Data Models

### 内部状态

```typescript
/**
 * 待处理保存任务
 */
interface PendingSaveTask {
  /** 保存完成的 Promise */
  readonly promise: Promise<void>;
  /** 保存函数（用于替换） */
  readonly saveFn: SaveFunction;
}

/**
 * 队列内部状态
 */
interface QueueState {
  /** p-queue 实例 */
  readonly queue: PQueue;
  /** 待处理任务 Map */
  readonly pendingSaves: Map<string, PendingSaveTask>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 单例一致性

*For any* number of calls to get the save queue service, the returned instance SHALL be the same object.

**Validates: Requirements 1.1**

### Property 2: 相同 nodeId 去重

*For any* sequence of `enqueueSave` calls with the same nodeId, only the last save function SHALL be executed.

**Validates: Requirements 1.5**

### Property 3: 顺序执行

*For any* sequence of enqueued save tasks, they SHALL execute in FIFO order (one at a time).

**Validates: Requirements 1.6**

### Property 4: waitForSave 行为

*For any* nodeId:
- If there is a pending save, `waitForSave` SHALL wait for it to complete
- If there is no pending save, `waitForSave` SHALL resolve immediately

**Validates: Requirements 3.2, 3.3**

### Property 5: 错误恢复

*For any* failed save task:
- The task SHALL be removed from pending saves
- Subsequent saves SHALL NOT be blocked
- `waitForSave` SHALL resolve (not reject)

**Validates: Requirements 5.2, 5.3, 5.4**

### Property 6: 超时保护

*For any* `waitForSave` call:
- If the pending save takes longer than timeout, the function SHALL resolve
- The timeout SHALL default to 5000ms

**Validates: Requirements 6.2, 6.3**

### Property 7: 非阻塞入队

*For any* `enqueueSave` call, the function SHALL return immediately without waiting for the save to complete.

**Validates: Requirements 6.1**

## Error Handling

### 保存失败

```typescript
const executeSave = async (nodeId: string, saveFn: SaveFunction) => {
  try {
    await saveFn();
    logger.success(`[SaveQueue] 保存成功: ${nodeId}`);
  } catch (error) {
    logger.error(`[SaveQueue] 保存失败: ${nodeId}`, error);
    // 不抛出异常，允许后续操作继续
  } finally {
    // 无论成功失败，都从 pending 中移除
    pendingSaves.delete(nodeId);
  }
};
```

### 超时处理

```typescript
const waitForSave = async (nodeId: string, timeout = 5000) => {
  const pending = pendingSaves.get(nodeId);
  if (!pending) return;

  try {
    await Promise.race([
      pending.promise,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          logger.warn(`[SaveQueue] 等待超时: ${nodeId}`);
          resolve();
        }, timeout);
      }),
    ]);
  } catch {
    // 忽略错误，允许加载继续
    logger.warn(`[SaveQueue] 等待时发生错误: ${nodeId}`);
  }
};
```

## Testing Strategy

### 单元测试

使用 Vitest 测试 save-queue.ts 的核心逻辑：

1. **单例测试** - 验证多次获取返回同一实例
2. **入队测试** - 验证任务正确入队
3. **去重测试** - 验证相同 nodeId 只保留最新任务
4. **等待测试** - 验证 waitForSave 的等待行为
5. **超时测试** - 验证超时后正确返回
6. **错误测试** - 验证错误处理不阻塞后续操作

### 属性测试

使用 fast-check 进行属性测试：

1. **Property 1** - 单例一致性
2. **Property 2** - 相同 nodeId 去重
3. **Property 3** - 顺序执行
4. **Property 4** - waitForSave 行为
5. **Property 5** - 错误恢复
6. **Property 6** - 超时保护
7. **Property 7** - 非阻塞入队

### 测试配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // 属性测试至少运行 100 次
    testTimeout: 30000,
  },
});
```

### 测试标签格式

```typescript
/**
 * Feature: editor-save-queue, Property 2: 相同 nodeId 去重
 * Validates: Requirements 1.5
 */
it.prop([fc.string(), fc.array(fc.func(fc.boolean()))])
```
