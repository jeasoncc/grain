# Grain 函数式数据流架构

## 设计哲学

```
对象 = 纯数据（Interface + Builder 构建）
操作 = 纯函数（对数据进行变换）
流动 = 管道（pipe 连接函数）
边界 = 入口窄，出口宽
```

## 三层数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         数据流架构                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Component  │────▶│    Hook     │────▶│   Action    │
│  (UI 层)    │     │  (绑定层)    │     │  (业务层)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
                  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
                  │     fn/     │       │    repo/    │       │   types/    │
                  │  (纯函数)    │       │ (数据访问)  │       │  (类型)     │
                  └─────────────┘       └──────┬──────┘       └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Tauri invoke│
                                        └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Rust 后端   │
                                        │  (SQLite)   │
                                        └─────────────┘
```

## 各层职责

| 层级 | 职责 | 示例 |
|------|------|------|
| Component | UI 渲染、用户交互 | `FileTree.view.fn.tsx` |
| Hook | 连接 UI 和业务逻辑 | `useNodes()` |
| Action | 业务逻辑编排 | `createNode.action.ts` |
| fn/ | 纯函数转换 | `node.transform.fn.ts` |
| repo/ | 调用 Tauri Commands | `node.repo.fn.ts` |

## 代码示例

```typescript
// 1. Component 调用 Hook
const FileTree = () => {
  const { nodes, createNode } = useNodes();
  return <button onClick={() => createNode({ title: "新文件" })} />;
};

// 2. Hook 调用 Action
const useNodes = () => {
  const mutation = useMutation({ mutationFn: createNodeAction });
  return { createNode: mutation.mutate };
};

// 3. Action 组合 fn 和 repo
const createNodeAction = (params: CreateNodeParams) =>
  pipe(
    TE.Do,
    TE.bind("validated", () => validateNode(params)),      // fn/
    TE.bind("node", ({ validated }) => nodeRepo.create(validated)), // repo/
    TE.map(({ node }) => node)
  );

// 4. Repo 调用 Rust 后端
const create = (node: Node) => TE.tryCatch(
  () => invoke("create_node", { node }),
  AppError.fromUnknown
);
```

## 依赖规则

| 层级 | 可依赖 |
|------|--------|
| `components/` | `hooks/`, `types/` |
| `hooks/` | `actions/`, `stores/` |
| `actions/` | `fn/`, `repo/`, `types/` |
| `fn/` | `types/`, `lib/` |
| `repo/` | `types/`, `lib/` |

## 禁止的模式

```typescript
// ❌ Component 直接调用 repo
const handleClick = () => nodeRepo.create(data)();

// ❌ Hook 直接调用 repo
const useNodes = () => useQuery({
  queryFn: () => nodeRepo.getAll()(),  // 应该通过 action
});

// ✅ 正确：Component → Hook → Action → Repo
const handleClick = () => mutate(data);
```

## 设计原则

1. **数据单向流动**：Component → Hook → Action → Repo → Rust
2. **副作用边界**：只有 repo 层有 IO 副作用
3. **纯函数优先**：fn 层是纯函数，无副作用
4. **错误处理**：使用 TaskEither，不用 try-catch
