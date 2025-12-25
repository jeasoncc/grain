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

## 文件命名规范

### 通用文件命名

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 接口定义 | `xxx.interface.ts` | `node.interface.ts` |
| Zod Schema | `xxx.schema.ts` | `node.schema.ts` |
| Builder | `xxx.builder.ts` | `node.builder.ts` |
| 纯函数 | `xxx.fn.ts` | `node.parse.fn.ts` |
| 数据库函数 | `xxx.db.fn.ts` | `node.db.fn.ts` |
| 状态 Store | `xxx.store.ts` | `editor.store.ts` |
| React Hook | `use-xxx.ts` | `use-node.ts` |
| Action 函数 | `xxx-yyy.action.ts` | `create-node.action.ts` |
| 测试文件 | `xxx.test.ts` | `node.fn.test.ts` |

### 组件文件命名

| 类型 | 命名格式 | 示例 | 说明 |
|------|---------|------|------|
| 纯函数式展示组件 | `xxx.view.fn.tsx` | `file-tree.view.fn.tsx` | 只接收 props，无副作用 |
| 纯函数式容器组件 | `xxx.container.fn.tsx` | `file-tree.container.fn.tsx` | 连接 hooks/stores |
| 组件类型定义 | `xxx.types.ts` | `file-tree.types.ts` | Props/State 类型 |
| 组件工具函数 | `xxx.utils.ts` | `file-tree.utils.ts` | 组件专用工具 |
| 组件测试 | `xxx.test.tsx` | `file-tree.view.fn.test.tsx` | 组件测试 |
| 路由组件 | `xxx.route.tsx` | `settings.route.tsx` | 路由定义 |

### 组件目录结构

```
components/
├── file-tree/                      # 组件目录
│   ├── file-tree.view.fn.tsx       # 纯函数式展示组件
│   ├── file-tree.container.fn.tsx  # 纯函数式容器组件
│   ├── file-tree.types.ts          # 类型定义
│   ├── file-tree.utils.ts          # 工具函数（可选）
│   ├── file-tree.test.tsx          # 测试文件（可选）
│   └── index.ts                    # 统一导出
│
├── editor-tabs/
│   ├── editor-tabs.view.fn.tsx
│   ├── editor-tabs.container.fn.tsx
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
