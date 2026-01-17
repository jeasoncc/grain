# Design Document: File Tree Expand/Collapse Refactoring / 设计文档：文件树展开/折叠重构

## Overview / 概述

This design refactors the file tree expand/collapse logic and adds "Expand All" and "Collapse All" buttons. The refactoring removes unnecessary database persistence for UI state and adopts a cleaner architecture using Zustand for runtime state management.

本设计重构文件树展开/折叠逻辑并添加"全部展开"和"全部折叠"按钮。重构移除了 UI 状态的不必要数据库持久化，并采用更清晰的架构，使用 Zustand 进行运行时状态管理。

### Key Principles / 核心原则

1. **UI State in Zustand / UI 状态在 Zustand**: Expand/collapse state is UI state, managed in Zustand, not persisted / 展开/折叠状态是 UI 状态，在 Zustand 中管理，不持久化
2. **Database for Business Data / 数据库用于业务数据**: Only node structure (parent, order, content) is persisted / 仅节点结构（父节点、顺序、内容）被持久化
3. **Functional Programming / 函数式编程**: Use TaskEither + pipe, no async/await / 使用 TaskEither + pipe，无 async/await
4. **No Persistence / 无持久化**: expandedFolders is not persisted, reinitialized on load / expandedFolders 不持久化，加载时重新初始化

## Architecture / 架构

### Current Problems / 当前问题

```typescript
// ❌ 当前架构问题
1. NodeInterface.collapsed 存储在数据库 → UI 状态不应在数据库
2. 每次展开/折叠都写数据库 → 性能差
3. use-optimistic-collapse.ts 复杂的补丁逻辑 → 架构不清晰
4. 使用 async/await → 不符合项目函数式编程规范
```

### New Architecture / 新架构

```
数据库 (SQLite)
  ↓ 加载节点
TanStack Query (缓存业务数据)
  ↓ 初始化
Zustand expandedFolders (运行时 UI 状态)
  ↓ 渲染
React 组件
```

### Data Flow / 数据流

```typescript
// 1. 初始化：从数据库加载
数据库 → TanStack Query → 初始化 Zustand expandedFolders
                              ↓
                         React 渲染

// 2. 展开/折叠：纯前端操作
用户点击 → Zustand.toggleFolderExpanded → React 重新渲染
           ↓
        无数据库交互！

// 3. 业务操作：同步数据库
创建/删除/移动 → 数据库 API → TanStack Query 刷新 → 重新初始化 Zustand
```

## Components and Interfaces / 组件和接口

### Phase 1: Refactoring / 阶段 1：重构

#### 1. Remove Database Persistence / 移除数据库持久化

**Files to modify / 需要修改的文件:**

- `apps/desktop/src/hooks/use-optimistic-collapse.ts` - **DELETE / 删除**
- `apps/desktop/src/hooks/use-file-tree-panel.ts` - Simplify toggle logic / 简化切换逻辑
- `apps/desktop/src/state/sidebar.state.ts` - Ensure expandedFolders is not persisted / 确保 expandedFolders 不被持久化

#### 2. Initialize Expand State / 初始化展开状态

**New file / 新文件:** `apps/desktop/src/pipes/node/node.expand-init.fn.ts`

```typescript
/**
 * 从节点列表初始化展开状态
 * Initialize expand state from node list
 */
export const initializeExpandedFolders = (
  nodes: readonly NodeInterface[]
): Record<string, boolean> => {
  return nodes
    .filter(node => node.type === 'folder')
    .reduce((acc, folder) => ({
      ...acc,
      // 从 collapsed 字段读取初始状态，默认为 false（折叠）
      [folder.id]: !(folder.collapsed ?? true)
    }), {})
}
```

#### 3. Simplify Toggle Logic / 简化切换逻辑

**Modify / 修改:** `apps/desktop/src/hooks/use-file-tree-panel.ts`

```typescript
// ❌ 删除
import { useOptimisticCollapse } from "./use-optimistic-collapse"
const { toggleCollapsed: optimisticToggleCollapsed } = useOptimisticCollapse({ workspaceId })

// ✅ 新增：直接使用 Zustand
import { useSidebarStore } from "@/state/sidebar.state"

const handleToggleCollapsed = useCallback(
  (nodeId: string) => {
    useSidebarStore.getState().toggleFolderExpanded(nodeId)
  },
  []
)
```

#### 4. Initialize on Load / 加载时初始化

**Modify / 修改:** `apps/desktop/src/hooks/use-file-tree-panel.ts`

```typescript
import { initializeExpandedFolders } from "@/pipes/node"

// 当节点加载或工作区切换时，重新初始化
useEffect(() => {
  if (nodes && nodes.length > 0) {
    const expandedFolders = initializeExpandedFolders(nodes)
    useSidebarStore.getState().setExpandedFolders(expandedFolders)
  }
}, [nodes, workspaceId])
```

#### 5. Ensure No Persistence / 确保不持久化

**Modify / 修改:** `apps/desktop/src/state/sidebar.state.ts`

```typescript
export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      // ... state
    }),
    {
      name: DEFAULT_SIDEBAR_CONFIG.storageKey,
      partialize: (state) => ({
        activePanel: state.activePanel,
        drawingsState: state.drawingsState,
        // ❌ 移除 fileTreeState（包含 expandedFolders）
        // fileTreeState: state.fileTreeState,
        isOpen: state.isOpen,
        previousWidth: state.previousWidth,
        searchState: state.searchState,
        wasCollapsedByDrag: state.wasCollapsedByDrag,
        width: state.width,
      }),
    },
  ),
)
```

### Phase 2: Add Expand/Collapse All / 阶段 2：添加全部展开/折叠

#### 1. Pure Functions / 纯函数

**New file / 新文件:** `apps/desktop/src/pipes/node/node.expand-all.fn.ts`

```typescript
import type { NodeInterface } from "@/types/node"

/**
 * 计算全部展开状态
 * Calculate expand all state
 */
export const calculateExpandAllFolders = (
  nodes: readonly NodeInterface[]
): Record<string, boolean> => {
  return nodes
    .filter(node => node.type === 'folder')
    .reduce((acc, folder) => ({
      ...acc,
      [folder.id]: true
    }), {})
}

/**
 * 计算全部折叠状态
 * Calculate collapse all state
 */
export const calculateCollapseAllFolders = (
  nodes: readonly NodeInterface[]
): Record<string, boolean> => {
  return nodes
    .filter(node => node.type === 'folder')
    .reduce((acc, folder) => ({
      ...acc,
      [folder.id]: false
    }), {})
}

/**
 * 检查是否有文件夹
 * Check if there are any folders
 */
export const hasFolders = (nodes: readonly NodeInterface[]): boolean => {
  return nodes.some(node => node.type === 'folder')
}
```

#### 2. UI Components / UI 组件

**Modify / 修改:** `apps/desktop/src/views/file-tree/file-tree.view.fn.tsx`

```typescript
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react"
import { calculateExpandAllFolders, calculateCollapseAllFolders, hasFolders } from "@/pipes/node"
import { useSidebarStore } from "@/state/sidebar.state"

// 在组件中添加
const hasAnyFolders = useMemo(() => hasFolders(nodes), [nodes])

const handleExpandAll = useCallback(() => {
  if (!nodes || nodes.length === 0) return
  
  const expandedState = calculateExpandAllFolders(nodes)
  useSidebarStore.getState().setExpandedFolders(expandedState)
  
  // 同步 react-arborist
  if (treeRef.current) {
    treeRef.current.openAll()
  }
}, [nodes, treeRef])

const handleCollapseAll = useCallback(() => {
  if (!nodes || nodes.length === 0) return
  
  const collapsedState = calculateCollapseAllFolders(nodes)
  useSidebarStore.getState().setExpandedFolders(collapsedState)
  
  // 同步 react-arborist
  if (treeRef.current) {
    treeRef.current.closeAll()
  }
}, [nodes, treeRef])

// 在 Explorer Header 中添加按钮
<div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
  <Button
    variant="ghost"
    size="icon"
    className="size-7 hover:bg-sidebar-accent rounded-sm"
    onClick={handleExpandAll}
    disabled={!hasAnyFolders}
    title="展开所有文件夹 / Expand all folders"
  >
    <ChevronsDownUp className="size-4" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    className="size-7 hover:bg-sidebar-accent rounded-sm"
    onClick={handleCollapseAll}
    disabled={!hasAnyFolders}
    title="折叠所有文件夹 / Collapse all folders"
  >
    <ChevronsUpDown className="size-4" />
  </Button>
  {/* 现有按钮 */}
</div>
```

## Data Models / 数据模型

### NodeInterface

```typescript
export interface NodeInterface {
  id: string
  title: string
  type: NodeType
  parent: string | null
  order: number
  collapsed?: boolean  // ✅ 保留：作为初始状态
  // ... 其他字段
}
```

### FileTreeState

```typescript
export interface FileTreeState {
  expandedFolders: Record<string, boolean>  // ✅ 运行时状态，不持久化
}
```

## Error Handling / 错误处理

### Input Validation / 输入验证

1. **Empty Node Array / 空节点数组**: 
   - `initializeExpandedFolders([])` returns `{}`
   - Buttons are disabled

2. **No Folders / 无文件夹**: 
   - `hasFolders([])` returns `false`
   - Buttons are disabled

3. **Missing Tree Ref / 缺失树引用**:
   - State update still occurs
   - react-arborist calls are skipped
   - No error thrown

## Testing Strategy / 测试策略

### Unit Tests / 单元测试

1. **initializeExpandedFolders**: Test initialization from collapsed field
2. **calculateExpandAllFolders**: Test all folders set to true
3. **calculateCollapseAllFolders**: Test all folders set to false
4. **hasFolders**: Test folder detection
5. **Edge cases**: Empty arrays, no folders, mixed content

### Integration Tests / 集成测试

1. **Refactoring**: Verify no database writes on toggle
2. **Initialization**: Verify state initialized from database
3. **Expand All**: Verify all folders expanded
4. **Collapse All**: Verify all folders collapsed
5. **Button State**: Verify buttons disabled when no folders

## Performance Considerations / 性能考虑

### Before Refactoring / 重构前

```
展开 1 个文件夹:
  1. 更新 TanStack Query 缓存
  2. 300ms 防抖
  3. 写数据库
  4. 回读验证
  总耗时: ~350ms + 数据库 I/O
```

### After Refactoring / 重构后

```
展开 1 个文件夹:
  1. 更新 Zustand 状态
  总耗时: < 1ms (纯内存操作)

展开 100 个文件夹:
  1. 更新 Zustand 状态
  总耗时: < 5ms (纯内存操作)
```

**性能提升: ~70x faster / 快约 70 倍**

## Migration Strategy / 迁移策略

### Backward Compatibility / 向后兼容

```typescript
// 第一次加载时，从数据库读取现有 collapsed 状态
// 之后所有操作都在 Zustand 中进行
// 用户无感知迁移
```

### Rollback Plan / 回滚计划

```typescript
// 如果需要回滚：
// 1. 恢复 use-optimistic-collapse.ts
// 2. 恢复数据库写入逻辑
// 3. 恢复 persist 配置
```
