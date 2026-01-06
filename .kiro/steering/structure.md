# 项目结构

## Monorepo 布局

```
grain-editor-monorepo/
├── apps/
│   ├── desktop/          # Tauri 桌面应用（主应用）
│   ├── api-rust/         # Warp HTTP API 服务器
│   ├── web/              # Next.js 网站
│   ├── mobile/           # Expo React Native 应用
│   └── admin/            # 管理面板
├── packages/
│   ├── rust-core/        # Rust 核心库（共享业务逻辑）
│   └── editor/           # 共享 Lexical 编辑器包
├── docs/                 # 文档
└── scripts/              # 构建和发布脚本
```

## Desktop 应用结构 (`apps/desktop/src/`)

```
src/
├── types/                # 数据类型定义
│   ├── node/
│   ├── workspace/
│   ├── content/
│   └── ...
│
├── utils/                # 通用工具函数（纯函数）
│   ├── cn.util.ts
│   ├── date.util.ts
│   ├── keyboard.util.ts
│   └── ...
│
├── io/                   # IO 层（外部交互）
│   ├── api/              # Rust 后端 API
│   │   ├── node.api.ts
│   │   ├── workspace.api.ts
│   │   ├── content.api.ts
│   │   └── ...
│   ├── storage/          # 浏览器存储
│   │   └── settings.storage.ts
│   └── file/             # 文件系统
│       └── dialog.file.ts
│
├── pipes/                # 纯管道（业务数据转换）
│   ├── node/
│   ├── content/
│   ├── export/
│   ├── import/
│   ├── search/
│   ├── tag/
│   ├── wiki/
│   ├── word-count/
│   ├── writing/
│   ├── theme/
│   └── editor-tab/
│
├── state/                # Zustand 状态管理
│   ├── selection.state.ts
│   ├── editor-tabs.state.ts
│   ├── sidebar.state.ts
│   ├── theme.state.ts
│   ├── ui.state.ts
│   └── ...
│
├── flows/                # 业务流程（组合 pipes + io）
│   ├── workspace/
│   ├── node/
│   ├── export/
│   ├── import/
│   ├── save/
│   ├── templated/
│   └── ...
│
├── hooks/                # React 绑定层
│   ├── use-node.ts
│   ├── use-workspace.ts
│   ├── use-content.ts
│   ├── use-theme.ts
│   └── ...
│
├── queries/              # TanStack Query hooks（hooks 子模块）
│   ├── node.queries.ts
│   ├── workspace.queries.ts
│   └── ...
│
├── views/                # UI 组件
│   ├── ui/               # shadcn/ui 基础组件
│   ├── file-tree/
│   ├── editor-tabs/
│   ├── activity-bar/
│   ├── unified-sidebar/
│   ├── story-workspace/
│   └── ...
│
├── routes/               # 路由
│   ├── __root.tsx
│   ├── index.tsx
│   └── settings/
│
└── main.tsx              # 应用入口
```

## 兼容层（已废弃，待清理）

以下目录作为兼容层保留，新代码不应依赖：

```
src/
├── fn/                   # → 迁移到 pipes/, utils/, flows/, views/
├── components/           # → 迁移到 views/
├── actions/              # → 迁移到 flows/
├── stores/               # → 迁移到 state/
├── lib/                  # → 迁移到 utils/
├── db/                   # → 待迁移到 io/db/
└── log/                  # → 待迁移到 io/log/
```

## Rust Core 结构 (`packages/rust-core/src/`)

```
src/
├── types/                # 数据类型
│   ├── node/
│   │   ├── entity.rs     # 数据库实体
│   │   ├── request.rs    # API 请求
│   │   └── response.rs   # API 响应
│   └── workspace/
│
├── fn/                   # 纯函数
│   ├── node/
│   │   └── validate_fn.rs
│   └── workspace/
│
├── db/                   # 数据库操作
│   ├── node_db_fn.rs
│   └── workspace_db_fn.rs
│
└── tauri/                # Tauri Commands
    └── commands/
```

## 文件命名规范

| 目录 | 后缀 | 示例 |
|------|------|------|
| `io/api/` | `.api.ts` | `workspace.api.ts` |
| `io/storage/` | `.storage.ts` | `settings.storage.ts` |
| `io/file/` | `.file.ts` | `dialog.file.ts` |
| `pipes/` | `.pipe.ts` 或 `.fn.ts` | `tree.pipe.ts` |
| `flows/` | `.flow.ts` 或 `.action.ts` | `create-workspace.flow.ts` |
| `hooks/` | `use-*.ts` | `use-workspace.ts` |
| `queries/` | `*.queries.ts` | `node.queries.ts` |
| `views/` | `.view.fn.tsx` | `file-tree.view.fn.tsx` |
| `views/` (容器) | `.container.fn.tsx` | `activity-bar.container.fn.tsx` |
| `state/` | `.state.ts` | `selection.state.ts` |
| `utils/` | `.util.ts` | `date.util.ts` |
| `types/` | `.interface.ts` / `.schema.ts` | `node.interface.ts` |

## Import 别名

- `@/*` → `./src/*`
- `@grain/editor` → 共享编辑器包

## 依赖规则

```
views/     →  hooks/, state/, flows/, types/ (container 允许更多依赖)
hooks/     →  flows/, state/, queries/, types/
queries/   →  io/api/, types/ (TanStack Query 特例)
flows/     →  pipes/, io/, state/, types/
pipes/     →  utils/, types/
io/        →  types/
state/     →  types/, pipes/ (theme.state 特例)
utils/     →  types/
```
