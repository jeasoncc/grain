---
inclusion: manual
---

# 代码规范

## 函数式编程

### 不可变性

```typescript
// ✅ 推荐
const newItems = [...items, newItem];
const updated = items.map(item => item.id === id ? { ...item, name } : item);

// ❌ 禁止
items.push(newItem);
item.name = name;
```

### 管道组合

```typescript
import { pipe } from "fp-ts/function";
const result = pipe(data, validate, transform, format);
```

### 错误处理

```typescript
import * as TE from "fp-ts/TaskEither";
const saveNode = (node: Node): TE.TaskEither<AppError, Node> => /* ... */;
```

## 组件规范

### 组件分层

```
Container (容器组件)  → 连接 hooks/stores
    │ props
    ▼
View (展示组件)       → 只接收 props，无副作用
```

### 组件命名

| 类型 | 命名格式 |
|------|---------|
| 展示组件 | `xxx.view.fn.tsx` |
| 容器组件 | `xxx.container.fn.tsx` |
| 类型定义 | `xxx.types.ts` |

### 组件示例

```typescript
// file-tree.view.fn.tsx - 纯展示
export const FileTreeView = memo(({ nodes, onSelect }: Props) => {
  const [isHovered, setIsHovered] = useState(false); // ✅ UI 状态
  // const [nodes, setNodes] = useState([]); // ❌ 业务状态
  return <div>...</div>;
});

// file-tree.container.fn.tsx - 容器
export const FileTreeContainer = memo(() => {
  const nodes = useNodes();
  const { setSelectedId } = useSelectionStore();
  return <FileTreeView nodes={nodes} onSelect={setSelectedId} />;
});
```

## 日志规范

```typescript
// ❌ 禁止
console.log("data saved");

// ✅ 推荐
import logger from "@/log";
logger.info("[ModuleName] 操作描述", data);
```

## 时间和工具

```typescript
// 时间处理
import dayjs from "dayjs";
const now = dayjs();

// 工具函数
import { debounce } from "es-toolkit"; // ✅
// import { debounce } from "lodash";  // ❌
```

## 测试规范

| 文件类型 | 测试文件 |
|---------|---------|
| `*.fn.ts` | `*.fn.test.ts` |
| `*.action.ts` | `*.action.test.ts` |
| `*.view.fn.tsx` | `*.view.fn.test.tsx` |

测试文件与源文件放在同一目录。

## 代码清理

必须清理：未使用的 import、变量、`console.log`、注释掉的代码块。

## 注释规范

所有注释使用中文，技术术语可保留英文。
