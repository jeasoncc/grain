# Project Structure

## Monorepo Layout

```
grain-editor-monorepo/
├── apps/
│   ├── desktop/          # Tauri desktop app (main application)
│   ├── web/              # Next.js marketing/landing site
│   ├── mobile/           # Expo React Native app
│   ├── admin/            # Admin panel (Vite + React)
│   └── api/              # Elysia API server (Bun)
├── packages/
│   └── editor/           # Shared Lexical editor package
├── docs/                 # Documentation
├── scripts/              # Build and release scripts
├── aur/                  # Arch Linux AUR package files
├── flatpak/              # Flatpak package files
├── snap/                 # Snap package files
└── winget-manifests/     # Windows Package Manager manifests
```

## Desktop App Structure (`apps/desktop/src/`)

```
src/
├── types/                # Interface + Builder + Zod Schema
│   ├── node/
│   │   ├── node.interface.ts
│   │   ├── node.schema.ts
│   │   ├── node.builder.ts
│   │   └── index.ts
│   ├── workspace/
│   └── export/
│
├── fn/                   # 纯函数（管道节点）
│   ├── node/
│   │   ├── node.parse.fn.ts
│   │   ├── node.transform.fn.ts
│   │   └── index.ts
│   ├── export/
│   └── search/
│
├── lib/                  # 函数式工具库
│   ├── pipe.fn.ts
│   ├── result.fn.ts
│   └── option.fn.ts
│
├── db/                   # 持久化函数
│   ├── database.ts
│   ├── node.db.fn.ts
│   └── workspace.db.fn.ts
│
├── stores/               # 状态函数
│   ├── editor.store.fn.ts
│   ├── ui.store.fn.ts
│   └── selection.store.fn.ts
│
├── actions/              # 业务操作函数（独立于路由）
│   ├── node/
│   │   ├── create-node.action.ts
│   │   ├── delete-node.action.ts
│   │   ├── rename-node.action.ts
│   │   ├── move-node.action.ts
│   │   └── index.ts
│   ├── workspace/
│   │   ├── create-workspace.action.ts
│   │   └── index.ts
│   ├── drawing/
│   │   ├── create-drawing.action.ts
│   │   └── index.ts
│   └── index.ts
│
├── hooks/                # React 绑定
│   ├── use-node.ts
│   └── use-workspace.ts
│
├── components/           # UI 组件
│   ├── blocks/
│   ├── ui/              # shadcn/ui (do not modify)
│   ├── panels/
│   └── file-tree/
│
└── routes/               # TanStack Router（仅路由定义）
    ├── __root.tsx
    ├── index.tsx
    ├── node.$nodeId.tsx
    └── settings/
```

## Shared Editor Package (`packages/editor/src/`)

```
src/
├── components/           # Editor React components
├── nodes/                # Custom Lexical nodes (mention, tag)
├── plugins/              # Lexical plugins
├── themes/               # Editor themes and CSS
└── types/                # TypeScript types
```

## Data Architecture

- **Types**: Interface + Builder + Zod Schema（数据定义层）
- **Functions**: 纯函数管道（数据处理层）
- **DB**: Dexie/IndexedDB（持久化层）
- **Stores**: Zustand（运行时状态层）
- **Actions**: 业务操作函数（业务逻辑层）
- **Hooks**: React 绑定（响应式层）
- **Routes**: TanStack Router（路由层，仅定义路由）

## File Naming Conventions

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
| 路由组件 | `xxx.route.tsx` | `nodes.route.tsx` |
| Action 函数 | `xxx-yyy.action.ts` | `create-node.action.ts` |

## Import Aliases

- `@/*` → `./src/*` (in all apps)
- `@grain/editor` → shared editor package
