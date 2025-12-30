# Design Document: Excalidraw Performance Optimization

## Overview

本设计文档描述了 Grain Desktop 应用中 Excalidraw 编辑器的性能优化方案。通过分析现有实现，识别性能瓶颈，并提出针对性的优化策略。

### 问题分析

当前 Excalidraw 在 Tauri 桌面应用中存在卡顿问题，主要原因可能包括：

1. **频繁的 React 重新渲染** - onChange 回调触发状态更新导致组件重渲染
2. **ResizeObserver 过于敏感** - 尺寸变化频繁触发更新
3. **状态管理不当** - 使用 state 存储非渲染数据
4. **自动保存阻塞** - 保存操作可能阻塞主线程
5. **WebView 渲染性能** - Tauri WebView 可能未启用硬件加速

## Architecture

### 优化后的数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Excalidraw Performance Architecture                   │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │   User Input    │
                         │  (Drawing)      │
                         └────────┬────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Excalidraw Canvas     │
                    │   (Hardware Accelerated)│
                    └────────────┬────────────┘
                                 │
                                 │ onChange (throttled)
                                 ▼
              ┌──────────────────────────────────────┐
              │         View Component               │
              │  - Receives props only               │
              │  - No internal state for data        │
              │  - memo() wrapped                    │
              └──────────────────┬───────────────────┘
                                 │
                                 │ callback (no re-render)
                                 ▼
              ┌──────────────────────────────────────┐
              │       Container Component            │
              │  - Uses refs for current data        │
              │  - Debounced save (2000ms)           │
              │  - Throttled status updates          │
              │  - ResizeObserver with threshold     │
              └──────────────────┬───────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌─────────────────┐       ┌─────────────────┐
         │   Save Store    │       │   IndexedDB     │
         │ (throttled)     │       │ (async, non-    │
         │                 │       │  blocking)      │
         └─────────────────┘       └─────────────────┘
```

### 组件职责

| 组件 | 职责 | 优化策略 |
|------|------|----------|
| ExcalidrawEditorView | 渲染 Excalidraw | 使用 memo()，固定 containerSize |
| ExcalidrawEditorContainer | 数据管理 | refs 存储数据，防抖保存 |
| useSaveStore | 保存状态 | 节流状态更新 |

## Components and Interfaces

### 优化后的 Container 组件接口

```typescript
interface OptimizedContainerState {
  // 只有这些需要触发重渲染
  readonly initialData: ExcalidrawInitialData | null;
  readonly containerSize: ContainerSize | null;
}

interface OptimizedContainerRefs {
  // 这些使用 refs，不触发重渲染
  readonly currentData: MutableRefObject<ExcalidrawData | null>;
  readonly hasUnsavedChanges: MutableRefObject<boolean>;
  readonly isInitialized: MutableRefObject<boolean>;
  readonly sizeStable: MutableRefObject<boolean>;
}
```

### 优化后的 View 组件 Props

```typescript
interface ExcalidrawEditorViewProps {
  readonly initialData: ExcalidrawData | null;
  readonly theme: "light" | "dark";
  readonly onChange?: (
    elements: readonly unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>,
  ) => void;
  readonly onSave?: () => void;
  readonly viewModeEnabled?: boolean;
  readonly containerSize: ContainerSize;
}
```

### 性能配置常量

```typescript
// 性能相关常量
const PERFORMANCE_CONFIG = {
  // 自动保存延迟（毫秒）
  AUTO_SAVE_DELAY: 2000,
  // 保存状态更新节流（毫秒）
  STATUS_UPDATE_THROTTLE: 500,
  // ResizeObserver 防抖延迟（毫秒）
  RESIZE_DEBOUNCE_DELAY: 200,
  // 尺寸变化阈值（像素）
  SIZE_CHANGE_THRESHOLD: 10,
  // 最小有效尺寸（像素）
  MIN_VALID_SIZE: 200,
  // 初始布局等待时间（毫秒）
  INITIAL_LAYOUT_DELAY: 100,
} as const;
```

## Data Models

### ExcalidrawData 结构

```typescript
interface ExcalidrawData {
  readonly elements: readonly ExcalidrawElement[];
  readonly appState: ExcalidrawAppState;
  readonly files: Record<string, BinaryFileData>;
}

interface ExcalidrawAppState {
  readonly viewBackgroundColor: string;
  readonly scrollX?: number;
  readonly scrollY?: number;
  readonly zoom?: { value: number };
}
```

### 性能监控数据

```typescript
interface PerformanceMetrics {
  readonly renderCount: number;
  readonly lastRenderTime: number;
  readonly saveCount: number;
  readonly resizeCount: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: onChange 不触发组件重渲染

*For any* sequence of onChange events from Excalidraw, the Container component's render count should remain constant (not increase with each onChange).

**Validates: Requirements 2.1**

### Property 2: 尺寸变化阈值过滤

*For any* container size change below the threshold (10px), the View component should not re-render. Only size changes exceeding the threshold should trigger updates.

**Validates: Requirements 2.2, 4.2**

### Property 3: 内容解析缓存

*For any* sequence of renders after initialData is set, the parseExcalidrawContent function should only be called once. Subsequent renders should use the cached parsed data.

**Validates: Requirements 2.4**

### Property 4: 状态更新节流

*For any* sequence of save status updates within a 500ms window, at most one actual store update should occur.

**Validates: Requirements 3.4**

### Property 5: Resize 事件防抖

*For any* sequence of ResizeObserver callbacks within 200ms, only one size update should be applied to the component state.

**Validates: Requirements 4.1**

### Property 6: Excalidraw 实例保持

*For any* resize operation, the Excalidraw component instance should remain the same (not be re-created). The key prop should remain stable during resize.

**Validates: Requirements 4.4**

### Property 7: 保存操作合并

*For any* sequence of N rapid drawing changes (within AUTO_SAVE_DELAY), the number of actual save operations should be at most 1.

**Validates: Requirements 5.3**

### Property 8: 卸载时资源清理

*For any* component unmount, all event listeners should be removed, all pending debounced operations should be cancelled, and all refs should be cleared.

**Validates: Requirements 7.1, 7.2, 7.3**

## Error Handling

### 性能降级策略

| 场景 | 处理方式 |
|------|----------|
| 硬件加速不可用 | 记录警告日志，继续使用软件渲染 |
| 保存失败 | 重试一次，失败后显示错误提示 |
| 内存压力 | 减少历史记录保留数量 |
| 渲染帧率过低 | 记录性能日志供诊断 |

### 错误恢复

```typescript
// 保存失败重试逻辑
const saveWithRetry = async (data: ExcalidrawData): Promise<void> => {
  const result = await saveContent(data);
  if (result._tag === "Left") {
    logger.warn("[ExcalidrawEditor] 保存失败，重试中...");
    // 延迟 1 秒后重试一次
    await new Promise(resolve => setTimeout(resolve, 1000));
    const retryResult = await saveContent(data);
    if (retryResult._tag === "Left") {
      logger.error("[ExcalidrawEditor] 保存重试失败:", retryResult.left);
      markAsError(retryResult.left.message || "保存失败");
    }
  }
};
```

## Testing Strategy

### 测试方法

本功能采用双重测试策略：

1. **单元测试** - 验证具体示例和边界情况
2. **属性测试** - 验证通用属性在所有输入下成立

### 单元测试覆盖

| 测试场景 | 测试内容 |
|----------|----------|
| 初始化 | 验证组件正确初始化，不重复解析内容 |
| 主题切换 | 验证主题切换只触发一次重渲染 |
| 手动保存 | 验证 Ctrl+S 立即保存并取消防抖 |
| 组件卸载 | 验证所有资源正确清理 |
| 硬件加速检测 | 验证检测逻辑和警告日志 |

### 属性测试配置

- **测试框架**: Vitest + fast-check
- **最小迭代次数**: 100 次
- **标签格式**: `Feature: excalidraw-performance, Property N: {property_text}`

### 属性测试示例

```typescript
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";

describe("ExcalidrawEditor Performance Properties", () => {
  // Feature: excalidraw-performance, Property 5: Resize 事件防抖
  it("should debounce resize events within 200ms window", () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 100 }), { minLength: 2, maxLength: 10 }),
        (resizeDelays) => {
          // 模拟多次 resize 事件
          // 验证在 200ms 内只有一次更新
          const updates = simulateResizeEvents(resizeDelays);
          const windowedUpdates = countUpdatesInWindow(updates, 200);
          return windowedUpdates <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 性能基准测试

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 绘图帧率 | ≥ 30 FPS | requestAnimationFrame 计数 |
| 输入延迟 | < 100ms | 时间戳差值 |
| 内存增长 | < 10MB/分钟 | performance.memory |
| 保存延迟 | < 500ms | 异步操作计时 |

