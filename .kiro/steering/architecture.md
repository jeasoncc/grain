# Grain 函数式数据流架构

本文档定义了 Grain 项目的核心架构设计，基于函数式编程理念，实现数据的单向流动。

## 核心理念

```
对象 = 纯数据（Interface + Builder 构建）
操作 = 纯函数（对数据进行变换）
流动 = 管道（pipe 连接函数）
```

### 设计哲学

- **数据是水流**：数据像水一样流经管道，每个管道节点是一个纯函数
- **对象无方法**：Interface 和 Builder 只定义数据结构，不包含行为
- **函数是管道**：所有操作都是纯函数，通过 pipe 组合
- **不可变性**：数据一旦创建就不可修改，更新产生新对象

## 数据流架构图

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Grain 函数式数据流架构                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘


                                    ┌─────────────────┐
                                    │     外部世界     │
                                    └────────┬────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │                             │                             │
               ▼                             ▼                             ▼
      ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
      │    UI 表单       │          │    API 响应     │          │   文件导入      │
      │   (用户输入)     │          │   (外部数据)    │          │  (JSON/MD)     │
      └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
               │                             │                             │
               ▼                             │                             │
      ┌─────────────────┐                    │                             │
      │   FormBuilder   │                    │                             │
      │    (草稿对象)    │                    │                             │
      │                 │                    │                             │
      │  .title(...)    │                    │                             │
      │  .type(...)     │                    │                             │
      │  .toDraft()     │                    │                             │
      └────────┬────────┘                    │                             │
               │                             │                             │
               └─────────────────────────────┼─────────────────────────────┘
                                             │
                                             ▼
                          ┌─────────────────────────────────────┐
                          │           Zod Schema                │
                          │          (运行时校验)                │
                          │                                     │
                          │   • 类型检查                         │
                          │   • 格式验证                         │
                          │   • 业务规则                         │
                          │   • 错误信息生成                     │
                          └──────────────────┬──────────────────┘
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                          ❌ 校验失败                   ✅ 校验通过
                               │                           │
                               ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────────────┐
                    │    错误处理      │         │       Builder           │
                    │                 │         │      (正式对象)          │
                    │  • 显示错误提示  │         │                         │
                    │  • 高亮错误字段  │         │   new NodeBuilder()     │
                    │  • 返回表单修改  │         │     .id(uuid())         │
                    └─────────────────┘         │     .title(data.title)  │
                                                │     .createdAt(now())   │
                                                │     .build()            │
                                                │         │               │
                                                │         ▼               │
                                                │   Object.freeze()       │
                                                │     (不可变对象)         │
                                                └────────────┬────────────┘
                                                             │
                                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                    │
│                                 Pure Function Pipeline                             │
│                                    (纯函数管道)                                     │
│                                                                                    │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐             │
│    │          │      │          │      │          │      │          │             │
│    │  fn_1    │─────▶│  fn_2    │─────▶│  fn_3    │─────▶│  fn_n    │             │
│    │ (解析)   │ pipe │ (转换)   │ pipe │ (计算)   │ pipe │ (格式化) │             │
│    │          │      │          │      │          │      │          │             │
│    └──────────┘      └──────────┘      └──────────┘      └──────────┘             │
│                                                                                    │
│    特性：                                                                          │
│    • 无副作用 (No Side Effects)                                                    │
│    • 相同输入 → 相同输出 (Referential Transparency)                                │
│    • 可组合 (Composable)                                                          │
│    • 可测试 (Testable)                                                            │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                             │
                                                             │
                    ┌────────────────────────────────────────┼────────────────────────────────────────┐
                    │                                        │                                        │
                    ▼                                        ▼                                        ▼
     ┌─────────────────────────┐          ┌─────────────────────────┐          ┌─────────────────────────┐
     │                         │          │                         │          │                         │
     │     DB Functions        │          │    Store Functions      │          │   Export Functions      │
     │      (持久化函数)        │          │     (状态函数)           │          │      (导出函数)          │
     │                         │          │                         │          │                         │
     │   node.db.fn.ts         │          │   editor.store.fn.ts    │          │   export.fn.ts          │
     │   workspace.db.fn.ts    │          │   ui.store.fn.ts        │          │   pdf.fn.ts             │
     │                         │          │                         │          │   markdown.fn.ts        │
     └────────────┬────────────┘          └────────────┬────────────┘          └─────────────────────────┘
                  │                                    │
                  │                                    │
                  ▼                                    ▼
     ┌─────────────────────────┐          ┌─────────────────────────┐
     │                         │          │                         │
     │       IndexedDB         │◀────────▶│     Zustand Store       │
     │        (Dexie)          │  persist │      (内存状态)          │
     │                         │ middleware│                        │
     │   ┌─────────────────┐   │          │   ┌─────────────────┐   │
     │   │     nodes       │   │          │   │  editorState    │   │
     │   │   workspaces    │   │          │   │    uiState      │   │
     │   │    contents     │   │          │   │  selectionState │   │
     │   │    drawings     │   │          │   │   settings ─────┼───┼──▶ 持久化到 DB
     │   │    settings     │◀──┼──────────┼───┼─────────────────┘   │
     │   └─────────────────┘   │          │                         │
     │                         │          │                         │
     └─────────────────────────┘          └────────────┬────────────┘
                                                       │
                                                       │
                                                       ▼
                              ┌─────────────────────────────────────────────────────┐
                              │                                                     │
                              │                   React Hooks                       │
                              │                   (响应式绑定)                       │
                              │                                                     │
                              │   useNode(id)        → 订阅单个节点                  │
                              │   useNodes(filter)   → 订阅节点列表                  │
                              │   useEditorState()   → 订阅编辑器状态                │
                              │   useSelection()     → 订阅选择状态                  │
                              │                                                     │
                              └──────────────────────────┬──────────────────────────┘
                                                         │
                                                         │ 数据变化触发重渲染
                                                         ▼
                              ┌─────────────────────────────────────────────────────┐
                              │                                                     │
                              │                   Components                        │
                              │                    (UI 组件)                         │
                              │                                                     │
                              │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
                              │   │  FileTree   │  │   Editor    │  │  Sidebar    │ │
                              │   └─────────────┘  └─────────────┘  └─────────────┘ │
                              │                                                     │
                              └──────────────────────────┬──────────────────────────┘
                                                         │
                                                         │ 用户操作
                                                         ▼
                                                ┌─────────────────┐
                                                │   用户交互       │
                                                │                 │
                                                │  • 点击         │
                                                │  • 输入         │
                                                │  • 拖拽         │
                                                └────────┬────────┘
                                                         │
                                                         │
                                                         └──────────────▶ 回到顶部，新的数据流开始
```

## 目录结构

```
src/
├── types/                          ◀── Interface + Builder + Zod Schema
│   ├── node/
│   │   ├── node.interface.ts           # interface Node { ... }
│   │   ├── node.schema.ts              # const nodeSchema = z.object({ ... })
│   │   ├── node.builder.ts             # class NodeBuilder { ... }
│   │   └── index.ts
│   ├── workspace/
│   ├── export/
│   └── index.ts
│
├── fn/                             ◀── 纯函数（管道节点）
│   ├── node/
│   │   ├── node.parse.fn.ts            # 解析函数
│   │   ├── node.transform.fn.ts        # 转换函数
│   │   ├── node.validate.fn.ts         # 验证函数
│   │   └── index.ts
│   ├── export/
│   │   ├── export.pdf.fn.ts            # PDF 导出
│   │   ├── export.markdown.fn.ts       # Markdown 导出
│   │   └── index.ts
│   ├── search/
│   │   ├── search.filter.fn.ts
│   │   ├── search.sort.fn.ts
│   │   └── index.ts
│   └── index.ts
│
├── lib/                            ◀── 函数式工具库（使用 fp-ts）
│   ├── error.types.ts                  # AppError 类型定义
│   └── index.ts
│
├── db/                             ◀── 持久化函数
│   ├── database.ts                     # Dexie 实例
│   ├── node.db.fn.ts                   # saveNode, getNode, deleteNode
│   ├── workspace.db.fn.ts
│   ├── content.db.fn.ts
│   └── index.ts
│
├── stores/                         ◀── 状态函数
│   ├── editor.store.fn.ts              # 编辑器状态操作
│   ├── ui.store.fn.ts                  # UI 状态操作
│   ├── selection.store.fn.ts           # 选择状态操作
│   ├── settings.store.fn.ts            # 设置状态（持久化到 DB）
│   └── index.ts
│
├── hooks/                          ◀── React 绑定
│   ├── use-node.ts
│   ├── use-workspace.ts
│   ├── use-editor.ts
│   └── index.ts
│
└── components/                     ◀── UI 组件
    ├── file-tree/
    ├── editor/
    ├── sidebar/
    └── ui/
```


## 文件命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 接口定义 | `xxx.interface.ts` | `node.interface.ts` |
| Zod Schema | `xxx.schema.ts` | `node.schema.ts` |
| Builder | `xxx.builder.ts` | `node.builder.ts` |
| 纯函数 | `xxx.fn.ts` | `node.parse.fn.ts` |
| 数据库函数 | `xxx.db.fn.ts` | `node.db.fn.ts` |
| 状态函数 | `xxx.store.fn.ts` | `editor.store.fn.ts` |
| React Hook | `use-xxx.ts` | `use-node.ts` |
| React 组件 | `XxxComponent.tsx` | `FileTree.tsx` |

## 依赖关系图

```
                              types/
                         (Interface + Builder + Schema)
                                 │
                                 │ 被所有层依赖
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
    ┌────────┐              ┌────────┐              ┌────────┐
    │  lib/  │              │  db/   │              │ stores/│
    │  (FP)  │              │(持久化) │              │ (状态) │
    └────────┘              └────────┘              └────────┘
        │                        │                        │
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
                          ┌────────────┐
                          │    fn/     │
                          │  (纯函数)   │
                          └────────────┘
                                 │
                                 ▼
                          ┌────────────┐
                          │   hooks/   │
                          │ (React绑定) │
                          └────────────┘
                                 │
                                 ▼
                          ┌────────────┐
                          │components/ │
                          │   (UI)     │
                          └────────────┘
```

### 依赖规则

- `types/` → 无依赖（最底层）
- `lib/` → 只依赖 `types/`
- `db/` → 只依赖 `types/`
- `stores/` → 只依赖 `types/`
- `fn/` → 依赖 `types/`, `lib/`, `db/`, `stores/`
- `hooks/` → 依赖 `fn/`, `stores/`
- `components/` → 依赖 `hooks/`, `types/`

## 数据三层守卫

```
┌─────────────────────────────────────────────────────────────┐
│  第一层：Zod Schema (运行时校验)                              │
│  ─────────────────────────────────────                      │
│  • 校验外部数据的结构和类型                                   │
│  • 提供友好的错误信息                                        │
│  • 自动推断 TypeScript 类型                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  第二层：Interface (编译时类型)                               │
│  ─────────────────────────────────────                      │
│  • 静态类型检查                                              │
│  • IDE 智能提示                                              │
│  • 重构安全                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  第三层：Builder (构建约束)                                   │
│  ─────────────────────────────────────                      │
│  • 确保必填字段                                              │
│  • 链式调用的流畅 API                                        │
│  • 构建不可变对象                                            │
└─────────────────────────────────────────────────────────────┘
```

## Store ↔ DB 持久化关系

```
                    ┌─────────────────────────────────────────┐
                    │            Zustand Store                │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │         settings state          │    │
                    │  │                                 │    │
                    │  │  theme: "dark"                  │    │
                    │  │  language: "zh-CN"              │    │
                    │  │  autosave: true                 │    │
                    │  │  fontSize: 14                   │    │
                    │  └─────────────────────────────────┘    │
                    │                  │                      │
                    │                  │ persist middleware   │
                    │                  ▼                      │
                    └──────────────────┼──────────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                         ▼                           ▼
              ┌─────────────────┐         ┌─────────────────┐
              │   localStorage  │         │    IndexedDB    │
              │   (快速访问)     │         │   (大量数据)     │
              │                 │         │                 │
              │  • UI 状态      │         │  • 用户设置     │
              │  • 临时偏好     │         │  • 文档内容     │
              └─────────────────┘         │  • 工作区数据   │
                                          └─────────────────┘
```

### 数据持久化策略

| 状态 | 持久化位置 | 说明 |
|------|-----------|------|
| `editorState` | 不持久化 | 临时状态 |
| `uiState` | localStorage | 快速恢复 |
| `selectionState` | 不持久化 | 临时状态 |
| `settingsState` | IndexedDB | 用户设置需要长期保存 |

## 核心模式示例

### Interface + Builder + Schema

```typescript
// types/node/node.schema.ts - Zod 运行时校验
import { z } from "zod";

export const nodeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  type: z.enum(["file", "folder", "diary"]),
  parent: z.string().uuid().nullable(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

// 从 Zod 推断类型（保持单一数据源）
export type Node = z.infer<typeof nodeSchema>;

// types/node/node.builder.ts - Builder 构建
export class NodeBuilder {
  private data: Partial<Node> = {};
  
  id(v: string) { this.data.id = v; return this; }
  title(v: string) { this.data.title = v; return this; }
  type(v: Node["type"]) { this.data.type = v; return this; }
  parent(v: string | null) { this.data.parent = v; return this; }
  tags(v: string[]) { this.data.tags = v; return this; }
  
  from(node: Node) { this.data = { ...node }; return this; }
  
  build(): Node {
    return nodeSchema.parse(this.data);
  }
}
```

### 纯函数管道

```typescript
// 使用 fp-ts pipe
import { pipe } from "fp-ts/function";
import { NodeBuilder } from "@/types/node";

const enrichWithDefaults = (node: Node): Node =>
  new NodeBuilder().from(node).tags(node.tags || []).build();

const calculateMetadata = (node: Node): Node =>
  new NodeBuilder().from(node).build();

// 组合成管道
export const processNode = (node: Node): Node =>
  pipe(
    node,
    enrichWithDefaults,
    calculateMetadata
  );
```

### 表单输入流程

```typescript
// 1. FormBuilder 收集用户输入（草稿）
const draft = new NodeFormBuilder()
  .title(formData.title)
  .type(formData.type)
  .toDraft();

// 2. Zod 校验
const result = nodeSchema.safeParse(draft);
if (!result.success) {
  showErrors(result.error);
  return;
}

// 3. Builder 构建正式对象
const node = new NodeBuilder()
  .id(uuid())
  .title(result.data.title)
  .type(result.data.type)
  .createdAt(now())
  .build();

// 4. 进入管道处理
const processed = pipe(node, validate, enrich, format);

// 5. 持久化
await saveNode(processed);
```

## 角色对照表

| 概念 | 角色 | 特点 |
|-----|------|-----|
| **Interface** | 水的形状 | 定义数据长什么样 |
| **Builder** | 造水的模具 | 构建符合形状的数据 |
| **Zod Schema** | 守门员 | 运行时校验数据有效性 |
| **Function** | 管道 | 纯净、无副作用、可组合 |
| **Pipe** | 管道连接器 | 让数据流动起来 |
| **Store** | 水池 | 暂存运行时状态 |
| **DB** | 水库 | 持久化存储 |
| **Hook** | 水龙头 | 连接数据和 UI |
| **Component** | 喷泉 | 数据的最终展现 |
