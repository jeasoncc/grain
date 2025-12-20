# Grain 代码规范

本文档定义了 Grain 项目的代码质量标准。详细架构设计请参考 `architecture.md`。

## 核心原则

```
对象 = 纯数据（Interface + Builder）
操作 = 纯函数（通过 pipe 组合）
校验 = Zod Schema（运行时守卫）
```

## 技术栈

### 函数式编程库

| 库 | 用途 | 说明 |
|---|------|------|
| **fp-ts** | 函数式核心 | pipe, Option, Either, Task |
| **es-toolkit** | 实用工具 | pick, omit, debounce, chunk 等 |
| **Immer** | 不可变更新 | 与 Zustand 配合使用 |
| **Zod** | 运行时校验 | Schema 定义和验证 |
| **dayjs** | 时间处理 | 替代 new Date() |

### fp-ts 使用示例

```typescript
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";

// 管道组合
const result = pipe(
  rawData,
  validateWithZod,
  E.map(data => new NodeBuilder().from(data).build()),
  E.map(enrichWithDefaults)
);

// Option 处理可空值
const getName = (user: User | null): string => pipe(
  O.fromNullable(user),
  O.map(u => u.name),
  O.getOrElse(() => "Unknown")
);
```

### es-toolkit 使用示例

```typescript
import { pick, omit, debounce, chunk, groupBy } from "es-toolkit";

// 对象操作
const subset = pick(obj, ["id", "name"]);
const rest = omit(obj, ["password"]);

// 数组操作
const chunks = chunk(items, 10);
const grouped = groupBy(users, u => u.role);

// 函数操作
const debouncedSave = debounce(save, 300);
```

### 禁止使用

```typescript
// ❌ 禁止：直接使用 lodash
import _ from "lodash";
import { debounce } from "lodash";

// ✅ 推荐：使用 es-toolkit
import { debounce } from "es-toolkit";
```

## 函数式编程

### 不可变性

```typescript
// ✅ 推荐：不可变更新
const newItems = [...items, newItem];
const updated = items.map(item => item.id === id ? { ...item, name } : item);

// ❌ 避免：直接修改
items.push(newItem);
item.name = name;
```

### 纯函数

```typescript
// ✅ 推荐：纯函数
const calculateTotal = (items: Item[]) => 
  items.reduce((sum, item) => sum + item.price, 0);

// ❌ 避免：副作用
let total = 0;
const calculateTotal = (items: Item[]) => { 
  items.forEach(item => total += item.price); 
};
```

### 管道组合

```typescript
// ✅ 推荐：fp-ts pipe 组合
import { pipe } from "fp-ts/function";

const result = pipe(
  data,
  validate,
  transform,
  format
);

// ❌ 避免：嵌套调用
const result = format(transform(validate(data)));
```

### 高阶函数

```typescript
// ✅ 推荐：map/filter/reduce
const activeUsers = users.filter(u => u.active).map(u => u.name);

// ❌ 避免：for 循环
const activeUsers = [];
for (const u of users) { if (u.active) activeUsers.push(u.name); }
```

## Builder 模式

### Interface（纯数据，无方法）

```typescript
interface Node {
  readonly id: string;
  readonly title: string;
  readonly type: "file" | "folder";
}
```

### Builder（构建方法）

```typescript
class NodeBuilder {
  private data: Partial<Node> = {};
  
  id(v: string) { this.data.id = v; return this; }
  title(v: string) { this.data.title = v; return this; }
  type(v: Node["type"]) { this.data.type = v; return this; }
  
  from(node: Node) { this.data = { ...node }; return this; }
  
  build(): Node {
    return Object.freeze(this.data) as Node;
  }
}
```

### 使用示例

```typescript
// 创建新对象
const node = new NodeBuilder()
  .id(uuid())
  .title("新文件")
  .type("file")
  .build();

// 基于现有对象更新
const updated = new NodeBuilder()
  .from(existingNode)
  .title("新标题")
  .build();
```

## 数据校验

### Zod Schema

```typescript
import { z } from "zod";

export const nodeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  type: z.enum(["file", "folder"]),
});

// 从 Zod 推断类型
export type Node = z.infer<typeof nodeSchema>;
```

### 校验流程

```typescript
// 1. 外部数据校验
const result = nodeSchema.safeParse(rawData);
if (!result.success) {
  showErrors(result.error);
  return;
}

// 2. 构建正式对象
const node = new NodeBuilder()
  .id(result.data.id)
  .title(result.data.title)
  .build();
```

## 文件组织

### 单一职责

- 文件超过 100 行 → 考虑拆分
- 函数超过 30 行 → 考虑拆分
- 组件只处理 UI，函数只处理数据

### 依赖规则

- `types/` → 无依赖
- `lib/` → 只依赖 `types/`
- `db/` → 只依赖 `types/`
- `stores/` → 只依赖 `types/`
- `fn/` → 依赖 `types/`, `lib/`, `db/`, `stores/`
- `hooks/` → 依赖 `fn/`, `stores/`
- `components/` → 依赖 `hooks/`, `types/`

## 注释规范

### 语言

- **所有注释使用中文**
- 技术术语可保留英文

### 文件级注释

```typescript
/**
 * @file node.parse.fn.ts
 * @description 节点解析相关的纯函数
 * 
 * 功能说明：
 * - 解析 Lexical JSON 内容
 * - 提取纯文本
 */
```

### 函数注释

```typescript
/**
 * 将节点树转换为 Markdown 格式
 * 
 * @param nodes - 要转换的节点数组
 * @param options - 转换选项
 * @returns Markdown 字符串
 */
```

## 时间处理

### 使用 dayjs

所有时间相关操作必须使用 `dayjs`，禁止直接使用 `new Date()` 或 `Date.now()`。

```typescript
// ❌ 禁止
const now = new Date();
const timestamp = Date.now();
const formatted = new Date().toISOString();

// ✅ 推荐
import dayjs from "dayjs";

const now = dayjs();
const timestamp = dayjs().valueOf();
const formatted = dayjs().toISOString();
const fromTimestamp = dayjs(1234567890);
const parsed = dayjs("2024-01-01");
```

### 常用操作

```typescript
// 格式化
dayjs().format("YYYY-MM-DD HH:mm:ss");

// 比较
dayjs(a).isBefore(dayjs(b));
dayjs(a).isAfter(dayjs(b));

// 计算
dayjs().add(1, "day");
dayjs().subtract(1, "week");

// 相对时间（需要 relativeTime 插件）
dayjs().fromNow();
```

## 性能优化

### Million.js 编译优化

对于纯展示组件，使用 `block` 包装以获得自动优化：

```typescript
import { block } from "million/react";

// ✅ 推荐：纯展示组件使用 block
const NodeItem = block(({ node }: { node: Node }) => (
  <div className="node-item">
    <span>{node.title}</span>
  </div>
));

// ❌ 不适用：有复杂状态或副作用的组件
```

### 虚拟列表

大量数据（>100 项）必须使用虚拟列表：

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

// ✅ 推荐：文件树、搜索结果、节点列表
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 32,
});

// ❌ 避免：直接渲染大量 DOM
{items.map(item => <Item key={item.id} />)}
```

### 性能检查清单

- [ ] 列表超过 100 项 → 使用虚拟列表
- [ ] 纯展示组件 → 考虑 Million.js block
- [ ] 频繁更新的状态 → 使用 Zustand selector
- [ ] 大对象更新 → 使用 Immer
- [ ] 防抖/节流 → 使用 es-toolkit

## 错误处理

### 使用 fp-ts Either

所有可能失败的操作必须使用 `Either` 类型显式处理错误：

```typescript
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

// 定义错误类型
type AppError =
  | { type: "VALIDATION_ERROR"; message: string }
  | { type: "DB_ERROR"; message: string }
  | { type: "NOT_FOUND"; message: string };

// ✅ 推荐：显式错误处理
const saveNode = (node: Node): E.Either<AppError, Node> => {
  if (!node.title) {
    return E.left({ type: "VALIDATION_ERROR", message: "标题不能为空" });
  }
  // ...
  return E.right(node);
};

// 使用
pipe(
  saveNode(node),
  E.match(
    (error) => logger.error("[Node] 保存失败:", error),
    (saved) => logger.success("[Node] 保存成功:", saved.id)
  )
);
```

## 测试规范

### 核心原则：每个纯函数必须有测试

函数式编程的核心优势是纯函数易于测试。**所有 `*.fn.ts` 和 `*.action.ts` 文件必须有对应的测试文件**。

### 测试文件组织

测试文件与源文件放在同一目录：

```
fn/node/
├── node.parse.fn.ts
├── node.parse.fn.test.ts      # 对应测试
├── node.transform.fn.ts
└── node.transform.fn.test.ts  # 对应测试

routes/nodes/actions/
├── create-node.action.ts
├── create-node.action.test.ts # 对应测试
└── index.ts
```

### 单元测试

```typescript
// node.transform.fn.test.ts
import { describe, it, expect } from "vitest";
import { transformNode } from "./node.transform.fn";

describe("transformNode", () => {
  it("should transform node title to uppercase", () => {
    const node = { id: "1", title: "test" };
    const result = transformNode(node);
    expect(result.title).toBe("TEST");
  });

  it("should preserve node id", () => {
    const node = { id: "123", title: "test" };
    const result = transformNode(node);
    expect(result.id).toBe("123");
  });

  it("should handle empty title", () => {
    const node = { id: "1", title: "" };
    const result = transformNode(node);
    expect(result.title).toBe("");
  });
});
```

### Property-Based Testing

对于关键业务逻辑，使用 fast-check 进行属性测试：

```typescript
import { fc } from "fast-check";
import { describe, it } from "vitest";

describe("transformNode properties", () => {
  it("should never change node id", () => {
    fc.assert(
      fc.property(
        fc.record({ id: fc.uuid(), title: fc.string() }),
        (node) => {
          const result = transformNode(node);
          return result.id === node.id;
        }
      )
    );
  });

  it("should always return valid node", () => {
    fc.assert(
      fc.property(
        fc.record({ 
          id: fc.uuid(), 
          title: fc.string({ minLength: 1, maxLength: 200 }) 
        }),
        (node) => {
          const result = transformNode(node);
          return nodeSchema.safeParse(result).success;
        }
      )
    );
  });
});
```

### 测试覆盖要求

| 函数类型 | 测试要求 |
|---------|---------|
| `*.fn.ts` | 必须有单元测试 |
| `*.action.ts` | 必须有单元测试 |
| `*.db.fn.ts` | 必须有单元测试（可 mock DB） |
| 关键业务逻辑 | 必须有 property-based testing |

### 运行测试

```bash
bun run test        # 运行所有测试
bun run test:watch  # 监听模式
```

## 组件规范

### 组件分层

```
Route (路由组件)     → 编排层：连接数据，调用 actions
  │
  │ props (纯数据 + 回调函数)
  ▼
Component (展示组件) → 展示层：只接收 props，无副作用
```

### 纯展示组件

组件必须是纯函数，只通过 props 接收数据：

```typescript
// ✅ 推荐：纯展示组件
interface NodeListProps {
  readonly nodes: Node[];
  readonly onSelect: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

const NodeList = memo(({ nodes, onSelect, onDelete }: NodeListProps) => (
  <div>
    {nodes.map(node => (
      <NodeItem 
        key={node.id} 
        node={node} 
        onSelect={onSelect}
        onDelete={onDelete}
      />
    ))}
  </div>
));

// ❌ 禁止：组件内部获取数据
const NodeList = () => {
  const nodes = useNodes();           // 直接访问 store
  const { data } = useQuery(...);     // 直接请求数据
  return <div>{nodes.map(...)}</div>;
};
```

### 允许的组件内部状态

```typescript
// ✅ 允许：纯 UI 状态
const [isOpen, setIsOpen] = useState(false);       // 下拉菜单
const [isHovered, setIsHovered] = useState(false); // 悬停效果
const [inputValue, setInputValue] = useState("");  // 受控输入（未提交）

// ❌ 禁止：业务数据状态
const [nodes, setNodes] = useState([]);            // 业务数据
const [user, setUser] = useState(null);            // 用户数据
```

### 路由组件规范

路由组件只负责编排，不实现具体逻辑：

```typescript
// ✅ 推荐：路由组件只调用 actions
import { createNode, deleteNode } from "./actions";

const NodesRoute = () => {
  const nodes = useNodes();
  const navigate = useNavigate();
  
  // 只调用，不实现
  const handleCreate = () => createNode(workspaceId, "新文件");
  const handleDelete = (id: string) => deleteNode(id);
  const handleSelect = (id: string) => navigate(`/node/${id}`);
  
  return (
    <NodeList 
      nodes={nodes}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onSelect={handleSelect}
    />
  );
};
```

## Actions 规范

### 文件组织

操作函数遵循"一个函数一个文件"原则：

```
routes/nodes/
├── actions/
│   ├── create-node.action.ts      # 单独文件
│   ├── delete-node.action.ts      # 单独文件
│   ├── move-node.action.ts        # 单独文件
│   ├── node-clipboard.action.ts   # 合并：强相关的小函数
│   └── index.ts                   # 统一导出
├── nodes.route.tsx
└── index.ts
```

### 合并条件

| 条件 | 单独文件 | 合并文件 |
|------|---------|---------|
| 函数行数 | > 10 行 | < 10 行 |
| 相关性 | 独立功能 | 强相关（如 copy/cut/paste） |
| 共享状态 | 无 | 有共享的内部状态 |

### 命名规范

```
动作-对象.action.ts

create-node.action.ts       # 创建节点
delete-node.action.ts       # 删除节点
export-workspace.action.ts  # 导出工作区
import-backup.action.ts     # 导入备份
```

### Action 示例

```typescript
// create-node.action.ts
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import logger from "@/log";

/**
 * 创建新节点
 */
export const createNode = async (
  workspaceId: string,
  title: string,
  type: NodeType = "file"
): Promise<E.Either<AppError, Node>> => {
  logger.start("[Node] 创建节点...");
  
  return pipe(
    { workspaceId, title, type },
    validateNodeInput,
    E.chain(buildNode),
    E.chain(saveToDb),
    E.tap(() => logger.success("[Node] 节点创建成功"))
  );
};
```

## 日志规范

### 使用 logger

所有日志必须使用项目的 `logger` 模块，禁止使用 `console.log`。

```typescript
// ❌ 禁止
console.log("data saved");
console.error("failed to save");

// ✅ 推荐
import logger from "@/log";

logger.info("数据已保存");
logger.error("保存失败:", error);
```

### 日志级别

| 级别 | 图标 | 用途 |
|------|------|------|
| `logger.info()` | ℹ️ | 一般信息，数据变更 |
| `logger.success()` | ✅ | 操作成功完成 |
| `logger.warn()` | ⚠️ | 警告，非致命问题 |
| `logger.error()` | ❌ | 错误，操作失败 |
| `logger.debug()` | 🐛 | 调试信息（开发环境） |
| `logger.start()` | 🚀 | 流程开始 |

### 必须打日志的场景

```typescript
// 1. 数据库操作
logger.info("[DB] 创建节点:", node.id);
logger.success("[DB] 节点保存成功");
logger.error("[DB] 节点保存失败:", error);

// 2. 数据处理流程
logger.start("[Export] 开始导出...");
logger.info("[Export] 处理节点数:", nodes.length);
logger.success("[Export] 导出完成:", filename);

// 3. 状态变更
logger.info("[Store] 工作区切换:", workspaceId);
logger.info("[Store] 编辑器状态更新");

// 4. 外部数据导入
logger.info("[Import] 开始导入备份");
logger.warn("[Import] 跳过无效数据:", invalidCount);
logger.success("[Import] 导入完成");

// 5. 错误处理
logger.error("[Backup] 备份失败:", error);
```

### 日志格式规范

```typescript
// ✅ 推荐：带模块标签
logger.info("[ModuleName] 操作描述", data);

// ✅ 推荐：关键数据记录
logger.info("[Node] 创建节点:", { id: node.id, type: node.type });

// ❌ 避免：无标签、无上下文
logger.info("done");
logger.info(data);
```

## 代码清理

### 必须清理

- 未使用的 import
- 未使用的变量、函数
- `console.log` 调试代码（必须替换为 logger）
- 被注释掉的代码块

### 检测工具

```bash
bun run lint    # Biome 检查
bun run check   # 类型检查
```
