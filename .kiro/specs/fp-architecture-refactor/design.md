# Design Document

## 1. 现有架构分析

### 1.1 当前目录结构

```
apps/desktop/src/
├── db/                          # 数据库层（部分符合新架构）
│   ├── models/                  # 数据模型（已有 Interface + Builder + Schema）
│   │   ├── node/               # ✅ 已有完整模式
│   │   ├── workspace/          # ✅ 已有完整模式
│   │   ├── content/            # ✅ 已有完整模式
│   │   ├── drawing/            # ✅ 已有完整模式
│   │   ├── attachment/         # ✅ 已有完整模式
│   │   ├── user/               # ✅ 已有完整模式
│   │   ├── tag/                # ⚠️ 缺少 Builder 和 Schema
│   │   └── shared/             # 共享类型
│   ├── backup/                 # 备份服务
│   ├── clear-data/             # 清理服务
│   └── init/                   # 初始化服务
│
├── domain/                      # 领域逻辑（需要拆分迁移）
│   ├── diagram/                # 图表状态
│   ├── diary/                  # 日记服务
│   ├── editor-history/         # 编辑器历史
│   ├── editor-tabs/            # 编辑器标签页
│   ├── export/                 # 导出功能
│   ├── file-creator/           # 文件创建
│   ├── font/                   # 字体设置
│   ├── icon-theme/             # 图标主题
│   ├── import-export/          # 导入导出
│   ├── keyboard/               # 键盘快捷键
│   ├── save/                   # 保存功能
│   ├── search/                 # 搜索功能
│   ├── selection/              # 选择状态
│   ├── sidebar/                # 侧边栏状态
│   ├── theme/                  # 主题设置
│   ├── ui/                     # UI 状态
│   ├── updater/                # 更新器
│   ├── wiki/                   # Wiki 链接
│   └── writing/                # 写作模式
│
├── services/                    # 服务层（需要迁移）
│   ├── nodes.ts                # 节点服务
│   ├── workspaces.ts           # 工作区服务
│   ├── drawings.ts             # 绘图服务
│   └── tags.ts                 # 标签服务
│
├── hooks/                       # React Hooks（需要整合）
├── components/                  # UI 组件（需要纯化）
└── routes/                      # 路由组件（需要添加 actions）
```

### 1.2 现有模式分析

#### 已符合新架构的部分

1. **db/models/** - 已有 Interface + Builder + Schema 模式
   - `node.interface.ts` - 纯数据接口 ✅
   - `node.builder.ts` - Builder 模式 ✅
   - `node.schema.ts` - Zod 校验 ✅
   - `node.repository.ts` - 数据库操作 ✅
   - `node.hooks.ts` - Dexie React Hooks ✅

2. **domain/selection/** - 已使用 Zustand + Immer ✅

#### 需要改进的部分

1. **services/** - 混合了业务逻辑和数据库操作
2. **domain/** - Store 和 Service 混在一起
3. **hooks/** - 分散在多处
4. **components/** - 部分组件直接访问 Store


## 2. 目标架构设计

### 2.1 目标目录结构

```
apps/desktop/src/
├── types/                       # 类型定义层
│   ├── node/
│   │   ├── node.interface.ts
│   │   ├── node.schema.ts
│   │   ├── node.builder.ts
│   │   └── index.ts
│   ├── workspace/
│   ├── content/
│   ├── drawing/
│   ├── attachment/
│   ├── user/
│   ├── tag/
│   ├── editor-tab/
│   ├── selection/
│   ├── ui/
│   ├── theme/
│   ├── font/
│   ├── sidebar/
│   ├── save/
│   ├── search/
│   ├── export/
│   ├── shared/
│   └── index.ts
│
├── fn/                          # 纯函数层
│   ├── node/
│   │   ├── node.tree.fn.ts          # buildTree, getNodePath
│   │   ├── node.validate.fn.ts      # wouldCreateCycle
│   │   ├── node.transform.fn.ts     # 节点转换
│   │   └── index.ts
│   ├── content/
│   │   ├── content.parse.fn.ts      # Lexical 解析
│   │   ├── content.extract.fn.ts    # 提取纯文本
│   │   └── index.ts
│   ├── search/
│   │   ├── search.filter.fn.ts
│   │   ├── search.highlight.fn.ts
│   │   └── index.ts
│   ├── export/
│   │   ├── export.markdown.fn.ts
│   │   ├── export.docx.fn.ts
│   │   ├── export.json.fn.ts
│   │   └── index.ts
│   ├── import/
│   │   ├── import.parse.fn.ts
│   │   ├── import.validate.fn.ts
│   │   └── index.ts
│   ├── diary/
│   │   ├── diary.date.fn.ts
│   │   ├── diary.format.fn.ts
│   │   └── index.ts
│   ├── wiki/
│   │   ├── wiki.parse.fn.ts
│   │   ├── wiki.resolve.fn.ts
│   │   └── index.ts
│   ├── tag/
│   │   ├── tag.extract.fn.ts
│   │   ├── tag.format.fn.ts
│   │   └── index.ts
│   └── index.ts
│
├── lib/                         # 函数式工具库
│   ├── error.types.ts           # AppError 类型定义
│   ├── logger.ts                # 日志工具（已有 @/log）
│   └── index.ts
│
├── db/                          # 持久化层
│   ├── database.ts              # Dexie 实例
│   ├── schema.ts                # 数据库 Schema
│   ├── node.db.fn.ts
│   ├── workspace.db.fn.ts
│   ├── content.db.fn.ts
│   ├── drawing.db.fn.ts
│   ├── attachment.db.fn.ts
│   ├── user.db.fn.ts
│   ├── tag.db.fn.ts
│   ├── backup.db.fn.ts
│   ├── init.db.fn.ts
│   └── index.ts
│
├── stores/                      # 状态管理层
│   ├── selection.store.ts
│   ├── editor-tabs.store.ts
│   ├── editor-history.store.ts
│   ├── ui.store.ts
│   ├── sidebar.store.ts
│   ├── theme.store.ts
│   ├── font.store.ts
│   ├── save.store.ts
│   ├── search.store.ts
│   ├── diagram.store.ts
│   ├── writing.store.ts
│   └── index.ts
│
├── hooks/                       # React Hooks 层
│   ├── use-node.ts
│   ├── use-nodes.ts
│   ├── use-workspace.ts
│   ├── use-content.ts
│   ├── use-drawing.ts
│   ├── use-selection.ts
│   ├── use-editor-tabs.ts
│   ├── use-theme.ts
│   ├── use-font.ts
│   ├── use-sidebar.ts
│   ├── use-search.ts
│   ├── use-save.ts
│   ├── use-icon-theme.ts
│   ├── use-wiki-hover-preview.ts
│   └── index.ts
│
├── components/                  # 纯展示组件
│   ├── ui/                      # shadcn/ui（不修改）
│   ├── file-tree/
│   ├── editor/
│   ├── panels/
│   ├── blocks/
│   ├── drawing/
│   ├── export/
│   ├── workspace/
│   └── ...
│
├── routes/                      # 路由编排层
│   ├── index.tsx
│   ├── __root.tsx
│   ├── canvas.tsx
│   ├── settings.tsx
│   ├── settings/
│   │   ├── actions/
│   │   │   ├── update-theme.action.ts
│   │   │   ├── update-font.action.ts
│   │   │   └── index.ts
│   │   └── ...
│   └── ...
│
└── log/                         # 日志模块（保留）
    └── index.ts
```


## 3. 模块迁移映射表

### 3.1 db/models/ → types/ + db/

| 源文件 | 目标位置 | 说明 |
|--------|----------|------|
| `db/models/node/node.interface.ts` | `types/node/node.interface.ts` | 移动 |
| `db/models/node/node.schema.ts` | `types/node/node.schema.ts` | 移动 |
| `db/models/node/node.builder.ts` | `types/node/node.builder.ts` | 移动 |
| `db/models/node/node.repository.ts` | `db/node.db.fn.ts` | 重构为纯函数 |
| `db/models/node/node.hooks.ts` | `hooks/use-node.ts` | 移动并整合 |
| `db/models/node/node.utils.ts` | `fn/node/node.tree.fn.ts` | 移动 |
| `db/models/workspace/*` | 同上模式 | 同上 |
| `db/models/content/*` | 同上模式 | 同上 |
| `db/models/drawing/*` | 同上模式 | 同上 |
| `db/models/attachment/*` | 同上模式 | 同上 |
| `db/models/user/*` | 同上模式 | 同上 |
| `db/models/tag/*` | 同上模式 | 需补充 Builder/Schema |
| `db/models/shared/*` | `types/shared/*` | 移动 |

### 3.2 domain/ → types/ + stores/ + fn/

| 源文件 | 目标位置 | 说明 |
|--------|----------|------|
| **diagram/** | | |
| `diagram.interface.ts` | `types/diagram/diagram.interface.ts` | 移动 |
| `diagram.store.ts` | `stores/diagram.store.ts` | 移动 |
| `diagram.utils.ts` | `fn/diagram/diagram.fn.ts` | 重构为纯函数 |
| **diary/** | | |
| `diary.service.ts` | `fn/diary/diary.fn.ts` | 重构为纯函数 |
| `diary.utils.ts` | `fn/diary/diary.date.fn.ts` | 移动 |
| **editor-history/** | | |
| `editor-history.interface.ts` | `types/editor-history/editor-history.interface.ts` | 移动 |
| `editor-history.store.ts` | `stores/editor-history.store.ts` | 移动 |
| `editor-history.utils.ts` | `fn/editor-history/editor-history.fn.ts` | 重构 |
| **editor-tabs/** | | |
| `editor-tabs.interface.ts` | `types/editor-tab/editor-tab.interface.ts` | 移动 |
| `editor-tabs.builder.ts` | `types/editor-tab/editor-tab.builder.ts` | 移动 |
| `editor-tabs.store.ts` | `stores/editor-tabs.store.ts` | 移动 |
| `editor-tabs.utils.ts` | `fn/editor-tab/editor-tab.fn.ts` | 重构 |
| **export/** | | |
| `export.service.ts` | `fn/export/export.*.fn.ts` | 拆分为多个纯函数 |
| `export.utils.ts` | `fn/export/export.format.fn.ts` | 移动 |
| `export-path.service.ts` | `fn/export/export.path.fn.ts` | 重构 |
| **file-creator/** | | |
| `file-creator.service.ts` | `routes/*/actions/create-node.action.ts` | 迁移到 actions |
| **font/** | | |
| `font.interface.ts` | `types/font/font.interface.ts` | 移动 |
| `font.store.ts` | `stores/font.store.ts` | 移动 |
| **icon-theme/** | | |
| `icon-theme.interface.ts` | `types/icon-theme/icon-theme.interface.ts` | 移动 |
| `icon-theme.config.ts` | `types/icon-theme/icon-theme.config.ts` | 移动 |
| `icon-theme.store.ts` | `stores/icon-theme.store.ts` | 移动 |
| `icon-theme.utils.ts` | `fn/icon-theme/icon-theme.fn.ts` | 重构 |
| **import-export/** | | |
| `import-export.service.ts` | `fn/import/import.fn.ts` + `fn/export/export.fn.ts` | 拆分 |
| `import-export.utils.ts` | `fn/import/import.validate.fn.ts` | 移动 |
| **keyboard/** | | |
| `keyboard.service.ts` | `hooks/use-keyboard.ts` | 重构为 Hook |
| **save/** | | |
| `save.interface.ts` | `types/save/save.interface.ts` | 移动 |
| `save.store.ts` | `stores/save.store.ts` | 移动 |
| `save.service.ts` | `fn/save/save.fn.ts` | 重构 |
| `save.utils.ts` | `fn/save/save.debounce.fn.ts` | 移动 |
| **search/** | | |
| `search.service.ts` | `fn/search/search.fn.ts` | 重构 |
| `search.utils.ts` | `fn/search/search.highlight.fn.ts` | 移动 |
| **selection/** | | |
| `selection.interface.ts` | `types/selection/selection.interface.ts` | 移动 |
| `selection.store.ts` | `stores/selection.store.ts` | 移动（已符合） |
| **sidebar/** | | |
| `sidebar.interface.ts` | `types/sidebar/sidebar.interface.ts` | 移动 |
| `sidebar.store.ts` | `stores/sidebar.store.ts` | 移动 |
| **theme/** | | |
| `theme.interface.ts` | `types/theme/theme.interface.ts` | 移动 |
| `theme.store.ts` | `stores/theme.store.ts` | 移动 |
| `theme.utils.ts` | `fn/theme/theme.fn.ts` | 重构 |
| **ui/** | | |
| `ui.interface.ts` | `types/ui/ui.interface.ts` | 移动 |
| `ui.store.ts` | `stores/ui.store.ts` | 移动 |
| **updater/** | | |
| `updater.service.ts` | `fn/updater/updater.fn.ts` | 重构 |
| **wiki/** | | |
| `wiki.service.ts` | `fn/wiki/wiki.resolve.fn.ts` | 重构 |
| `wiki-migration.service.ts` | `fn/wiki/wiki.migrate.fn.ts` | 重构 |
| **writing/** | | |
| `writing.interface.ts` | `types/writing/writing.interface.ts` | 移动 |
| `writing.store.ts` | `stores/writing.store.ts` | 移动 |
| `writing.utils.ts` | `fn/writing/writing.fn.ts` | 重构 |

### 3.3 services/ → db/ + fn/ + routes/actions/

| 源文件 | 目标位置 | 说明 |
|--------|----------|------|
| `nodes.ts` | | 拆分 |
| - CRUD 操作 | `db/node.db.fn.ts` | 数据库函数 |
| - 树操作函数 | `fn/node/node.tree.fn.ts` | 纯函数 |
| - moveNode | `routes/*/actions/move-node.action.ts` | Action |
| - createNode | `routes/*/actions/create-node.action.ts` | Action |
| - deleteNode | `routes/*/actions/delete-node.action.ts` | Action |
| - Hooks 导出 | `hooks/use-node.ts` | 整合 |
| `workspaces.ts` | 同上模式 | 同上 |
| `drawings.ts` | 同上模式 | 同上 |
| `tags.ts` | 同上模式 | 同上 |

### 3.4 db/backup/, db/clear-data/, db/init/ → db/

| 源文件 | 目标位置 | 说明 |
|--------|----------|------|
| `backup/backup.service.ts` | `db/backup.db.fn.ts` | 重构为纯函数 |
| `clear-data/clear-data.service.ts` | `db/clear-data.db.fn.ts` | 重构为纯函数 |
| `init/db-init.service.ts` | `db/init.db.fn.ts` | 重构为纯函数 |

### 3.5 hooks/ → hooks/（整合）

| 源文件 | 目标位置 | 说明 |
|--------|----------|------|
| `use-drawing-workspace.ts` | `hooks/use-drawing.ts` | 整合 |
| `use-icon-theme.ts` | `hooks/use-icon-theme.ts` | 保留 |
| `use-manual-save.ts` | `hooks/use-save.ts` | 整合 |
| `use-mobile.ts` | `hooks/use-mobile.ts` | 保留 |
| `use-settings.ts` | `hooks/use-settings.ts` | 保留 |
| `use-theme.ts` | `hooks/use-theme.ts` | 保留 |
| `use-wiki-hover-preview.ts` | `hooks/use-wiki-hover-preview.ts` | 保留 |


## 4. 核心模块详细设计

### 4.1 types/ 层设计

每个类型模块包含三个文件：

```typescript
// types/node/node.interface.ts
export interface NodeInterface {
  readonly id: string;
  readonly workspace: string;
  readonly parent: string | null;
  readonly type: NodeType;
  readonly title: string;
  readonly order: number;
  readonly collapsed?: boolean;
  readonly createDate: string;
  readonly lastEdit: string;
  readonly tags?: string[];
}

// types/node/node.schema.ts
import { z } from "zod";

export const NodeSchema = z.object({
  id: z.string().uuid(),
  workspace: z.string().uuid(),
  parent: z.string().uuid().nullable(),
  type: z.enum(["folder", "file", "canvas", "diary"]),
  title: z.string().min(1).max(200),
  order: z.number().int().min(0),
  collapsed: z.boolean().optional(),
  createDate: z.string().datetime(),
  lastEdit: z.string().datetime(),
  tags: z.array(z.string()).optional(),
});

export type Node = z.infer<typeof NodeSchema>;

// types/node/node.builder.ts
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { NodeSchema, type Node } from "./node.schema";

export class NodeBuilder {
  private data: Partial<Node> = {};

  constructor() {
    const now = dayjs().toISOString();
    this.data = {
      id: uuidv4(),
      parent: null,
      type: "file",
      title: "New Node",
      order: 0,
      collapsed: true,
      createDate: now,
      lastEdit: now,
    };
  }

  workspace(v: string): this { this.data.workspace = v; return this; }
  parent(v: string | null): this { this.data.parent = v; return this; }
  type(v: Node["type"]): this { this.data.type = v; return this; }
  title(v: string): this { this.data.title = v; return this; }
  order(v: number): this { this.data.order = v; return this; }
  collapsed(v: boolean): this { this.data.collapsed = v; return this; }
  tags(v: string[]): this { this.data.tags = v; return this; }

  from(node: Node): this {
    this.data = { ...node };
    return this;
  }

  build(): Node {
    this.data.lastEdit = dayjs().toISOString();
    return Object.freeze(NodeSchema.parse(this.data)) as Node;
  }
}
```

### 4.2 fn/ 层设计

纯函数使用 fp-ts pipe 组合：

```typescript
// fn/node/node.tree.fn.ts
import { pipe } from "fp-ts/function";
import * as A from "fp-ts/Array";
import * as O from "fp-ts/Option";
import type { Node } from "@/types/node";

/**
 * 构建树形结构
 */
export const buildTree = (nodes: Node[], parentId: string | null = null): TreeNode[] =>
  pipe(
    nodes,
    A.filter((n) => n.parent === parentId),
    A.sort((a, b) => a.order - b.order),
    A.map((node) => ({
      ...node,
      children: buildTree(nodes, node.id),
    }))
  );

/**
 * 获取节点路径
 */
export const getNodePath = (nodes: Node[], nodeId: string): Node[] => {
  const path: Node[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const node = pipe(
      nodes,
      A.findFirst((n) => n.id === currentId),
      O.toNullable
    );
    if (!node) break;
    path.unshift(node);
    currentId = node.parent;
  }

  return path;
};

/**
 * 检查是否会创建循环引用
 */
export const wouldCreateCycle = (
  nodes: Node[],
  nodeId: string,
  newParentId: string | null
): boolean => {
  if (newParentId === null) return false;
  if (nodeId === newParentId) return true;

  let currentId: string | null = newParentId;
  while (currentId) {
    if (currentId === nodeId) return true;
    const parent = pipe(
      nodes,
      A.findFirst((n) => n.id === currentId),
      O.map((n) => n.parent),
      O.toNullable
    );
    currentId = parent;
  }

  return false;
};
```

### 4.3 db/ 层设计

数据库函数返回 Either 类型：

```typescript
// db/node.db.fn.ts
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import dayjs from "dayjs";
import { database } from "./database";
import { NodeBuilder, type Node } from "@/types/node";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";

/**
 * 保存节点
 */
export const saveNode = (node: Node): TE.TaskEither<AppError, Node> =>
  TE.tryCatch(
    async () => {
      logger.info("[DB] 保存节点:", node.id);
      await database.nodes.put(node);
      logger.success("[DB] 节点保存成功:", node.id);
      return node;
    },
    (error): AppError => ({
      type: "DB_ERROR",
      message: `保存节点失败: ${error}`,
    })
  );

/**
 * 获取节点
 */
export const getNode = (id: string): TE.TaskEither<AppError, Node | undefined> =>
  TE.tryCatch(
    async () => {
      logger.info("[DB] 获取节点:", id);
      return database.nodes.get(id);
    },
    (error): AppError => ({
      type: "DB_ERROR",
      message: `获取节点失败: ${error}`,
    })
  );

/**
 * 删除节点
 */
export const deleteNode = (id: string): TE.TaskEither<AppError, void> =>
  TE.tryCatch(
    async () => {
      logger.info("[DB] 删除节点:", id);
      await database.nodes.delete(id);
      logger.success("[DB] 节点删除成功:", id);
    },
    (error): AppError => ({
      type: "DB_ERROR",
      message: `删除节点失败: ${error}`,
    })
  );

/**
 * 获取工作区所有节点
 */
export const getNodesByWorkspace = (
  workspaceId: string
): TE.TaskEither<AppError, Node[]> =>
  TE.tryCatch(
    async () => {
      logger.info("[DB] 获取工作区节点:", workspaceId);
      return database.nodes.where("workspace").equals(workspaceId).toArray();
    },
    (error): AppError => ({
      type: "DB_ERROR",
      message: `获取工作区节点失败: ${error}`,
    })
  );
```

### 4.4 stores/ 层设计

使用 Zustand + Immer：

```typescript
// stores/selection.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { SelectionState } from "@/types/selection";
import logger from "@/log";

interface SelectionStore extends SelectionState {
  setWorkspaceId: (id: string | null) => void;
  setNodeId: (id: string | null) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionStore>()(
  persist(
    immer((set) => ({
      workspaceId: null,
      nodeId: null,

      setWorkspaceId: (id) => {
        logger.info("[Store] 设置工作区:", id);
        set((state) => {
          state.workspaceId = id;
          state.nodeId = null;
        });
      },

      setNodeId: (id) => {
        logger.info("[Store] 设置节点:", id);
        set((state) => {
          state.nodeId = id;
        });
      },

      clear: () => {
        logger.info("[Store] 清除选择");
        set((state) => {
          state.workspaceId = null;
          state.nodeId = null;
        });
      },
    })),
    { name: "grain-selection" }
  )
);
```

### 4.5 hooks/ 层设计

整合 Dexie Hooks 和 Store Hooks：

```typescript
// hooks/use-node.ts
import { useLiveQuery } from "dexie-react-hooks";
import { database } from "@/db/database";
import type { Node } from "@/types/node";

/**
 * 获取单个节点
 */
export const useNode = (nodeId: string | null): Node | undefined => {
  return useLiveQuery(
    () => (nodeId ? database.nodes.get(nodeId) : undefined),
    [nodeId]
  );
};

/**
 * 获取工作区所有节点
 */
export const useNodesByWorkspace = (workspaceId: string | null): Node[] => {
  return useLiveQuery(
    () =>
      workspaceId
        ? database.nodes.where("workspace").equals(workspaceId).toArray()
        : [],
    [workspaceId],
    []
  );
};

/**
 * 获取子节点
 */
export const useChildNodes = (parentId: string | null): Node[] => {
  return useLiveQuery(
    () =>
      parentId
        ? database.nodes.where("parent").equals(parentId).sortBy("order")
        : database.nodes.where("parent").equals("").toArray(),
    [parentId],
    []
  );
};
```

### 4.6 routes/actions/ 层设计

Action 函数独立文件：

```typescript
// routes/nodes/actions/create-node.action.ts
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { NodeBuilder, type Node, type NodeType } from "@/types/node";
import { saveNode, getNextOrder } from "@/db/node.db.fn";
import { saveContent } from "@/db/content.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";

interface CreateNodeParams {
  workspaceId: string;
  parentId: string | null;
  type: NodeType;
  title: string;
  content?: string;
}

/**
 * 创建新节点
 */
export const createNode = (
  params: CreateNodeParams
): TE.TaskEither<AppError, Node> => {
  logger.start("[Node] 创建节点...");

  return pipe(
    getNextOrder(params.parentId, params.workspaceId),
    TE.chain((order) => {
      const node = new NodeBuilder()
        .workspace(params.workspaceId)
        .parent(params.parentId)
        .type(params.type)
        .title(params.title)
        .order(order)
        .build();

      return saveNode(node);
    }),
    TE.chainFirst((node) => {
      if (params.type !== "folder") {
        return saveContent(node.id, params.content || "");
      }
      return TE.right(undefined);
    }),
    TE.tap((node) => {
      logger.success("[Node] 节点创建成功:", node.id);
      return TE.right(node);
    })
  );
};
```

```typescript
// routes/nodes/actions/delete-node.action.ts
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { deleteNodeWithChildren } from "@/db/node.db.fn";
import type { AppError } from "@/lib/error.types";
import logger from "@/log";

/**
 * 删除节点及其子节点
 */
export const deleteNode = (nodeId: string): TE.TaskEither<AppError, void> => {
  logger.start("[Node] 删除节点:", nodeId);

  return pipe(
    deleteNodeWithChildren(nodeId),
    TE.tap(() => {
      logger.success("[Node] 节点删除成功:", nodeId);
      return TE.right(undefined);
    })
  );
};
```


## 5. 组件纯化设计

### 5.1 组件分层原则

```
Route Component (路由组件)
├── 使用 hooks 获取数据
├── 调用 actions 执行操作
└── 通过 props 传递给展示组件

Presentation Component (展示组件)
├── 只接收 props
├── 只有 UI 状态 (isOpen, isHovered)
└── 通过回调函数通知父组件
```

### 5.2 示例：FileTree 组件纯化

```typescript
// components/file-tree/FileTree.tsx - 纯展示组件
import { memo } from "react";
import type { Node } from "@/types/node";

interface FileTreeProps {
  readonly nodes: Node[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onExpand: (id: string, expanded: boolean) => void;
  readonly onRename: (id: string, title: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onMove: (id: string, parentId: string | null, index: number) => void;
}

export const FileTree = memo(({
  nodes,
  selectedId,
  onSelect,
  onExpand,
  onRename,
  onDelete,
  onMove,
}: FileTreeProps) => {
  // 只有 UI 状态
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  return (
    <div className="file-tree">
      {/* 渲染树形结构 */}
    </div>
  );
});
```

```typescript
// routes/index.tsx - 路由组件（编排层）
import { FileTree } from "@/components/file-tree/FileTree";
import { useNodesByWorkspace } from "@/hooks/use-node";
import { useSelectionStore } from "@/stores/selection.store";
import { buildTree } from "@/fn/node/node.tree.fn";
import {
  createNode,
  deleteNode,
  moveNode,
  renameNode,
} from "./actions";

export const IndexRoute = () => {
  // 获取数据
  const workspaceId = useSelectionStore((s) => s.workspaceId);
  const selectedNodeId = useSelectionStore((s) => s.nodeId);
  const nodes = useNodesByWorkspace(workspaceId);
  const tree = useMemo(() => buildTree(nodes), [nodes]);

  // 获取 actions
  const setNodeId = useSelectionStore((s) => s.setNodeId);

  // 事件处理（只调用，不实现）
  const handleSelect = (id: string) => setNodeId(id);
  const handleDelete = (id: string) => deleteNode(id)();
  const handleRename = (id: string, title: string) => renameNode(id, title)();
  const handleMove = (id: string, parentId: string | null, index: number) =>
    moveNode(id, parentId, index)();

  return (
    <FileTree
      nodes={tree}
      selectedId={selectedNodeId}
      onSelect={handleSelect}
      onDelete={handleDelete}
      onRename={handleRename}
      onMove={handleMove}
    />
  );
};
```

## 6. 错误处理设计

### 6.1 AppError 类型定义

```typescript
// lib/error.types.ts
export type AppError =
  | { type: "VALIDATION_ERROR"; message: string; field?: string }
  | { type: "DB_ERROR"; message: string }
  | { type: "NOT_FOUND"; message: string; id?: string }
  | { type: "CYCLE_ERROR"; message: string }
  | { type: "EXPORT_ERROR"; message: string }
  | { type: "IMPORT_ERROR"; message: string };

export const isValidationError = (e: AppError): e is { type: "VALIDATION_ERROR"; message: string } =>
  e.type === "VALIDATION_ERROR";

export const isDbError = (e: AppError): e is { type: "DB_ERROR"; message: string } =>
  e.type === "DB_ERROR";
```

### 6.2 错误处理流程

```typescript
// 在 Action 中处理错误
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { toast } from "sonner";

const handleCreateNode = async () => {
  const result = await createNode(params)();

  pipe(
    result,
    E.match(
      (error) => {
        logger.error("[Node] 创建失败:", error);
        toast.error(error.message);
      },
      (node) => {
        logger.success("[Node] 创建成功:", node.id);
        toast.success("节点创建成功");
      }
    )
  );
};
```

## 7. 测试设计

### 7.1 测试文件组织

```
fn/node/
├── node.tree.fn.ts
├── node.tree.fn.test.ts       # 单元测试
├── node.validate.fn.ts
└── node.validate.fn.test.ts   # 单元测试

routes/nodes/actions/
├── create-node.action.ts
├── create-node.action.test.ts # 单元测试
├── delete-node.action.ts
└── delete-node.action.test.ts # 单元测试
```

### 7.2 测试示例

```typescript
// fn/node/node.tree.fn.test.ts
import { describe, it, expect } from "vitest";
import { fc } from "fast-check";
import { buildTree, getNodePath, wouldCreateCycle } from "./node.tree.fn";

describe("buildTree", () => {
  it("should build tree from flat nodes", () => {
    const nodes = [
      { id: "1", parent: null, order: 0, title: "Root" },
      { id: "2", parent: "1", order: 0, title: "Child" },
    ];
    const tree = buildTree(nodes);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
  });

  it("should sort by order", () => {
    const nodes = [
      { id: "1", parent: null, order: 1, title: "Second" },
      { id: "2", parent: null, order: 0, title: "First" },
    ];
    const tree = buildTree(nodes);
    expect(tree[0].title).toBe("First");
    expect(tree[1].title).toBe("Second");
  });
});

describe("wouldCreateCycle - property based", () => {
  it("should never allow node to be its own parent", () => {
    fc.assert(
      fc.property(fc.uuid(), (nodeId) => {
        const nodes = [{ id: nodeId, parent: null }];
        return wouldCreateCycle(nodes, nodeId, nodeId) === true;
      })
    );
  });

  it("should allow moving to null parent", () => {
    fc.assert(
      fc.property(fc.uuid(), (nodeId) => {
        const nodes = [{ id: nodeId, parent: "other" }];
        return wouldCreateCycle(nodes, nodeId, null) === false;
      })
    );
  });
});
```


## 8. 迁移阶段规划

### Phase 1: 基础设施（优先级：高）

1. 安装依赖：fp-ts, es-toolkit, @tanstack/react-virtual, million
2. 创建 `lib/error.types.ts`
3. 创建 `types/` 目录结构

### Phase 2: 类型层迁移（优先级：高）

1. 迁移 `db/models/*/` → `types/*/`
2. 补充缺失的 Builder 和 Schema（tag）
3. 更新所有 import 路径

### Phase 3: 纯函数层创建（优先级：高）

1. 迁移 `db/models/*/utils.ts` → `fn/*/`
2. 迁移 `domain/*/utils.ts` → `fn/*/`
3. 迁移 `services/*.ts` 中的纯函数 → `fn/*/`
4. 为每个纯函数创建测试文件

### Phase 4: 数据库层重构（优先级：中）

1. 迁移 `db/models/*/repository.ts` → `db/*.db.fn.ts`
2. 重构为返回 Either 类型
3. 添加日志记录
4. 迁移 `db/backup/`, `db/clear-data/`, `db/init/`

### Phase 5: 状态层迁移（优先级：中）

1. 迁移 `domain/*/store.ts` → `stores/*.store.ts`
2. 确保使用 Zustand + Immer
3. 添加日志记录

### Phase 6: Hooks 层整合（优先级：中）

1. 迁移 `db/models/*/hooks.ts` → `hooks/use-*.ts`
2. 整合 `hooks/` 目录
3. 整合 `domain/*/` 中的 hooks

### Phase 7: Actions 层创建（优先级：中）

1. 从 `services/*.ts` 提取业务操作 → `routes/*/actions/`
2. 从 `domain/*/service.ts` 提取操作 → `routes/*/actions/`
3. 为每个 action 创建测试文件

### Phase 8: 组件纯化（优先级：低）

1. 审查所有组件，移除直接 Store/DB 访问
2. 添加 props 接口
3. 更新路由组件为编排层

### Phase 9: 清理（优先级：低）

1. 删除 `domain/` 目录
2. 删除 `services/` 目录
3. 删除 `db/models/` 目录
4. 更新所有 import 路径
5. 运行 lint 和类型检查

## 9. 依赖关系约束

```
┌─────────────────────────────────────────────────────────────┐
│                        禁止依赖方向                          │
├─────────────────────────────────────────────────────────────┤
│  types/    ←──────────────────────────────────────────────  │
│     ↑                                                       │
│  lib/      ←──────────────────────────────────────────────  │
│     ↑                                                       │
│  db/       ←──────────────────────────────────────────────  │
│     ↑                                                       │
│  stores/   ←──────────────────────────────────────────────  │
│     ↑                                                       │
│  fn/       ←──────────────────────────────────────────────  │
│     ↑                                                       │
│  hooks/    ←──────────────────────────────────────────────  │
│     ↑                                                       │
│  components/ ←────────────────────────────────────────────  │
│     ↑                                                       │
│  routes/   ←──────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────┘

规则：
- 上层可以依赖下层
- 下层不能依赖上层
- 同层之间可以相互依赖（谨慎使用）
```

## 10. 文件命名规范总结

| 类型 | 命名格式 | 位置 | 示例 |
|------|---------|------|------|
| Interface | `xxx.interface.ts` | `types/xxx/` | `node.interface.ts` |
| Schema | `xxx.schema.ts` | `types/xxx/` | `node.schema.ts` |
| Builder | `xxx.builder.ts` | `types/xxx/` | `node.builder.ts` |
| 纯函数 | `xxx.yyy.fn.ts` | `fn/xxx/` | `node.tree.fn.ts` |
| 数据库函数 | `xxx.db.fn.ts` | `db/` | `node.db.fn.ts` |
| Store | `xxx.store.ts` | `stores/` | `selection.store.ts` |
| Hook | `use-xxx.ts` | `hooks/` | `use-node.ts` |
| Action | `xxx-yyy.action.ts` | `routes/*/actions/` | `create-node.action.ts` |
| 测试 | `*.test.ts` | 与源文件同目录 | `node.tree.fn.test.ts` |
| 组件 | `XxxYyy.tsx` | `components/xxx/` | `FileTree.tsx` |
| 路由 | `xxx.tsx` | `routes/` | `index.tsx` |

