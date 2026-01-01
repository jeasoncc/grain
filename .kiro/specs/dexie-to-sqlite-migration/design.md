# 设计文档：IndexedDB (Dexie) 到 SQLite 迁移

## 概述

本文档定义从 Dexie/IndexedDB 迁移到 SQLite/TanStack Query 的技术方案。迁移采用分层替换策略，确保每一层都可以独立测试和验证。

## 核心设计原则

### 1. 前后端类型边界清晰

前端类型 (Interface) 和后端类型 (Response) 各自独立，通过 Codec 层进行转换。

### 2. 函数式异步数据流：入口窄出口宽

```
入口窄：TaskEither<E, A> 是未执行的状态机
  │
  ▼
管道组合：chain / map / chainFirst
  │
  ▼
出口宽：fold 分流到 Left/Right 处理函数
  │
  ├── Left  → 错误处理 (toast, log)
  └── Right → 成功处理 (更新缓存, UI 副作用)
```

### 3. 读写分离

- **读取**：TanStack Query 包装 TaskEither（唯一允许解包的地方）
- **写入**：纯 TaskEither 管道，不使用 useMutation

## 迁移策略

### 分层替换顺序

```
1. 补充 Rust API        ──▶ 确保后端能力完整
2. 创建 Codec 层        ──▶ 类型转换边界
3. 创建 Repository 层   ──▶ 纯函数数据访问
4. 创建 Query Hooks     ──▶ 读取数据（TanStack Query）
5. 迁移 Actions         ──▶ 写入数据（TaskEither 管道）
6. 更新 Components      ──▶ UI 层适配
7. 清理旧代码           ──▶ 移除 Dexie
```

### 不需要数据迁移

用户确认不需要保留现有 IndexedDB 数据，可以从空数据库开始。

## 技术选型

| 领域 | 当前 | 目标 |
|------|------|------|
| 数据存储 | IndexedDB (Dexie) | SQLite (Rust) |
| 数据获取 | useLiveQuery | TanStack Query (读取) |
| 数据变更 | db/*.db.fn.ts | TaskEither 管道 (写入) |
| 实时更新 | Dexie 自动订阅 | Query Invalidation |
| 类型转换 | 无 | Codec 层 |

## 架构图

### 完整数据流架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              React Components                                │
│                          (使用 NodeInterface 等前端类型)                      │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         读取数据                                     │  │
│   │                                                                     │  │
│   │   useNodesByWorkspace(workspaceId)                                  │  │
│   │       │                                                             │  │
│   │       ▼                                                             │  │
│   │   TanStack Query (缓存层)                                           │  │
│   │       │                                                             │  │
│   │       ▼                                                             │  │
│   │   返回 { data: NodeInterface[], isLoading, error }                  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         写入数据                                     │  │
│   │                                                                     │  │
│   │   const handleCreate = () => {                                      │  │
│   │     pipe(                                                           │  │
│   │       nodeRepo.createNode(params),        // TaskEither             │  │
│   │       TE.chainFirstIOK(() => () =>        // 成功后更新缓存          │  │
│   │         queryClient.invalidateQueries(...)                          │  │
│   │       ),                                                            │  │
│   │       TE.fold(handleError, handleSuccess) // 两个出口               │  │
│   │     )();                                                            │  │
│   │   };                                                                │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────────┐   ┌───────────────────────────────────┐
│      Query Hooks (读取)            │   │         Actions (写入)             │
│                                   │   │                                   │
│  useNodesByWorkspace              │   │  createNode: TE<E, Node>          │
│  useWorkspaces                    │   │  deleteNode: TE<E, void>          │
│  useContent                       │   │  moveNode: TE<E, Node>            │
│                                   │   │                                   │
│  内部调用 repo.fn.ts              │   │  纯 TaskEither 管道                │
│  返回 TanStack Query 结果         │   │  不使用 useMutation                │
└───────────────────────────────────┘   └───────────────────────────────────┘
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Repository Layer                                │
│                         (纯函数，TaskEither 返回)                             │
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │ node.repo   │    │workspace.repo│    │content.repo │                    │
│   │   .fn.ts    │    │   .fn.ts    │    │   .fn.ts    │                    │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
│          │                  │                  │                            │
│          └──────────────────┼──────────────────┘                            │
│                             │                                               │
│                             ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    类型转换边界 (Codec)                               │  │
│   │                                                                     │  │
│   │  NodeInterface ◄──── decode ──── NodeResponse                       │  │
│   │  NodeInterface ────► encode ───► CreateNodeRequest                  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              rust-api.fn.ts                                  │
│                    返回 TaskEither<AppError, RustResponse>                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                              Tauri invoke → Rust Backend (SQLite)
```

### 异步管道时序图

```
用户点击「创建日记」
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        TaskEither 管道（未执行）                            │
│                                                                           │
│   createTemplatedFile(params)                                             │
│        │                                                                  │
│        ▼                                                                  │
│   ensureFolderPath ──chain──▶ createNode ──chain──▶ createContent        │
│        │                          │                      │                │
│        │                          │                      │                │
│   Left/Right               Left/Right              Left/Right            │
│        │                          │                      │                │
│        └──────────────────────────┼──────────────────────┘                │
│                                   │                                       │
│                          任何一步 Left                                     │
│                          整个管道短路                                       │
│                                   │                                       │
│                                   ▼                                       │
│                          chainFirstIOK (更新缓存)                          │
│                                   │                                       │
│                                   ▼                                       │
│                          chain (openFile)                                 │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼
    fold 分流
        │
        ├── Left ──▶ toast.error() + logger.error()
        │
        └── Right ──▶ toast.success() + setSelectedNodeId()
        │
        ▼
      ()  执行
```

## Query Key 设计

### Query Key 工厂

```typescript
// src/queries/query-keys.ts

export const queryKeys = {
  // Workspace
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
  },
  
  // Node
  nodes: {
    all: ['nodes'] as const,
    byWorkspace: (workspaceId: string) => ['nodes', 'workspace', workspaceId] as const,
    rootNodes: (workspaceId: string) => ['nodes', 'root', workspaceId] as const,
    detail: (id: string) => ['nodes', id] as const,
    children: (parentId: string) => ['nodes', 'children', parentId] as const,
    descendants: (nodeId: string) => ['nodes', 'descendants', nodeId] as const,
    byType: (workspaceId: string, type: string) => ['nodes', 'type', workspaceId, type] as const,
  },
  
  // Content
  contents: {
    byNode: (nodeId: string) => ['contents', 'node', nodeId] as const,
  },
} as const;
```

### Invalidation 策略

在 TaskEither 管道的 `chainFirstIOK` 中调用：

```typescript
// 创建节点后
TE.chainFirstIOK(node => () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.nodes.byWorkspace(workspaceId) });
  if (parentId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.nodes.children(parentId) });
  }
})

// 删除节点后
TE.chainFirstIOK(() => () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.nodes.byWorkspace(workspaceId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.contents.byNode(nodeId) });
})
```

## Codec 层设计

### 类型转换边界

```typescript
// src/types/codec/node.codec.ts
import type { NodeInterface } from '@/types/node';
import type { NodeResponse, CreateNodeRequest } from '@/types/rust-api';

/** 解码：Rust 类型 → 前端类型 */
export const decodeNode = (response: NodeResponse): NodeInterface => ({
  id: response.id,
  workspace: response.workspaceId,
  parent: response.parentId,
  title: response.title,
  type: response.nodeType,
  collapsed: response.isCollapsed,
  order: response.sortOrder,
  tags: response.tags ?? [],
  createdAt: response.createdAt,
  lastEdit: response.updatedAt,
});

/** 编码：前端类型 → Rust 请求类型 */
export const encodeCreateNode = (node: Partial<NodeInterface>): CreateNodeRequest => ({
  workspaceId: node.workspace!,
  parentId: node.parent ?? null,
  title: node.title!,
  nodeType: node.type!,
  tags: node.tags,
});

/** 批量解码 */
export const decodeNodes = (responses: NodeResponse[]): NodeInterface[] =>
  responses.map(decodeNode);
```

## Repository 层设计

### 纯函数 + TaskEither

```typescript
// src/repo/node.repo.fn.ts
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as rustApi from '@/db/rust-api.fn';
import { decodeNode, decodeNodes, encodeCreateNode } from '@/types/codec/node.codec';
import type { NodeInterface } from '@/types/node';
import type { AppError } from '@/lib/error.types';

/** 获取工作区所有节点 */
export const getNodesByWorkspace = (
  workspaceId: string
): TE.TaskEither<AppError, NodeInterface[]> =>
  pipe(
    rustApi.getNodesByWorkspace(workspaceId),
    TE.map(decodeNodes)
  );

/** 获取单个节点 */
export const getNode = (
  nodeId: string
): TE.TaskEither<AppError, NodeInterface | null> =>
  pipe(
    rustApi.getNode(nodeId),
    TE.map(response => response ? decodeNode(response) : null)
  );

/** 创建节点 */
export const createNode = (
  node: Partial<NodeInterface>
): TE.TaskEither<AppError, NodeInterface> =>
  pipe(
    TE.of(encodeCreateNode(node)),
    TE.chain(rustApi.createNode),
    TE.map(decodeNode)
  );
```

## Query Hooks 设计（读取）

### 读取 Hook：TanStack Query 包装 TaskEither

```typescript
// src/queries/node.queries.ts
import { useQuery } from '@tanstack/react-query';
import * as nodeRepo from '@/repo/node.repo.fn';
import { queryKeys } from './query-keys';

/** 
 * 读取 Hook：TanStack Query 包装 TaskEither
 * 
 * 这里是唯一允许「解包」TaskEither 的地方
 * 因为 TanStack Query 需要 Promise
 */
export const useNodesByWorkspace = (workspaceId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.nodes.byWorkspace(workspaceId ?? ''),
    queryFn: async (): Promise<NodeInterface[]> => {
      if (!workspaceId) return [];
      
      // 执行 TaskEither，解包结果
      const result = await nodeRepo.getNodesByWorkspace(workspaceId)();
      
      // 这是唯一的「出口」：Left 抛异常，Right 返回值
      if (result._tag === 'Left') throw result.left;
      return result.right;
    },
    enabled: !!workspaceId,
    staleTime: 30 * 1000, // 30 秒
  });
};

/** 获取单个节点 */
export const useNode = (nodeId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.nodes.detail(nodeId ?? ''),
    queryFn: async () => {
      if (!nodeId) return null;
      const result = await nodeRepo.getNode(nodeId)();
      if (result._tag === 'Left') throw result.left;
      return result.right;
    },
    enabled: !!nodeId,
  });
};
```

## Actions 设计（写入）

### 纯 TaskEither 管道

```typescript
// src/actions/node/create-node.action.ts
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as nodeRepo from '@/repo/node.repo.fn';
import { queryClient } from '@/main';
import { queryKeys } from '@/queries/query-keys';
import type { NodeInterface } from '@/types/node';
import type { AppError } from '@/lib/error.types';

interface CreateNodeParams {
  readonly workspaceId: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly type: NodeType;
}

/**
 * 创建节点 Action
 * 
 * 入口窄：返回 TaskEither（未执行的状态机）
 * 出口宽：调用方使用 fold 处理 Left/Right
 */
export const createNode = (
  params: CreateNodeParams
): TE.TaskEither<AppError, NodeInterface> =>
  pipe(
    // 1. 调用 repo 创建节点
    nodeRepo.createNode(params),
    
    // 2. 成功后，invalidate 缓存（IO 副作用）
    TE.chainFirstIOK(node => () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.nodes.byWorkspace(params.workspaceId) 
      });
      if (params.parentId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.nodes.children(params.parentId) 
        });
      }
    }),
    
    // 3. 成功后，记录日志（IO 副作用）
    TE.chainFirstIOK(node => () => {
      logger.success(`[Node] 创建成功: ${node.title}`);
    }),
  );
```

### 组件中使用：fold 分流

```typescript
// 组件中
const handleCreateNode = () => {
  pipe(
    createNode({
      workspaceId,
      parentId: selectedNodeId,
      title: 'New File',
      type: 'file',
    }),
    
    // 出口宽：两个分支
    TE.fold(
      // Left 分支：错误处理
      error => TE.fromIO(() => {
        toast.error(`创建失败: ${error.message}`);
        logger.error('[Node] 创建失败', error);
      }),
      
      // Right 分支：成功处理
      node => TE.fromIO(() => {
        toast.success('创建成功');
        setSelectedNodeId(node.id);
      }),
    ),
  )();  // ← 只在这里执行
};
```

### 完整的异步管道示例

```typescript
/**
 * 创建模板文件的完整管道
 * 
 * 入口窄：一个 TaskEither
 * 管道内：chain 组合多个异步步骤
 * 出口宽：fold 分流到错误/成功处理
 */
export const createTemplatedFile = (
  params: TemplatedFileParams
): TE.TaskEither<AppError, TemplatedFileResult> =>
  pipe(
    // Step 1: 确保文件夹存在
    ensureFolderPath({
      workspaceId: params.workspaceId,
      folderPath: params.folderPath,
    }),
    
    // Step 2: 创建节点（只有 Step 1 成功才执行）
    TE.chain(parentNode =>
      nodeRepo.createNode({
        workspaceId: params.workspaceId,
        parentId: parentNode.id,
        title: params.title,
        type: params.type,
      })
    ),
    
    // Step 3: 创建内容（只有 Step 2 成功才执行）
    TE.chain(node =>
      pipe(
        contentRepo.createContent({
          nodeId: node.id,
          content: params.content,
        }),
        TE.map(content => ({ node, content }))
      )
    ),
    
    // Step 4: 更新缓存（IO 副作用，不影响管道结果）
    TE.chainFirstIOK(result => () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.nodes.byWorkspace(params.workspaceId) 
      });
    }),
    
    // Step 5: 打开文件（只有前面都成功才执行）
    TE.chain(result =>
      pipe(
        openFile({ nodeId: result.node.id }),
        TE.map(() => result)
      )
    ),
  );
```

## 需要补充的 Rust API

### Node 相关

```rust
// commands/node_commands.rs

/// 获取根节点（parent_id 为 null）
#[tauri::command]
pub async fn get_root_nodes(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
) -> Result<Vec<NodeResponse>, String>;

/// 获取子节点
#[tauri::command]
pub async fn get_nodes_by_parent(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    parent_id: Option<String>,
) -> Result<Vec<NodeResponse>, String>;

/// 获取指定类型的节点
#[tauri::command]
pub async fn get_nodes_by_type(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    node_type: String,
) -> Result<Vec<NodeResponse>, String>;

/// 获取节点的所有后代
#[tauri::command]
pub async fn get_descendants(
    db: State<'_, DatabaseConnection>,
    node_id: String,
) -> Result<Vec<NodeResponse>, String>;

/// 获取下一个排序号
#[tauri::command]
pub async fn get_next_sort_order(
    db: State<'_, DatabaseConnection>,
    workspace_id: String,
    parent_id: Option<String>,
) -> Result<i32, String>;

/// 批量重排序节点
#[tauri::command]
pub async fn reorder_nodes(
    db: State<'_, DatabaseConnection>,
    node_ids: Vec<String>,
) -> Result<(), String>;

/// 批量删除节点
#[tauri::command]
pub async fn delete_nodes_batch(
    db: State<'_, DatabaseConnection>,
    node_ids: Vec<String>,
) -> Result<(), String>;
```

## 与 TanStack Query 的关系

| 场景 | 使用方式 |
|------|---------|
| **读取数据** | `useQuery` 包装 `repo.fn.ts`，内部解包 TaskEither |
| **写入数据** | 纯 `TaskEither` 管道，成功后 `invalidateQueries` |
| **缓存更新** | `chainFirstIOK` 中调用 `queryClient.invalidateQueries` |
| **乐观更新** | `chainFirstIOK` 中调用 `queryClient.setQueryData` |

### 为什么不用 useMutation？

`useMutation` 的问题：
1. 它期望 `mutationFn` 返回 Promise，需要解包 TaskEither
2. 它的 `onSuccess/onError` 回调破坏了管道的「出口宽」原则
3. 它增加了一层抽象，但没有带来足够的价值

直接使用 TaskEither 管道：
1. 保持「入口窄出口宽」
2. 类型安全，错误处理显式
3. 可组合，可测试

## 目录结构

```
src/
├── types/
│   ├── node/
│   │   ├── node.interface.ts      # 前端类型定义
│   │   ├── node.schema.ts         # Zod 校验
│   │   └── index.ts
│   ├── rust-api.ts                # Rust API 类型（后端类型）
│   └── codec/                     # 类型转换边界
│       ├── node.codec.ts
│       ├── workspace.codec.ts
│       ├── content.codec.ts
│       └── index.ts
│
├── db/
│   └── rust-api.fn.ts             # Tauri invoke 封装（返回 Rust 类型）
│
├── repo/                          # Repository 层（新增）
│   ├── node.repo.fn.ts            # 节点仓库（返回前端类型）
│   ├── workspace.repo.fn.ts
│   ├── content.repo.fn.ts
│   └── index.ts
│
├── queries/                       # TanStack Query hooks（读取）
│   ├── query-keys.ts
│   ├── node.queries.ts
│   ├── workspace.queries.ts
│   ├── content.queries.ts
│   └── index.ts
│
├── actions/                       # 业务操作（写入，TaskEither 管道）
│   └── ...
│
└── hooks/                         # 其他 React hooks
    └── ...
```

## 迁移检查清单

### 阶段 1: Rust API 补充
- [ ] 添加 get_root_nodes
- [ ] 添加 get_nodes_by_parent
- [ ] 添加 get_nodes_by_type
- [ ] 添加 get_descendants
- [ ] 添加 get_next_sort_order
- [ ] 添加 reorder_nodes
- [ ] 添加 delete_nodes_batch
- [ ] 更新 rust-api.fn.ts

### 阶段 2: Codec 层
- [ ] 创建 node.codec.ts
- [ ] 创建 workspace.codec.ts
- [ ] 创建 content.codec.ts

### 阶段 3: Repository 层
- [ ] 创建 node.repo.fn.ts
- [ ] 创建 workspace.repo.fn.ts
- [ ] 创建 content.repo.fn.ts

### 阶段 4: Query Hooks（读取）
- [ ] 创建 query-keys.ts
- [ ] 创建 workspace.queries.ts
- [ ] 创建 node.queries.ts
- [ ] 创建 content.queries.ts

### 阶段 5: Actions 迁移（写入）
- [ ] 迁移 node actions（使用 TaskEither 管道）
- [ ] 迁移 workspace actions
- [ ] 迁移 file actions
- [ ] 迁移 export actions
- [ ] 迁移 import actions
- [ ] 迁移 templated actions

### 阶段 6: Hooks 迁移
- [ ] 迁移 use-workspace.ts
- [ ] 迁移 use-node.ts
- [ ] 迁移 use-content.ts
- [ ] 迁移 use-drawing.ts
- [ ] 迁移 use-wiki.ts

### 阶段 7: 清理
- [ ] 移除 database.ts
- [ ] 移除 *.db.fn.ts 文件
- [ ] 移除 dexie 依赖
- [ ] 移除 dexie-react-hooks 依赖
- [ ] 更新测试文件
- [ ] 验证应用功能

## 风险和注意事项

### 1. 实时更新差异

**问题**: useLiveQuery 自动订阅数据库变化，TanStack Query 需要手动 invalidate。

**解决方案**: 
- 在所有写入操作的 `chainFirstIOK` 中 invalidate 相关 queries
- 考虑使用 Tauri 事件系统实现跨窗口同步

### 2. 性能考虑

**问题**: 频繁的 invalidation 可能导致不必要的重新获取。

**解决方案**:
- 合理设置 staleTime
- 使用 setQueryData 进行乐观更新
- 批量操作时合并 invalidation

### 3. 错误处理

**问题**: TaskEither 和 TanStack Query 的错误处理方式不同。

**解决方案**:
- 读取：在 queryFn 中解包 TaskEither，抛出 Left 值
- 写入：使用 fold 分流到 Left/Right 处理函数

### 4. 类型兼容性

**问题**: 现有组件使用 NodeInterface，Rust API 返回 NodeResponse。

**解决方案**:
- Codec 层负责类型转换
- Repository 层返回前端类型
- 组件无需修改


## 异步工作流补充设计

### 1. 并行操作：TE.sequenceArray 和 TE.traverseArray

当需要并行执行多个独立操作时：

```typescript
import * as A from 'fp-ts/Array';
import * as TE from 'fp-ts/TaskEither';

// 并行获取多个节点
const getMultipleNodes = (
  nodeIds: string[]
): TE.TaskEither<AppError, NodeInterface[]> =>
  pipe(
    nodeIds,
    A.traverse(TE.ApplicativePar)(nodeId => nodeRepo.getNode(nodeId)),
    TE.map(A.compact)  // 过滤 null
  );

// 并行删除多个节点
const deleteMultipleNodes = (
  nodeIds: string[]
): TE.TaskEither<AppError, void[]> =>
  pipe(
    nodeIds,
    A.traverse(TE.ApplicativePar)(nodeId => nodeRepo.deleteNode(nodeId)),
  );
```

### 2. 条件分支：TE.fromPredicate

```typescript
// 只有满足条件才继续
const createNodeIfNotExists = (
  params: CreateNodeParams
): TE.TaskEither<AppError, NodeInterface> =>
  pipe(
    nodeRepo.getNodeByTitle(params.workspaceId, params.title),
    TE.chain(existingNode =>
      existingNode
        ? TE.left(AppError.conflict('节点已存在'))
        : nodeRepo.createNode(params)
    ),
  );

// 使用 fromPredicate
const validateTitle = (title: string): TE.TaskEither<AppError, string> =>
  pipe(
    title,
    TE.fromPredicate(
      t => t.trim().length > 0,
      () => AppError.validation('标题不能为空')
    ),
  );
```

### 3. 资源清理：bracket 模式

```typescript
// 确保资源被正确清理（类似 try-finally）
const withTransaction = <A>(
  operation: TE.TaskEither<AppError, A>
): TE.TaskEither<AppError, A> =>
  pipe(
    // acquire: 开始事务
    TE.tryCatch(
      () => db.beginTransaction(),
      e => AppError.database('开始事务失败')
    ),
    // use: 执行操作
    TE.chain(() => operation),
    // release: 提交或回滚
    TE.chainFirst(result =>
      TE.tryCatch(
        () => db.commit(),
        e => AppError.database('提交事务失败')
      )
    ),
  );
```

### 4. 重试机制：retrying

```typescript
import { retrying } from 'fp-ts-contrib/ReaderTaskEither';

// 带重试的操作
const fetchWithRetry = (
  nodeId: string,
  maxRetries: number = 3
): TE.TaskEither<AppError, NodeInterface> => {
  let attempts = 0;
  
  const attempt = (): TE.TaskEither<AppError, NodeInterface> =>
    pipe(
      nodeRepo.getNode(nodeId),
      TE.orElse(error => {
        attempts++;
        if (attempts < maxRetries) {
          return pipe(
            TE.fromIO(() => logger.warn(`重试 ${attempts}/${maxRetries}`)),
            TE.chain(() => attempt())
          );
        }
        return TE.left(error);
      }),
    );
  
  return attempt();
};
```

### 5. 超时控制

```typescript
// 带超时的操作
const withTimeout = <E, A>(
  task: TE.TaskEither<E, A>,
  ms: number,
  timeoutError: E
): TE.TaskEither<E, A> =>
  () =>
    Promise.race([
      task(),
      new Promise<Either<E, A>>(resolve =>
        setTimeout(() => resolve(E.left(timeoutError)), ms)
      ),
    ]);

// 使用
const fetchNodeWithTimeout = (nodeId: string) =>
  withTimeout(
    nodeRepo.getNode(nodeId),
    5000,
    AppError.timeout('获取节点超时')
  );
```

### 6. 乐观更新模式

```typescript
const updateNodeOptimistic = (
  id: string,
  updates: Partial<NodeInterface>
): TE.TaskEither<AppError, NodeInterface> =>
  pipe(
    // 1. 先乐观更新缓存
    TE.fromIO(() => {
      queryClient.setQueryData(
        queryKeys.nodes.detail(id),
        (old: NodeInterface | undefined) => old ? { ...old, ...updates } : old
      );
    }),
    
    // 2. 执行实际更新
    TE.chain(() => nodeRepo.updateNode(id, updates)),
    
    // 3. 失败时回滚缓存
    TE.orElse(error =>
      pipe(
        TE.fromIO(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.nodes.detail(id) });
          logger.error('[Node] 更新失败，已回滚缓存', error);
        }),
        TE.chain(() => TE.left(error))
      )
    ),
  );
```

### 7. 批量操作优化

```typescript
// 批量操作时，合并 invalidation
const createMultipleNodes = (
  nodes: CreateNodeParams[]
): TE.TaskEither<AppError, NodeInterface[]> =>
  pipe(
    // 1. 并行创建所有节点
    nodes,
    A.traverse(TE.ApplicativeSeq)(nodeRepo.createNode),
    
    // 2. 只在最后 invalidate 一次（而不是每个节点都 invalidate）
    TE.chainFirstIOK(createdNodes => () => {
      const workspaceIds = [...new Set(createdNodes.map(n => n.workspace))];
      workspaceIds.forEach(wsId => {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.nodes.byWorkspace(wsId) 
        });
      });
    }),
  );
```

## 与现有异步工作流的对比

### 改进点

| 方面 | 现有方案 | 新方案 |
|------|---------|--------|
| 错误处理 | try-catch 或 .catch() | TaskEither + fold |
| 类型安全 | 运行时错误 | 编译时类型检查 |
| 可组合性 | 嵌套 Promise | pipe + chain |
| 可测试性 | 需要 mock | 纯函数可直接测试 |
| 副作用控制 | 分散在各处 | 集中在 chainFirstIOK |
| 并行/串行 | 手动控制 | ApplicativePar/ApplicativeSeq |
| 资源管理 | 手动 try-finally | bracket 模式 |

### 迁移后的优势

1. **类型安全的错误处理** - 编译器强制处理所有错误分支
2. **可组合的管道** - 复杂操作由简单操作组合而成
3. **延迟执行** - TaskEither 是未执行的状态机，可以组合后再执行
4. **副作用隔离** - IO 副作用通过 chainFirstIOK 显式标记
5. **统一的数据流** - 读取用 useQuery，写入用 TaskEither 管道


## 保存服务重构

### 现有问题

当前的 `UnifiedSaveService` 使用 async/await 模式，与创建流程的 TaskEither 风格不一致：

```typescript
// ❌ 现有保存服务（async/await）
const saveContent = async (content: string): Promise<boolean> => {
  if (content === lastSavedContent) return true;
  if (isSaving) return false;

  isSaving = true;
  onSaving?.();

  try {
    const result = await updateContentByNodeId(nodeId, content, contentType)();
    
    if (E.isRight(result)) {
      lastSavedContent = content;
      pendingContent = null;
      setTabDirty(tabId, false);
      onSaved?.();
      return true;
    } else {
      onError?.(new Error(result.left.message));
      return false;
    }
  } catch (err) {
    onError?.(err);
    return false;
  } finally {
    isSaving = false;
  }
};
```

**问题**：
- 使用 async/await 而不是 TaskEither 管道
- 手动解包 TaskEither (`await ...()`)
- try-catch 错误处理
- 副作用分散（onSaving, onSaved, onError, setTabDirty）
- 状态管理混乱（isSaving, lastSavedContent, pendingContent）

### 重构方案

将保存服务改为 TaskEither 管道，与创建流程保持一致：

```typescript
// ✅ 新的保存服务（TaskEither 管道）
const saveContent = (
  content: string
): TE.TaskEither<AppError, SaveResult> =>
  pipe(
    // 1. 检查是否需要保存
    TE.fromPredicate(
      () => content !== lastSavedContent,
      (): AppError => ({ type: 'SKIP', message: '内容未变化' })
    )(content),

    // 2. 通知开始保存（IO 副作用）
    TE.chainFirstIOK(() => () => onSaving?.()),

    // 3. 执行数据库保存
    TE.chain(() => 
      contentRepo.updateContentByNodeId(nodeId, content, contentType)
    ),

    // 4. 成功后更新内部状态（IO 副作用）
    TE.chainFirstIOK(() => () => {
      lastSavedContent = content;
      pendingContent = null;
    }),

    // 5. 成功后更新 Tab 状态（IO 副作用）
    TE.chainFirstIOK(() => () => {
      if (tabId && setTabDirty) {
        setTabDirty(tabId, false);
      }
    }),

    // 6. 成功后通知（IO 副作用）
    TE.chainFirstIOK(() => () => onSaved?.()),

    // 7. 返回保存结果
    TE.map(() => ({ success: true, nodeId })),
  );
```

### 创建 vs 保存流程对比

| 方面 | 创建流程 | 保存流程（重构后） |
|------|---------|------------------|
| 异步模式 | TaskEither ✅ | TaskEither ✅ |
| 错误处理 | fold 分流 ✅ | fold 分流 ✅ |
| 副作用 | chainFirstIOK ✅ | chainFirstIOK ✅ |
| 返回类型 | TaskEither | TaskEither |
| 触发方式 | 用户点击 | 内容变化 + 防抖 |

### 迁移后的保存服务接口

```typescript
interface SaveServiceInterface {
  /** 更新内容（触发防抖自动保存） */
  updateContent: (content: string) => void;
  
  /** 立即保存 - 返回 TaskEither */
  saveNow: () => TE.TaskEither<AppError, SaveResult>;
  
  /** 设置初始内容（不触发保存） */
  setInitialContent: (content: string) => void;
  
  /** 清理资源 */
  dispose: () => void;
  
  /** 是否有未保存的更改 */
  hasUnsavedChanges: () => boolean;
}
```

### 组件中使用

```typescript
// 手动保存（Ctrl+S）
const handleManualSave = () => {
  pipe(
    saveService.saveNow(),
    TE.fold(
      error => TE.fromIO(() => toast.error(`保存失败: ${error.message}`)),
      result => TE.fromIO(() => {
        if (!result.skipped) {
          toast.success('保存成功');
        }
      }),
    ),
  )();
};
```
