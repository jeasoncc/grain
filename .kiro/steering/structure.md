# 项目结构

## Monorepo 布局

```
grain-editor-monorepo/
├── apps/
│   ├── desktop/          # Tauri 桌面应用（主应用）
│   ├── api-rust/         # Warp HTTP API 服务器（Rust）
│   ├── web/              # Next.js 网站
│   ├── mobile/           # Expo React Native 应用
│   ├── admin/            # 管理面板 (Vite + React)
│   └── api/              # Elysia API 服务器 (Bun) - 已弃用
├── packages/
│   ├── rust-core/        # Rust 核心库（共享业务逻辑）
│   └── editor/           # 共享 Lexical 编辑器包
├── docs/                 # 文档
├── scripts/              # 构建和发布脚本
├── aur/                  # Arch Linux AUR 包
├── flatpak/              # Flatpak 包
├── snap/                 # Snap 包
└── winget-manifests/     # Windows 包管理器清单
```

## Desktop 应用结构 (`apps/desktop/src/`)

```
src/
├── types/                # 数据定义层
│   ├── node/
│   │   ├── node.interface.ts
│   │   ├── node.schema.ts
│   │   ├── node.builder.ts
│   │   └── index.ts
│   ├── workspace/
│   └── export/
│
├── fn/                   # 纯函数层
│   ├── node/
│   │   ├── node.parse.fn.ts
│   │   ├── node.transform.fn.ts
│   │   └── index.ts
│   ├── export/
│   ├── search/
│   └── template/         # 模板生成函数
│       ├── template.diary.fn.ts
│       ├── template.wiki.fn.ts
│       └── index.ts
│
├── lib/                  # 函数式工具库
│   ├── error.types.ts
│   └── index.ts
│
├── db/                   # 持久化层（迁移中 → Rust 后端）
│   ├── database.ts
│   ├── node.db.fn.ts
│   └── workspace.db.fn.ts
│
├── stores/               # 状态层
│   ├── editor.store.ts
│   ├── ui.store.ts
│   └── selection.store.ts
│
├── actions/              # 业务操作层（独立于路由）
│   ├── node/
│   │   ├── create-node.action.ts
│   │   ├── delete-node.action.ts
│   │   └── index.ts
│   ├── workspace/
│   ├── templated/        # 模板化文件创建（高阶函数）
│   │   ├── create-templated-file.action.ts
│   │   ├── create-diary.action.ts    # 使用高阶函数
│   │   ├── create-wiki.action.ts     # 使用高阶函数
│   │   ├── create-excalidraw.action.ts  # Excalidraw 绘图
│   │   └── index.ts
│   └── index.ts
│
├── hooks/                # React 绑定层
│   ├── use-node.ts
│   └── use-workspace.ts
│
├── components/           # UI 组件层
│   ├── file-tree/       # 组件目录结构示例
│   │   ├── file-tree.view.fn.tsx      # 纯函数式展示组件
│   │   ├── file-tree.container.fn.tsx # 纯函数式容器组件
│   │   ├── file-tree.types.ts         # 组件类型定义
│   │   └── index.ts
│   ├── panels/
│   ├── blocks/
│   └── ui/              # shadcn/ui (不要修改)
│
└── routes/               # 路由层（仅路由定义）
    ├── __root.tsx
    ├── index.tsx
    └── settings/
```

## Rust 后端结构 (`apps/desktop/src-tauri/src/`)

> **注意**：Tauri 后端正在迁移到使用 `rust-core` 共享库。
> 重构完成后，`commands/` 目录将由宏自动生成。

```
src/
├── main.rs                    # 入口点
├── lib.rs                     # Tauri 应用配置 + 宏生成的 commands
│
├── commands/                  # Tauri Commands（将由宏生成）
│   ├── mod.rs
│   ├── workspace_commands.rs
│   ├── node_commands.rs
│   ├── content_commands.rs
│   ├── tag_commands.rs
│   ├── user_commands.rs
│   ├── attachment_commands.rs
│   ├── backup_commands.rs
│   └── file_commands.rs
│
├── db/                        # 本地数据库操作（调用 rust-core）
│   ├── mod.rs
│   ├── connection.rs         # 数据库连接
│   └── test_utils.rs         # 测试工具
│
├── fn/                        # 本地纯函数（调用 rust-core）
│   ├── mod.rs
│   ├── backup/               # 备份函数
│   ├── crypto/               # 加密函数
│   └── node/                 # 节点函数
│
├── types/                     # 本地类型定义（调用 rust-core）
│   ├── mod.rs
│   ├── error.rs              # AppError 定义
│   └── config.rs             # 配置结构体
│
└── bin/                       # 二进制工具
    └── test_db.rs            # 数据库测试工具
```

## Rust Core 共享库 (`packages/rust-core/src/`)

> **核心原则**：所有业务逻辑集中在 rust-core，Tauri 和 Warp 只是边界适配器。

```
src/
├── lib.rs                     # 库入口，导出所有模块
│
├── types/                     # 数据定义层（共享类型）
│   ├── mod.rs
│   ├── error.rs              # AppError、AppResult 定义
│   ├── config.rs             # 配置结构体
│   ├── workspace/            # Workspace 类型
│   │   ├── mod.rs
│   │   ├── workspace.rs      # Workspace 结构体
│   │   └── request.rs        # CreateWorkspaceRequest 等
│   ├── node/                 # Node 类型
│   │   ├── mod.rs
│   │   ├── node.rs           # Node 结构体
│   │   └── request.rs        # CreateNodeRequest 等
│   ├── content/              # Content 类型
│   ├── tag/                  # Tag 类型
│   ├── user/                 # User 类型
│   └── attachment/           # Attachment 类型
│
├── db/                        # 持久化层（数据库操作）
│   ├── mod.rs
│   ├── connection.rs         # 数据库连接管理
│   ├── test_utils.rs         # 测试工具
│   ├── workspace_db_fn.rs    # Workspace CRUD
│   ├── node_db_fn.rs         # Node CRUD
│   ├── content_db_fn.rs      # Content CRUD
│   ├── tag_db_fn.rs          # Tag CRUD
│   ├── user_db_fn.rs         # User CRUD
│   └── attachment_db_fn.rs   # Attachment CRUD
│
├── fn/                        # 纯函数层（业务逻辑）
│   ├── mod.rs
│   ├── node/                 # 节点相关函数
│   │   ├── mod.rs
│   │   ├── parse.rs          # 解析函数
│   │   ├── transform.rs      # 转换函数
│   │   └── validate.rs       # 校验函数
│   ├── crypto/               # 加密函数
│   │   ├── mod.rs
│   │   └── encrypt.rs
│   └── backup/               # 备份函数
│       ├── mod.rs
│       └── backup.rs
│
├── api/                       # API 端点定义（计划中）
│   ├── mod.rs                # ApiEndpoint trait 定义
│   ├── inputs.rs             # 通用输入类型
│   ├── workspace.rs          # Workspace 端点
│   ├── node.rs               # Node 端点
│   ├── content.rs            # Content 端点
│   ├── transaction.rs        # 事务端点
│   ├── tag.rs                # Tag 端点
│   ├── user.rs               # User 端点
│   ├── attachment.rs         # Attachment 端点
│   └── backup.rs             # Backup 端点
│
├── macros/                    # 宏定义（计划中）
│   ├── mod.rs                # warp_routes! 和 tauri_commands! 宏
│   └── rejection.rs          # Warp rejection 处理
│
└── tests/                     # 测试
    ├── mod.rs
    └── schema_consistency.rs # 数据库 schema 一致性测试
```

## Warp HTTP API 服务器 (`apps/api-rust/src/`)

> **注意**：正在迁移到使用 `rust-core` 宏生成。
> 重构完成后，`filters/` 和 `handlers/` 目录将被删除。

```
src/
├── main.rs                    # 入口点 + 路由注册（将使用宏）
├── rejection.rs               # 错误处理（将移至 rust-core）
│
├── filters/                   # Warp Filters（将由宏生成）
│   ├── mod.rs
│   ├── workspace_filters.rs
│   ├── node_filters.rs
│   ├── content_filters.rs
│   ├── tag_filters.rs
│   ├── user_filters.rs
│   ├── attachment_filters.rs
│   └── backup_filters.rs
│
└── handlers/                  # Warp Handlers（将由宏生成）
    ├── mod.rs
    ├── workspace_handlers.rs
    ├── node_handlers.rs
    ├── content_handlers.rs
    ├── tag_handlers.rs
    ├── user_handlers.rs
    ├── attachment_handlers.rs
    └── backup_handlers.rs
```

### 重构后的目标结构

重构完成后，api-rust 将简化为：

```
src/
├── main.rs                    # 入口点，使用 warp_routes! 宏
└── (无其他文件)               # 所有代码由宏从 rust-core 生成
```

Tauri 将简化为：

```
src/
├── main.rs                    # 入口点
├── lib.rs                     # 使用 tauri_commands! 宏
├── db/connection.rs           # 本地数据库连接
└── (无 commands/ 目录)        # 所有 commands 由宏生成
```

## 文件命名规范

### TypeScript 文件命名

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 接口定义 | `xxx.interface.ts` | `node.interface.ts` |
| Zod Schema | `xxx.schema.ts` | `node.schema.ts` |
| Builder | `xxx.builder.ts` | `node.builder.ts` |
| 纯函数 | `xxx.fn.ts` | `node.parse.fn.ts` |
| 数据库函数 | `xxx.db.fn.ts` | `node.db.fn.ts` |
| API 客户端 | `xxx.fn.ts` | `api-client.fn.ts` |
| 状态 Store | `xxx.store.ts` | `editor.store.ts` |
| React Hook | `use-xxx.ts` | `use-node.ts` |
| Action 函数 | `xxx-yyy.action.ts` | `create-node.action.ts` |
| 测试文件 | `xxx.test.ts` | `node.fn.test.ts` |

### Rust 文件命名

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 模块入口 | `mod.rs` | `types/mod.rs` |
| 类型定义 | `xxx.rs` | `workspace.rs` |
| 请求类型 | `request.rs` | `types/workspace/request.rs` |
| 数据库函数 | `xxx_db_fn.rs` | `workspace_db_fn.rs` |
| 纯函数 | `xxx.rs` | `parse.rs`, `transform.rs` |
| API 端点 | `xxx.rs` | `api/workspace.rs` |
| 测试文件 | `xxx.rs` | `tests/schema_consistency.rs` |
| 错误类型 | `error.rs` | `types/error.rs` |
| 配置 | `config.rs` | `types/config.rs` |

### 组件文件命名

| 类型 | 命名格式 | 示例 | 说明 |
|------|---------|------|------|
| 纯函数式展示组件 | `xxx.view.fn.tsx` | `file-tree.view.fn.tsx` | 只接收 props，无副作用 |
| 纯函数式容器组件 | `xxx.container.fn.tsx` | `file-tree.container.fn.tsx` | 连接 hooks/stores |
| 组件类型定义 | `xxx.types.ts` | `file-tree.types.ts` | Props/State 类型 |
| 组件工具函数 | `xxx.utils.ts` | `file-tree.utils.ts` | 组件专用工具 |
| View 组件测试 | `xxx.view.fn.test.tsx` | `file-tree.view.fn.test.tsx` | View 组件测试 |
| Container 组件测试 | `xxx.container.fn.test.tsx` | `file-tree.container.fn.test.tsx` | Container 组件测试 |
| 工具函数测试 | `xxx.utils.test.ts` | `file-tree.utils.test.ts` | 工具函数测试 |
| 路由组件 | `xxx.route.tsx` | `settings.route.tsx` | 路由定义 |

### 组件目录结构

```
components/
├── file-tree/                      # 组件目录
│   ├── file-tree.view.fn.tsx       # 纯函数式展示组件
│   ├── file-tree.view.fn.test.tsx  # View 组件测试
│   ├── file-tree.container.fn.tsx  # 纯函数式容器组件
│   ├── file-tree.container.fn.test.tsx  # Container 组件测试
│   ├── file-tree.types.ts          # 类型定义
│   ├── file-tree.utils.ts          # 工具函数（可选）
│   ├── file-tree.utils.test.ts     # 工具函数测试（可选）
│   └── index.ts                    # 统一导出
│
├── editor-tabs/
│   ├── editor-tabs.view.fn.tsx
│   ├── editor-tabs.view.fn.test.tsx
│   ├── editor-tabs.container.fn.tsx
│   ├── editor-tabs.container.fn.test.tsx
│   ├── editor-tabs.types.ts
│   └── index.ts
│
└── ui/                             # shadcn/ui（不修改）
```

### 组件命名规则

**`.fn.tsx` 后缀表示纯函数式组件：**
- 无 class 组件
- 使用 `memo()` 包裹
- 无内部业务状态（只允许 UI 状态如 isOpen、isHovered）
- 通过 props 接收所有数据和回调

**`.view.fn.tsx` - 纯展示组件：**
```typescript
// file-tree.view.fn.tsx
interface FileTreeViewProps {
  readonly nodes: TreeNode[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}

export const FileTreeView = memo(({ nodes, selectedId, onSelect }: FileTreeViewProps) => {
  // 只有 UI 状态
  const [isHovered, setIsHovered] = useState(false);
  return <div>...</div>;
});
```

**`.container.fn.tsx` - 容器组件：**
```typescript
// file-tree.container.fn.tsx
export const FileTreeContainer = memo(() => {
  // 连接 hooks 和 stores
  const nodes = useNodesByWorkspace(workspaceId);
  const { selectedId, setSelectedId } = useSelectionStore();
  
  return (
    <FileTreeView
      nodes={nodes}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
});
```

**`index.ts` - 统一导出：**
```typescript
// index.ts
export { FileTreeView } from './file-tree.view.fn';
export { FileTreeContainer } from './file-tree.container.fn';
export { FileTreeContainer as FileTree } from './file-tree.container.fn'; // 默认导出容器
export type { FileTreeViewProps, FileTreeContainerProps } from './file-tree.types';
```

## Import 别名

- `@/*` → `./src/*` (所有应用)
- `@grain/editor` → 共享编辑器包
