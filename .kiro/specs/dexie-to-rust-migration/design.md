# Design Document

## Overview

本设计文档描述将前端数据访问层从 Dexie (IndexedDB) 迁移到 Rust 后端 (SQLite) 的技术方案。

## Architecture

### 当前架构（问题）

```
┌─────────────────────────────────────────────────────────────────┐
│                         Components                               │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────┐
        │   @/db (Dexie)    │       │  @/repo (Rust)    │
        │   IndexedDB       │       │  SQLite           │
        └───────────────────┘       └───────────────────┘
                    ↑                           ↑
                    └───────── 数据不一致 ────────┘
```

**问题**：两套数据源并存，导致外键约束失败和数据不一致。

### 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Components                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │     @/hooks       │
                    │   (React 绑定)    │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │    @/actions      │
                    │   (业务操作)      │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │     @/repo        │
                    │  (Repository)     │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  @/db/rust-api    │
                    │  (Tauri IPC)      │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Rust Backend    │
                    │     SQLite        │
                    └───────────────────┘
```

## Components

### Component 1: Repository Layer (`@/repo`)

**Purpose**: 封装 Rust API 调用，提供类型安全的数据访问接口

**Interface**:
```typescript
// workspace.repo.fn.ts
export const createWorkspace: (input: WorkspaceCreateInput) => TE.TaskEither<AppError, WorkspaceInterface>
export const updateWorkspace: (id: string, input: WorkspaceUpdateInput) => TE.TaskEither<AppError, void>
export const getWorkspaceById: (id: string) => TE.TaskEither<AppError, WorkspaceInterface>
export const getAllWorkspaces: () => TE.TaskEither<AppError, WorkspaceInterface[]>
export const deleteWorkspace: (id: string) => TE.TaskEither<AppError, void>

// node.repo.fn.ts
export const createNode: (input: NodeCreateInput) => TE.TaskEither<AppError, NodeInterface>
export const updateNode: (id: string, input: NodeUpdateInput) => TE.TaskEither<AppError, void>
export const getNodeById: (id: string) => TE.TaskEither<AppError, NodeInterface>
export const getNodesByWorkspace: (workspaceId: string) => TE.TaskEither<AppError, NodeInterface[]>
export const deleteNode: (id: string) => TE.TaskEither<AppError, void>

// content.repo.fn.ts
export const createContent: (input: ContentCreateInput) => TE.TaskEither<AppError, ContentInterface>
export const updateContent: (nodeId: string, content: string) => TE.TaskEither<AppError, void>
export const getContentByNodeId: (nodeId: string) => TE.TaskEither<AppError, ContentInterface>
```

**Behavior**:
- 所有函数返回 `TaskEither<AppError, T>`
- 使用 `@/db/rust-api.fn` 调用 Tauri IPC
- 处理错误转换和日志记录

### Component 2: Action Layer (`@/actions`)

**Purpose**: 封装业务逻辑，组合多个 Repository 操作

**Interface**:
```typescript
// workspace actions
export const createWorkspace: (params: CreateWorkspaceParams) => TE.TaskEither<AppError, WorkspaceInterface>
export const updateWorkspace: (params: UpdateWorkspaceParams) => TE.TaskEither<AppError, void>
export const touchWorkspace: (workspaceId: string) => TE.TaskEither<AppError, void>

// node actions
export const createNode: (params: CreateNodeParams) => TE.TaskEither<AppError, NodeInterface>
export const deleteNode: (params: DeleteNodeParams) => TE.TaskEither<AppError, void>
export const moveNode: (params: MoveNodeParams) => TE.TaskEither<AppError, void>
```

**Behavior**:
- 组合多个 Repository 调用
- 处理业务规则验证
- 使用 `pipe` 和 `TE.chain` 组合操作

### Component 3: Hooks Layer (`@/hooks`)

**Purpose**: 提供 React 组件的数据绑定

**Interface**:
```typescript
// use-workspace.ts
export const useAllWorkspaces: () => WorkspaceInterface[] | undefined
export const useWorkspaceById: (id: string) => WorkspaceInterface | undefined

// use-node.ts
export const useNodesByWorkspace: (workspaceId: string | null) => NodeInterface[]
export const useNodeById: (id: string) => NodeInterface | undefined
```

**Behavior**:
- 使用 TanStack Query 进行数据缓存和同步
- 自动处理加载状态和错误状态
- 提供乐观更新支持

## Data Models

### WorkspaceInterface

```typescript
interface WorkspaceInterface {
  readonly id: string;
  readonly title: string;
  readonly author?: string;
  readonly description?: string;
  readonly publisher?: string;
  readonly language?: string;
  readonly members?: string[];
  readonly owner?: string;
  readonly createDate: string;
  readonly updateDate: string;
  readonly lastOpen?: string;
}
```

### NodeInterface

```typescript
interface NodeInterface {
  readonly id: string;
  readonly workspaceId: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly type: NodeType;
  readonly order: number;
  readonly collapsed: boolean;
  readonly tags: string[];
  readonly createDate: string;
  readonly updateDate: string;
}
```

### ContentInterface

```typescript
interface ContentInterface {
  readonly id: string;
  readonly nodeId: string;
  readonly content: string;
  readonly createDate: string;
  readonly updateDate: string;
}
```

## Migration Strategy

### Phase 1: 已完成的迁移

| 文件 | 状态 | 说明 |
|------|------|------|
| `activity-bar.container.fn.tsx` | ✅ 已迁移 | workspace 创建和更新 |
| `update-workspace.action.ts` | ✅ 已创建 | touchWorkspace 函数 |
| `create-workspace.action.ts` | ✅ 已创建 | createWorkspace 函数 |

### Phase 2: 待迁移的文件

#### 高优先级（直接使用 @/db 的组件）

| 文件 | 当前使用 | 迁移目标 |
|------|----------|----------|
| `wiki-hover-preview-connected.tsx` | `getContentByNodeId`, `getNodeById` | `@/repo` |
| `diagram-editor.container.fn.tsx` | `getContentByNodeId` | `@/repo` |
| `file-tree-panel.container.fn.tsx` | `getNodeById`, `setNodeCollapsed` | `@/repo` |
| `code-editor.container.fn.tsx` | `getContentByNodeId` | `@/repo` |

#### 中优先级（fn 层使用 @/db）

| 文件 | 当前使用 | 迁移目标 |
|------|----------|----------|
| `wiki.resolve.fn.ts` | `getContentsByNodeIds`, `getNodesByWorkspace` | `@/repo` |
| `save.document.fn.ts` | `updateContentByNodeId`, `updateNode` | `@/repo` |
| `unified-save.service.ts` | `updateContentByNodeId` | `@/repo` |
| `search.engine.fn.ts` | `getNodesByWorkspace`, `getWorkspaceById` | `@/repo` |

#### 低优先级（actions 层使用 @/db）

| 文件 | 当前使用 | 迁移目标 |
|------|----------|----------|
| `export-*.action.ts` | 多个 @/db 函数 | `@/repo` |
| `import-*.action.ts` | 多个 @/db 函数 | `@/repo` |
| `migrate-wiki.action.ts` | 多个 @/db 函数 | `@/repo` |

### Phase 3: 保留的 Dexie 使用

以下场景暂时保留 Dexie：

| 文件 | 原因 |
|------|------|
| `use-tag.ts` | Tag 功能尚未迁移到 Rust |
| `use-user.ts` | User 功能尚未迁移到 Rust |
| `use-attachment.ts` | Attachment 功能尚未迁移到 Rust |
| `log-db.ts` | 日志存储，可保留在前端 |

## Error Handling

### 错误类型

```typescript
type AppError = 
  | { type: "DB_ERROR"; message: string }
  | { type: "VALIDATION_ERROR"; message: string }
  | { type: "NOT_FOUND"; message: string }
  | { type: "NETWORK_ERROR"; message: string };
```

### 错误处理模式

```typescript
// 使用 TaskEither 处理错误
const result = await pipe(
  createWorkspace(params),
  TE.fold(
    (error) => {
      logger.error("[Action] 创建失败:", error);
      toast.error("创建失败");
      return TE.of(undefined);
    },
    (workspace) => {
      logger.success("[Action] 创建成功:", workspace.id);
      toast.success("创建成功");
      return TE.of(workspace);
    }
  )
)();
```

## Code Standards Compliance

### 已修改文件审核清单

#### `activity-bar.container.fn.tsx`

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 使用 `@/actions` 而非 `@/db` | ✅ | workspace 操作已迁移 |
| 使用 TaskEither | ✅ | 模板创建使用 TE |
| 使用 fp-ts pipe | ✅ | handleCreateTemplate 使用 pipe |
| 中文注释 | ⚠️ | 部分注释为英文 |
| 使用 logger | ⚠️ | 仍有 console.error |
| 移除未使用 import | ❌ | NodeInterface 未使用 |

#### `update-workspace.action.ts`

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 使用 TaskEither | ✅ | 完全符合 |
| 使用 fp-ts pipe | ✅ | 完全符合 |
| 中文注释 | ✅ | 完全符合 |
| 使用 logger | ✅ | 完全符合 |

#### `create-workspace.action.ts`

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 使用 TaskEither | ✅ | 完全符合 |
| 使用 fp-ts pipe | ✅ | 完全符合 |
| 中文注释 | ✅ | 完全符合 |
| 使用 logger | ✅ | 完全符合 |

## Dependencies

### 新增依赖

无需新增依赖，使用现有的：
- `fp-ts` - 函数式编程
- `@tanstack/react-query` - 数据缓存

### 移除依赖（最终目标）

- `dexie` - 当所有功能迁移完成后
- `dexie-react-hooks` - 当所有 hooks 迁移完成后

## Testing Strategy

### 单元测试

- Repository 层：Mock Rust API
- Action 层：Mock Repository
- Hooks 层：使用 React Testing Library

### 集成测试

- 端到端测试：验证数据流完整性
- 外键约束测试：确保数据一致性
