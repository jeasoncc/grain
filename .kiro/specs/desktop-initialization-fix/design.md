# Design Document

## 概述

本设计文档描述如何修复 Desktop 应用的初始化问题，包括：
1. TanStack Query DevTools 安装
2. 删除数据事务保证
3. 初始化状态持久化
4. 防止工作区重复创建
5. 首次使用默认数据创建
6. 删除后清除前端状态

---

## 设计方案

### 1. TanStack Query DevTools 安装

**当前状态**：`@tanstack/react-query` 被使用但未显式声明依赖。

**解决方案**：
```bash
bun add @tanstack/react-query
bun add -D @tanstack/react-query-devtools
```

**修改文件**：
- `apps/desktop/package.json` - 添加依赖
- `apps/desktop/src/main.tsx` - 添加 DevTools 组件

**DevTools 集成**：
```tsx
// main.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 在 QueryClientProvider 内部添加
<QueryClientProvider client={queryClient}>
  <App />
  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider>
```

---

### 2. 删除数据事务保证

**当前状态**：Rust 后端已实现事务删除，但需要验证前端调用链是否正确。

**调用链分析**：
```
handleDeleteAllData()
  → clearAllData()()                    // @/db/index.ts
  → clearAllData() from repo            // @/repo/clear-data.repo.fn.ts
  → api.clearSqliteData()               // @/db/api-client.fn.ts
  → invoke("clear_sqlite_data")         // Tauri IPC
  → clear_sqlite_data() command         // Rust Tauri command
  → clear_all_data() with transaction   // Rust DB function
```

**问题排查**：
1. 检查 `@/db/index.ts` 是否正确导出 `clearAllData`
2. 验证 Tauri invoke 是否被正确调用
3. 确认事务是否正确提交

**修改文件**：
- `apps/desktop/src/db/index.ts` - 确保正确导出
- `apps/desktop/src/db/clear-data.db.fn.ts` - 添加日志和错误处理

---

### 3. 初始化状态持久化

**当前状态**：使用组件级 `useRef`，组件重新挂载时重置。

**解决方案**：使用 localStorage 持久化初始化状态。

**新增文件**：`apps/desktop/src/lib/initialization-state.ts`

```typescript
/**
 * 初始化状态管理
 * 
 * 使用 localStorage 持久化，区分：
 * - 首次使用（从未初始化）
 * - 已初始化（有数据）
 * - 数据已删除（需要重新初始化）
 */

const INIT_STATE_KEY = 'grain:initialization-state';

export type InitializationState = 
  | 'uninitialized'  // 首次使用
  | 'initialized'    // 已初始化
  | 'data-deleted';  // 数据已删除，等待重新初始化

export const getInitializationState = (): InitializationState => {
  const state = localStorage.getItem(INIT_STATE_KEY);
  if (state === 'initialized' || state === 'data-deleted') {
    return state;
  }
  return 'uninitialized';
};

export const setInitializationState = (state: InitializationState): void => {
  localStorage.setItem(INIT_STATE_KEY, state);
};

export const resetInitializationState = (): void => {
  localStorage.setItem(INIT_STATE_KEY, 'data-deleted');
};
```

---

### 4. 防止工作区重复创建

**当前状态**：
- `hasInitializedRef` 是组件级 ref
- Query 数据加载中时返回 `undefined`，可能触发重复创建

**解决方案**：

1. 使用 localStorage 持久化初始化状态
2. 等待 Query 数据加载完成后再做决策
3. 使用原子操作防止竞态条件

**修改文件**：`apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`

```typescript
// 修改初始化逻辑
useEffect(() => {
  const initializeWorkspace = async () => {
    // 1. 等待数据加载完成
    if (workspacesRaw === undefined) return;
    
    // 2. 检查持久化的初始化状态
    const initState = getInitializationState();
    if (initState === 'initialized') {
      // 已初始化，只需选择工作区
      selectValidWorkspace();
      return;
    }
    
    // 3. 首次使用或数据已删除，需要创建默认数据
    if (workspaces.length === 0) {
      await createDefaultWorkspace();
      setInitializationState('initialized');
    } else {
      // 有数据但状态未标记，更新状态
      setInitializationState('initialized');
      selectValidWorkspace();
    }
  };
  
  initializeWorkspace();
}, [workspacesRaw]);
```

---

### 5. 首次使用默认数据创建

**需求**：
- 创建默认用户，使用随机友好名称（如 "Clever Melon"）
- 创建默认工作区，名称为 "{username}'s Workspace"

**新增文件**：`apps/desktop/src/fn/user/random-name.fn.ts`

```typescript
/**
 * 生成随机友好名称
 * 
 * 格式：形容词 + 名词
 * 例如：Clever Melon, Happy Panda, Swift Eagle
 */

const ADJECTIVES = [
  'Clever', 'Happy', 'Swift', 'Bright', 'Calm',
  'Gentle', 'Bold', 'Wise', 'Kind', 'Brave',
  'Merry', 'Noble', 'Quick', 'Warm', 'Cool',
];

const NOUNS = [
  'Melon', 'Panda', 'Eagle', 'Tiger', 'Dolphin',
  'Phoenix', 'Dragon', 'Falcon', 'Wolf', 'Bear',
  'Fox', 'Owl', 'Hawk', 'Lion', 'Deer',
];

export const generateRandomName = (): string => {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
};
```

**修改文件**：`apps/desktop/src/db/init.db.fn.ts`

```typescript
import { generateRandomName } from '@/fn/user/random-name.fn';

export const initDatabase = async (): Promise<void> => {
  // 检查是否有用户
  const users = await api.getUsers()();
  
  if (E.isRight(users) && users.right.length === 0) {
    // 生成随机友好名称
    const username = generateRandomName();
    
    // 创建默认用户
    await api.createUser({
      username,
      displayName: username,
    })();
    
    logger.info(`[Init] 创建默认用户: ${username}`);
  }
};
```

**修改文件**：`apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`

```typescript
// 创建默认工作区时使用用户名
const createDefaultWorkspace = async () => {
  // 获取当前用户
  const userResult = await api.getCurrentUser()();
  const username = E.isRight(userResult) && userResult.right 
    ? userResult.right.displayName || userResult.right.username
    : 'User';
  
  // 创建工作区
  const result = await createWorkspace({
    title: `${username}'s Workspace`,
    author: username,
    description: '',
    language: 'en',
  })();
  
  if (E.isRight(result)) {
    setSelectedWorkspaceId(result.right.id);
    setActivePanel('files');
  }
};
```

---

### 6. 删除后清除前端状态（架构重构）

**当前问题**：
- `handleDeleteAllData` 直接调用 Repo 层的 `clearAllData()`
- 业务逻辑（重置状态、清除缓存）散落在组件中
- 违反了正确的数据流架构

**正确的架构**：
```
Component → Hook (useMutation) → Action (业务逻辑) → Repo → API
```

**解决方案**：

#### 6.1 创建 deleteAllData Action

**新增文件**：`apps/desktop/src/actions/data/delete-all-data.action.ts`

```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as IO from 'fp-ts/IO';
import type { QueryClient } from '@tanstack/react-query';
import { clearAllData } from '@/repo/clear-data.repo.fn';
import { resetInitializationState } from '@/lib/initialization-state';
import type { AppError } from '@/lib/error.types';
import { logger } from '@/lib/logger';

interface DeleteAllDataDeps {
  readonly queryClient: QueryClient;
  readonly resetStores: () => void;
}

interface DeleteAllDataResult {
  readonly success: boolean;
  readonly deletedTables: string[];
}

/**
 * 删除所有数据 Action
 * 
 * 职责：
 * 1. 调用 Repo 删除 SQLite 数据
 * 2. 清除 TanStack Query 缓存
 * 3. 重置 Zustand stores
 * 4. 重置初始化状态
 * 5. 清除 localStorage（保留必要设置）
 */
export const deleteAllData = (
  deps: DeleteAllDataDeps
): TE.TaskEither<AppError, DeleteAllDataResult> =>
  pipe(
    // 1. 调用 Repo 删除 SQLite 数据
    clearAllData(),
    
    // 2. 成功后清除 Query 缓存（IO 副作用）
    TE.chainFirstIOK(() => () => {
      deps.queryClient.clear();
      logger.info('[DeleteAllData] Query 缓存已清除');
    }),
    
    // 3. 重置 Zustand stores（IO 副作用）
    TE.chainFirstIOK(() => () => {
      deps.resetStores();
      logger.info('[DeleteAllData] Stores 已重置');
    }),
    
    // 4. 重置初始化状态（IO 副作用）
    TE.chainFirstIOK(() => () => {
      resetInitializationState();
      logger.info('[DeleteAllData] 初始化状态已重置');
    }),
    
    // 5. 清除 localStorage（IO 副作用）
    TE.chainFirstIOK(() => () => {
      const keysToKeep = ['grain:theme', 'grain:language', 'grain:editor-settings'];
      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        if (!keysToKeep.includes(key) && key.startsWith('grain:')) {
          localStorage.removeItem(key);
        }
      }
      logger.info('[DeleteAllData] localStorage 已清理');
    }),
    
    // 6. 返回结果
    TE.map((result) => ({
      success: true,
      deletedTables: result.deletedTables || ['users', 'workspaces', 'nodes', 'contents', 'tags', 'attachments'],
    })),
  );
```

#### 6.2 创建 useDeleteAllData Hook

**新增文件**：`apps/desktop/src/hooks/use-delete-all-data.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAllData } from '@/actions/data/delete-all-data.action';
import { useSelectionStore } from '@/stores/selection.store';
import { useEditorTabsStore } from '@/stores/editor-tabs.store';
import * as E from 'fp-ts/Either';

/**
 * 删除所有数据 Hook
 * 
 * 使用 useMutation 包装 Action，提供：
 * - mutate / mutateAsync: 触发删除
 * - isPending: 是否正在删除
 * - isError: 是否出错
 * - error: 错误信息
 */
export const useDeleteAllData = () => {
  const queryClient = useQueryClient();
  const resetSelectionStore = useSelectionStore((s) => s.reset);
  const resetEditorTabsStore = useEditorTabsStore((s) => s.reset);
  
  const resetStores = () => {
    resetSelectionStore();
    resetEditorTabsStore();
    // 添加其他需要重置的 stores
  };
  
  return useMutation({
    mutationFn: async () => {
      const result = await deleteAllData({ queryClient, resetStores })();
      
      if (E.isLeft(result)) {
        throw new Error(result.left.message);
      }
      
      return result.right;
    },
    onSuccess: () => {
      // 刷新页面
      setTimeout(() => window.location.reload(), 1000);
    },
  });
};
```

#### 6.3 组件中使用 Hook

**修改文件**：`apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`

```typescript
import { useDeleteAllData } from '@/hooks/use-delete-all-data';

// 在组件中
const { mutate: deleteAllData, isPending: isDeleting } = useDeleteAllData();

const handleDeleteAllData = useCallback(async () => {
  const ok = await confirm({
    title: 'Delete all data?',
    description: 'This action cannot be undone. All workspaces, files, and data will be deleted.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
  });
  
  if (!ok) return;
  
  deleteAllData(undefined, {
    onSuccess: () => {
      toast.success('All data deleted');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}, [confirm, deleteAllData]);
```

**架构对比**：

| 方面 | 重构前 | 重构后 |
|------|--------|--------|
| 调用链 | Component → Repo | Component → Hook → Action → Repo |
| 业务逻辑位置 | 散落在组件中 | 集中在 Action 中 |
| 状态管理 | 手动调用多个 setter | Action 统一处理 |
| 可测试性 | 难以测试 | Action 可独立测试 |
| 复用性 | 无法复用 | Action 可被多处调用 |

---

## 数据流图

### 删除数据流程（修复后）

```
用户点击"删除所有数据"
    │
    ▼
confirm() 确认对话框
    │
    ▼
clearAllData()()
    │
    ├── invoke("clear_sqlite_data")
    │   │
    │   └── Rust: clear_all_data()
    │       │
    │       ├── BEGIN TRANSACTION
    │       ├── DELETE FROM contents
    │       ├── DELETE FROM attachments
    │       ├── DELETE FROM nodes
    │       ├── DELETE FROM tags
    │       ├── DELETE FROM workspaces
    │       ├── DELETE FROM users
    │       └── COMMIT
    │
    ├── clearLogs() (IndexedDB)
    │
    └── 返回 ClearDataResult
        │
        ▼
检查结果
    │
    ├── Left (失败) → toast.error()
    │
    └── Right (成功)
        │
        ├── queryClient.clear()
        ├── 重置 Zustand stores
        ├── resetInitializationState()
        ├── 清除 localStorage
        ├── toast.success()
        └── window.location.reload()
```

### 初始化流程（修复后）

```
应用启动
    │
    ▼
main.tsx
    │
    ├── initDatabase()
    │   │
    │   └── 检查用户
    │       │
    │       ├── 有用户 → 跳过
    │       │
    │       └── 无用户 → 创建默认用户（随机友好名称）
    │
    └── ReactDOM.render()
        │
        ▼
ActivityBarContainer 挂载
    │
    ├── useAllWorkspaces() → 等待数据加载
    │
    └── useEffect (初始化逻辑)
        │
        ├── workspacesRaw === undefined → 等待
        │
        └── workspacesRaw 已加载
            │
            ├── getInitializationState()
            │   │
            │   ├── 'initialized' → 选择有效工作区
            │   │
            │   └── 'uninitialized' 或 'data-deleted'
            │       │
            │       ├── workspaces.length > 0
            │       │   │
            │       │   └── setInitializationState('initialized')
            │       │       选择有效工作区
            │       │
            │       └── workspaces.length === 0
            │           │
            │           ├── 获取当前用户名
            │           ├── 创建 "{username}'s Workspace"
            │           └── setInitializationState('initialized')
```

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/desktop/package.json` | 修改 | 添加 TanStack Query 依赖 |
| `apps/desktop/src/main.tsx` | 修改 | 添加 DevTools 组件 |
| `apps/desktop/src/lib/initialization-state.ts` | 新增 | 初始化状态管理 |
| `apps/desktop/src/fn/user/random-name.fn.ts` | 新增 | 随机友好名称生成 |
| `apps/desktop/src/fn/user/random-name.fn.test.ts` | 新增 | 随机名称单元测试 |
| `apps/desktop/src/fn/user/index.ts` | 新增 | 导出 |
| `apps/desktop/src/actions/data/delete-all-data.action.ts` | 新增 | 删除数据 Action |
| `apps/desktop/src/actions/data/index.ts` | 新增 | 导出 |
| `apps/desktop/src/hooks/use-delete-all-data.ts` | 新增 | 删除数据 Hook |
| `apps/desktop/src/db/init.db.fn.ts` | 修改 | 使用随机名称创建用户 |
| `apps/desktop/src/db/index.ts` | 检查 | 确保正确导出 clearAllData |
| `apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx` | 修改 | 重构初始化和删除逻辑 |
| `apps/desktop/src/stores/selection.store.ts` | 修改 | 添加 reset 方法 |
| `apps/desktop/src/stores/editor-tabs.store.ts` | 修改 | 添加 reset 方法 |

---

## 测试计划

### 单元测试

1. `random-name.fn.test.ts` - 测试随机名称生成
2. `initialization-state.test.ts` - 测试状态持久化

### 集成测试

1. 首次启动 - 验证创建默认用户和工作区
2. 删除数据 - 验证 SQLite 数据被清除
3. 删除后刷新 - 验证重新创建默认数据
4. 多次刷新 - 验证不会重复创建工作区

### 手动测试

1. 使用 SQLite MCP 验证数据库状态
2. 检查 localStorage 状态
3. 检查 DevTools 是否正常显示
