# Design Document: File Tree Performance Fix

## Overview

本设计文档描述文件树性能优化和用户体验改进的技术方案。核心策略是：
1. **乐观更新** - UI 先更新，后端异步同步
2. **智能缓存** - 使用 TanStack Query 管理数据缓存
3. **防抖合并** - 减少不必要的后端请求
4. **自动定位** - 新建文件后自动展开和选中

## Architecture

### 数据流架构

```
用户操作
    │
    ▼
┌─────────────────────────────────────────┐
│  FileTree View (纯展示)                  │
│  - 立即更新 UI                           │
│  - 触发回调                              │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  FileTreePanel Container                │
│  - 乐观更新本地状态                      │
│  - 调用 flows                           │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  Flows (业务流程)                        │
│  - 更新 TanStack Query 缓存              │
│  - 异步调用后端 API                      │
│  - 错误处理和回滚                        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  IO/API (后端交互)                       │
│  - 防抖合并请求                          │
│  - 批量更新                              │
└─────────────────────────────────────────┘
```

### 组件层次

```
FileTreePanelContainer (容器)
    │
    ├─ useNodesByWorkspace (TanStack Query)
    │   └─ 缓存节点数据
    │
    ├─ useOptimisticNodeUpdate (自定义 Hook)
    │   └─ 乐观更新逻辑
    │
    └─ FileTree (纯展示)
        └─ react-arborist (虚拟化)
```

## Components and Interfaces

### 1. 乐观更新 Hook

```typescript
// hooks/use-optimistic-node-update.ts

interface OptimisticUpdateOptions {
  workspaceId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface OptimisticNodeUpdate {
  // 乐观更新节点折叠状态
  toggleCollapsed: (nodeId: string, collapsed: boolean) => Promise<void>;
  
  // 乐观创建节点
  createNode: (node: Partial<NodeInterface>) => Promise<NodeInterface>;
  
  // 乐观删除节点
  deleteNode: (nodeId: string) => Promise<void>;
  
  // 乐观重命名节点
  renameNode: (nodeId: string, title: string) => Promise<void>;
  
  // 乐观移动节点
  moveNode: (nodeId: string, parentId: string | null, order: number) => Promise<void>;
}

export function useOptimisticNodeUpdate(
  options: OptimisticUpdateOptions
): OptimisticNodeUpdate;
```

**实现策略**:
- 使用 TanStack Query 的 `useMutation` 和 `queryClient.setQueryData`
- 立即更新缓存数据（乐观更新）
- 异步调用后端 API
- 失败时回滚缓存数据

### 2. 节点展开状态管理

```typescript
// state/file-tree-expansion.state.ts

interface FileTreeExpansionState {
  // 每个工作区的展开状态
  readonly expansionByWorkspace: Readonly<Record<string, Set<string>>>;
}

interface FileTreeExpansionActions {
  // 设置节点展开状态
  setExpanded: (workspaceId: string, nodeId: string, expanded: boolean) => void;
  
  // 批量设置展开状态
  setMultipleExpanded: (workspaceId: string, nodeIds: string[], expanded: boolean) => void;
  
  // 获取展开状态
  isExpanded: (workspaceId: string, nodeId: string) => boolean;
  
  // 清空工作区展开状态
  clearWorkspace: (workspaceId: string) => void;
}
```

**持久化策略**:
- 使用 Zustand persist 中间件
- 存储到 localStorage
- 每个工作区独立存储
- 限制存储大小（最多 1000 个节点）

### 3. 自动定位功能

```typescript
// pipes/file-tree/auto-expand.pipe.ts

/**
 * 计算需要展开的祖先节点路径
 */
export function calculateAncestorPath(
  nodes: NodeInterface[],
  targetNodeId: string
): string[];

/**
 * 展开到目标节点
 */
export function expandToNode(
  workspaceId: string,
  nodeId: string,
  setExpanded: (workspaceId: string, nodeId: string, expanded: boolean) => void
): void;
```

### 4. 文件模板系统

```typescript
// pipes/content/templates.pipe.ts

export interface FileTemplate {
  readonly type: NodeType;
  readonly content: string;
  readonly title: string;
}

export const FILE_TEMPLATES: Record<NodeType, FileTemplate> = {
  file: {
    type: "file",
    title: "New File",
    content: "# New File\n\nStart writing here...\n",
  },
  drawing: {
    type: "drawing",
    title: "New Canvas",
    content: JSON.stringify({
      elements: [],
      appState: { viewBackgroundColor: "#ffffff" },
      files: {},
    }),
  },
  diary: {
    type: "diary",
    title: "", // 动态生成日期
    content: "", // 动态生成内容
  },
  folder: {
    type: "folder",
    title: "New Folder",
    content: "",
  },
};

/**
 * 获取文件模板
 */
export function getFileTemplate(type: NodeType, date?: Date): FileTemplate;
```

### 5. Query Devtools 配置

```typescript
// views/utils/devtools-wrapper.container.fn.tsx

export function DevtoolsWrapper(): JSX.Element {
  const isDev = import.meta.env.DEV;
  
  if (!isDev) return null;
  
  return (
    <>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools 
        initialIsOpen={false}
        position="bottom-left"
        buttonPosition="bottom-left"
      />
    </>
  );
}
```

## Data Models

### 节点缓存数据结构

```typescript
// TanStack Query Key Structure
type NodeQueryKey = ["nodes", "workspace", string]; // ["nodes", "workspace", workspaceId]

// 缓存数据
interface NodeCacheData {
  nodes: NodeInterface[];
  timestamp: number;
  version: number;
}
```

### 展开状态数据结构

```typescript
// localStorage 存储格式
interface FileTreeExpansionStorage {
  version: 1;
  data: {
    [workspaceId: string]: {
      expanded: string[]; // 展开的节点 ID 列表
      timestamp: number;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 乐观更新一致性

*For any* 节点操作（展开、创建、删除、重命名、移动），UI 状态应该立即更新，并且最终与后端状态一致。如果后端操作失败，UI 状态应该回滚到操作前的状态。

**Validates: Requirements 1.1, 1.4, 6.1**

### Property 2: 自动定位完整性

*For any* 新创建的节点，系统应该展开从根节点到该节点的所有祖先节点，并且在文件树中选中该节点。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: 模板内容正确性

*For any* 文件类型，创建新文件时应该填充对应类型的模板内容，并且模板内容应该能被编辑器正确解析和渲染。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: 缓存一致性

*For any* 工作区，当节点数据发生变化时，TanStack Query 缓存应该自动更新，并且所有使用该缓存的组件应该重新渲染。

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 5: 防抖合并正确性

*For any* 连续的节点操作序列，系统应该合并相同类型的操作，并且只发送必要的后端请求。最终后端状态应该与用户最后的操作一致。

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 6: 展开状态持久化

*For any* 工作区，用户展开的文件夹状态应该保存到 localStorage，并且在页面刷新后能够正确恢复。

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 7: 虚拟化性能

*For any* 节点数量，文件树应该只渲染可见区域的节点，并且滚动时应该保持流畅（60fps）。

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

## Error Handling

### 1. 后端操作失败

```typescript
// 乐观更新失败时回滚
try {
  // 1. 乐观更新 UI
  queryClient.setQueryData(queryKey, optimisticData);
  
  // 2. 调用后端 API
  await backendAPI();
} catch (error) {
  // 3. 回滚 UI
  queryClient.setQueryData(queryKey, previousData);
  
  // 4. 显示错误提示
  toast.error("Operation failed: " + error.message);
  
  // 5. 记录错误日志
  logger.error("[FileTree] Operation failed", { error, context });
}
```

### 2. 网络连接失败

```typescript
// 检测网络状态
if (!navigator.onLine) {
  toast.error("No internet connection. Changes will be saved when online.");
  // 将操作加入离线队列
  offlineQueue.add(operation);
  return;
}
```

### 3. 缓存数据损坏

```typescript
// 验证缓存数据
const cachedData = queryClient.getQueryData(queryKey);
if (!isValidNodeData(cachedData)) {
  logger.warn("[FileTree] Invalid cache data, refetching");
  queryClient.invalidateQueries(queryKey);
}
```

## Testing Strategy

### Unit Tests

- 测试乐观更新逻辑（成功和失败场景）
- 测试自动定位路径计算
- 测试文件模板生成
- 测试防抖合并逻辑
- 测试展开状态持久化

### Integration Tests

- 测试文件树与后端 API 的交互
- 测试 TanStack Query 缓存更新
- 测试多个组件之间的状态同步

### Property-Based Tests

- Property 1: 乐观更新一致性测试
- Property 2: 自动定位完整性测试
- Property 3: 模板内容正确性测试
- Property 4: 缓存一致性测试
- Property 5: 防抖合并正确性测试

### E2E Tests

- 测试完整的文件创建流程
- 测试文件树展开和折叠
- 测试拖拽移动节点
- 测试页面刷新后状态恢复

## Performance Targets

| 指标 | 目标 | 当前 |
|------|------|------|
| 节点展开响应时间 | < 50ms | ~500ms |
| 文件创建到显示 | < 300ms | ~1000ms |
| 滚动帧率 | 60fps | ~30fps |
| 首次渲染时间 | < 200ms | ~500ms |
| 内存占用（1000节点） | < 50MB | ~100MB |

## Migration Strategy

### Phase 1: 基础设施（不影响现有功能）

1. 创建乐观更新 Hook
2. 创建展开状态管理 Store
3. 创建文件模板系统
4. 添加 Query Devtools

### Phase 2: 渐进式迁移

1. 先迁移节点展开/折叠功能
2. 再迁移文件创建功能
3. 最后迁移其他操作（删除、重命名、移动）

### Phase 3: 性能优化

1. 添加防抖合并
2. 优化虚拟化参数
3. 添加性能监控

### Phase 4: 清理

1. 移除旧的实现代码
2. 更新文档
3. 性能测试和验证

