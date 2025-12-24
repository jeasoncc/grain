# 项目结构

## Monorepo 布局

```
grain-editor-monorepo/
├── apps/
│   ├── desktop/          # Tauri 桌面应用（主应用）
│   ├── web/              # Next.js 网站
│   ├── mobile/           # Expo React Native 应用
│   ├── admin/            # 管理面板 (Vite + React)
│   └── api/              # Elysia API 服务器 (Bun)
├── packages/
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
├── db/                   # 持久化层
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
│   ├── drawing/
│   ├── templated/        # 模板化文件创建（高阶函数）
│   │   ├── create-templated-file.action.ts
│   │   ├── create-diary.action.ts    # 使用高阶函数
│   │   ├── create-wiki.action.ts     # 使用高阶函数
│   │   └── index.ts
│   └── index.ts
│
├── hooks/                # React 绑定层
│   ├── use-node.ts
│   └── use-workspace.ts
│
├── components/           # UI 组件层
│   ├── blocks/
│   ├── ui/              # shadcn/ui (不要修改)
│   ├── panels/
│   └── file-tree/
│
└── routes/               # 路由层（仅路由定义）
    ├── __root.tsx
    ├── index.tsx
    └── settings/
```

## 文件命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 接口定义 | `xxx.interface.ts` | `node.interface.ts` |
| Zod Schema | `xxx.schema.ts` | `node.schema.ts` |
| Builder | `xxx.builder.ts` | `node.builder.ts` |
| 纯函数 | `xxx.fn.ts` | `node.parse.fn.ts` |
| 数据库函数 | `xxx.db.fn.ts` | `node.db.fn.ts` |
| 状态 Store | `xxx.store.ts` | `editor.store.ts` |
| React Hook | `use-xxx.ts` | `use-node.ts` |
| React 组件 | `XxxComponent.tsx` | `FileTree.tsx` |
| 路由组件 | `xxx.route.tsx` | `nodes.route.tsx` |
| Action 函数 | `xxx-yyy.action.ts` | `create-node.action.ts` |
| 测试文件 | `xxx.test.ts` | `node.fn.test.ts` |

## Import 别名

- `@/*` → `./src/*` (所有应用)
- `@grain/editor` → 共享编辑器包
