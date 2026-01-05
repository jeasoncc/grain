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
│   │   ├── node.interface.ts
│   │   ├── node.schema.ts
│   │   └── index.ts
│   └── workspace/
│
├── fn/                   # 纯函数层（无副作用）
│   ├── node/
│   │   ├── node.parse.fn.ts
│   │   └── node.transform.fn.ts
│   ├── search/
│   └── template/
│
├── repo/                 # 数据访问层（Tauri invoke）
│   ├── node.repo.fn.ts
│   ├── workspace.repo.fn.ts
│   └── content.repo.fn.ts
│
├── actions/              # 业务逻辑层
│   ├── node/
│   │   ├── create-node.action.ts
│   │   └── delete-node.action.ts
│   └── workspace/
│
├── hooks/                # React 绑定层
│   ├── use-node.ts
│   └── use-workspace.ts
│
├── stores/               # Zustand 状态
│   ├── selection.store.ts
│   └── editor-tabs.store.ts
│
├── components/           # UI 组件
│   ├── file-tree/
│   ├── editor/
│   └── ui/              # shadcn/ui
│
├── lib/                  # 工具库
│   └── error.types.ts
│
└── routes/               # 路由
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

| 类型 | TypeScript | Rust |
|------|-----------|------|
| 纯函数 | `xxx.fn.ts` | `xxx_fn.rs` |
| 数据库函数 | - | `xxx_db_fn.rs` |
| 接口 | `xxx.interface.ts` | `entity.rs` |
| Schema | `xxx.schema.ts` | `request.rs` |
| Action | `xxx.action.ts` | - |
| Hook | `use-xxx.ts` | - |
| Store | `xxx.store.ts` | - |
| 组件 | `xxx.view.fn.tsx` | - |
| 容器 | `xxx.container.fn.tsx` | - |

## Import 别名

- `@/*` → `./src/*`
- `@grain/editor` → 共享编辑器包
