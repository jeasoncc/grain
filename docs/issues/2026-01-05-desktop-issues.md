# Desktop 应用问题追踪

> 创建日期: 2026-01-05
> 状态: 待修复

## 问题概览

| # | 问题 | 优先级 | 状态 |
|---|------|--------|------|
| 1 | TanStack Query DevTools 未安装 | 中 | 待修复 |
| 2 | 删除数据后 SQLite 数据"仍存在" | 高 | 待修复 |
| 3 | 每次进项目看到多个工作空间 | 高 | 待修复 |

---

## 问题 1: TanStack Query DevTools 未安装

### 现象
- 无法使用 TanStack Query DevTools 调试查询状态
- `@tanstack/react-query` 未显式声明在 `package.json` 中

### 分析

**已安装的 TanStack 包：**
- ✅ `@tanstack/react-router`
- ✅ `@tanstack/react-router-devtools`
- ✅ `@tanstack/react-form`
- ✅ `@tanstack/react-virtual`
- ✅ `@tanstack/router-plugin`

**缺失的包：**
- ❌ `@tanstack/react-query`
- ❌ `@tanstack/react-query-devtools`

**代码引用：**
```typescript
// apps/desktop/src/main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
```

### 根本原因
`@tanstack/react-query` 可能作为其他包的间接依赖被安装，但未显式声明，导致：
1. 版本不可控
2. DevTools 无法使用
3. 类型提示可能不完整

### 修复方案
```bash
cd apps/desktop
bun add @tanstack/react-query @tanstack/react-query-devtools
```

然后在 `main.tsx` 中添加 DevTools：
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 在 render 中添加
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

---

## 问题 2: 删除数据后 SQLite 数据"仍存在"

### 现象
用户点击 ActivityBar 的"删除所有数据"按钮后，刷新页面仍能看到工作区。

### 分析

**调用链：**
```
handleDeleteAllData()
  → clearAllData() from @/db
    → clearAllData() from @/repo/clear-data.repo.fn.ts
      → api.clearSqliteData()
        → Rust: clear_sqlite_data command
          → clear_data_db_fn::clear_all_data()
```

**Rust 后端实现正确：**
```rust
// packages/rust-core/src/db/clear_data_db_fn.rs
pub async fn clear_all_data(db: &DatabaseConnection, options: ClearDataOptions) -> AppResult<ClearDataResult> {
    // 按外键依赖顺序删除：内容 → 附件 → 节点 → 标签 → 工作区 → 用户
    // 使用事务确保原子性
}
```

**问题出在前端初始化逻辑：**

```typescript
// apps/desktop/src/main.tsx
async function main() {
  await database.open();
  await initDatabase();  // ← 检测无用户时创建默认用户
  // ...
}

// apps/desktop/src/db/init.db.fn.ts
export const initDatabase = () => pipe(
  // ...
  TE.chain(({ hasExistingUsers }) => {
    if (!hasExistingUsers) {
      return createDefaultUser(config);  // ← 自动创建用户
    }
    return TE.right(undefined);
  }),
);

// apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx
useEffect(() => {
  const initializeWorkspace = async () => {
    // ...
    if (workspaces.length === 0) {
      // ← 自动创建默认工作区！
      const result = await createWorkspace({
        title: "My Workspace",
        // ...
      })();
    }
  };
}, [workspacesRaw]);
```

### 根本原因
数据确实被删除了，但页面刷新后：
1. `initDatabase()` 检测到没有用户 → 创建默认用户
2. `ActivityBarContainer` 检测到没有工作区 → 创建默认工作区
3. 用户看到新创建的工作区，误以为数据没有被删除

### 修复方案

**方案 A：删除后不自动创建**
- 删除数据后跳转到"欢迎页面"或"创建工作区"页面
- 不自动创建默认工作区

**方案 B：区分"首次使用"和"删除后"**
- 使用 localStorage 标记是否为首次使用
- 删除数据时设置标记，阻止自动创建

**方案 C：删除后清除 Query 缓存**
```typescript
const handleDeleteAllData = useCallback(async () => {
  // ...
  await clearAllData()();
  queryClient.clear();  // ← 清除所有缓存
  // ...
}, []);
```

---

## 问题 3: 每次进项目看到多个工作空间

### 现象
用户每次打开项目都会看到多个工作空间，数量不断增加。

### 分析

**初始化逻辑的 ref 问题：**
```typescript
// apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx
const hasInitializedRef = useRef(false);

useEffect(() => {
  const initializeWorkspace = async () => {
    if (workspacesRaw === undefined) return;
    if (hasInitializedRef.current) return;  // ← 组件重新挂载时重置
    hasInitializedRef.current = true;

    if (workspaces.length === 0) {
      await createWorkspace({ title: "My Workspace" })();  // ← 创建工作区
    }
  };
}, [workspacesRaw]);
```

**问题场景：**
1. `hasInitializedRef` 是组件级别的 ref
2. 组件重新挂载时（路由切换、热更新）ref 重置为 `false`
3. 如果此时 `workspaces.length === 0`（Query 缓存过期或未加载完成），会再次创建工作区

**TanStack Query 缓存问题：**
```typescript
// apps/desktop/src/queries/workspace.queries.ts
export const useWorkspaces = () => {
  return useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: async () => { /* ... */ },
    staleTime: 30 * 1000,  // 30秒后过期
  });
};
```

**删除数据后没有清除缓存：**
```typescript
const handleDeleteAllData = useCallback(async () => {
  await clearAllData()();
  // ❌ 没有调用 queryClient.invalidateQueries() 或 queryClient.clear()
  setTimeout(() => window.location.reload(), 1000);
}, []);
```

### 根本原因
1. 初始化逻辑的 ref 在组件重新挂载时重置
2. 删除数据后没有清除 Query 缓存
3. 可能存在竞态条件：Query 返回空数组时触发创建

### 修复方案

**1. 使用全局状态管理初始化标记**
```typescript
// 使用 Zustand 或 localStorage 存储初始化状态
const useAppStore = create(persist(
  (set) => ({
    hasInitialized: false,
    setHasInitialized: (value: boolean) => set({ hasInitialized: value }),
  }),
  { name: 'app-state' }
));
```

**2. 删除数据时清除缓存和状态**
```typescript
const handleDeleteAllData = useCallback(async () => {
  await clearAllData()();
  queryClient.clear();  // 清除所有 Query 缓存
  useAppStore.getState().setHasInitialized(false);  // 重置初始化状态
  // ...
}, []);
```

**3. 改进初始化逻辑**
```typescript
useEffect(() => {
  const initializeWorkspace = async () => {
    if (workspacesRaw === undefined) return;  // 等待数据加载
    if (isLoading) return;  // 等待加载完成
    
    const hasInitialized = useAppStore.getState().hasInitialized;
    if (hasInitialized) return;
    
    useAppStore.getState().setHasInitialized(true);
    
    if (workspaces.length === 0) {
      await createWorkspace({ title: "My Workspace" })();
    }
  };
}, [workspacesRaw, isLoading]);
```

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `apps/desktop/package.json` | 依赖配置 |
| `apps/desktop/src/main.tsx` | 应用入口 |
| `apps/desktop/src/db/init.db.fn.ts` | 数据库初始化 |
| `apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx` | ActivityBar 容器 |
| `apps/desktop/src/repo/clear-data.repo.fn.ts` | 清除数据仓库 |
| `apps/desktop/src/queries/workspace.queries.ts` | 工作区查询 |
| `packages/rust-core/src/db/clear_data_db_fn.rs` | Rust 清除数据实现 |

---

## 下一步行动

- [ ] 安装 TanStack Query 和 DevTools
- [ ] 修复删除数据后的初始化逻辑
- [ ] 使用全局状态管理初始化标记
- [ ] 删除数据时清除 Query 缓存
- [ ] 添加单元测试验证修复
