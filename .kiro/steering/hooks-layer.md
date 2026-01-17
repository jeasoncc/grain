# Hooks 层架构设计

## 核心原则

### Hooks 的唯一职责：数据绑定

**Hooks = 数据绑定层**

✅ **应该做的：**
- 从 state 读取数据
- 调用 flows 函数
- 使用 React 特性（useCallback、useEffect、useMemo）
- 将数据和函数传递给 views

❌ **不应该做的：**
- 错误处理（flows 负责）
- 日志记录（flows 负责）
- 业务逻辑（flows 负责）
- Toast 提示（flows 负责）
- 直接调用 pipes 函数（应通过 flows）

## 关键认知

### Hooks 应该是静默的
- Hooks 只负责"绑定"（React 生命周期 + 数据流），不负责业务逻辑
- 如果移除日志和错误处理，hooks 会变得很简洁，这是正确的

### Toast ≠ 日志
- **日志**：开发者看的，用于调试和监控（flows 层）
- **Toast**：用户看的，业务反馈的一部分（flows 层）
- Toast 是业务逻辑的输出，应该在 flows 层处理

## 职责分离

| 层级 | 职责 |
|------|------|
| **Flows 层** | 业务逻辑 + IO 操作 + 日志记录 + Toast 提示 |
| **Hooks 层** | 纯粹的数据绑定，调用 flows 即可 |
| **Views 层** | 只负责渲染 UI |

## 依赖规则

```
hooks/ → 只能依赖 flows/, state/, queries/, types/
```

### Hooks 可以依赖：
- ✅ `types/`（定义接口、参数、返回值）
- ✅ `flows/`（调用业务逻辑）
- ✅ `state/`（读取状态）
- ✅ `queries/`（TanStack Query）

### Hooks 不能依赖：
- ❌ `io/`（IO 操作在 flows 层）
- ❌ `pipes/`（纯函数在 flows 层调用）
- ❌ `views/`（避免循环依赖）
- ❌ `utils/`（工具函数应通过 flows 或在 hook 内部定义）

## 为什么 Hooks 不能依赖 Pipes？

虽然 `pipes/` 是纯函数，但架构设计要求：

1. **职责清晰**：Hooks 只负责绑定，不负责数据转换
2. **可测试性**：业务逻辑（包括数据转换）应该在 flows 层测试
3. **可维护性**：所有业务逻辑集中在 flows 层，便于理解和修改

## 正确的数据流

```
pipes/ (纯函数)
   ↓
flows/ (组合 pipes + io)
   ↓
hooks/ (绑定 flows + state)
   ↓
views/ (渲染 UI)
```

## 示例

### ❌ 错误：Hook 直接调用 Pipe

```typescript
// hooks/use-file-tree.ts
import { flattenTree } from "@/pipes/node"  // ❌ 违反架构规则

export function useFileTree() {
  const flatNodes = useMemo(
    () => flattenTree(nodes, expandedFolders),  // ❌ 直接调用 pipe
    [nodes, expandedFolders]
  )
}
```

### ✅ 正确：通过 Flow 调用

```typescript
// flows/file-tree/flatten-tree.flow.ts
import { flattenTree } from "@/pipes/node"

export const flattenTreeFlow = (
  nodes: readonly NodeInterface[],
  expandedFolders: Record<string, boolean>
) => flattenTree(nodes, expandedFolders)

// hooks/use-file-tree.ts
import { flattenTreeFlow } from "@/flows/file-tree"  // ✅ 通过 flow

export function useFileTree() {
  const flatNodes = useMemo(
    () => flattenTreeFlow(nodes, expandedFolders),  // ✅ 调用 flow
    [nodes, expandedFolders]
  )
}
```

## 特殊情况

### 简单的辅助函数

如果是非常简单的辅助函数（如格式化、计算），可以在 hook 内部定义：

```typescript
export function useFileTree() {
  // ✅ 简单的内部辅助函数
  const calculateDepth = (node: Node) => {
    // 简单计算逻辑
  }
}
```

但如果逻辑复杂或需要复用，应该：
1. 放到 `pipes/` 层
2. 通过 `flows/` 层调用
3. Hook 调用 flow

## 总结

- Hooks 是"水龙头"，只负责连接数据流
- 所有业务逻辑（包括数据转换）都在 flows 层
- 保持 hooks 简洁、静默、专注于绑定
