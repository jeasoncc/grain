# 技术栈

## Monorepo

- **包管理器**: bun (with workspaces)
- **构建编排**: Turborepo
- **Node.js**: >= 20
- **Bun**: >= 1.1.0

## 核心技术

| 应用 | 框架 | 构建工具 | UI |
|-----|-----------|------------|-----|
| Desktop | Tauri 2.x + React 19 | Vite 7 | shadcn/ui + Tailwind 4 |
| Web | Next.js 15 | Next.js | shadcn/ui + Tailwind 4 |
| Mobile | Expo + React Native | Expo | Custom |
| Admin | React 19 | Vite 7 | shadcn/ui + Tailwind 4 |
| API | Elysia | Bun | - |

## 关键库

| 场景 | 库 |
|------|-----|
| 编辑器 | Lexical |
| 状态管理 | Zustand + Immer |
| 持久化 | Dexie (IndexedDB) |
| 路由 | TanStack Router |
| 表单 | TanStack Form + Zod |
| UI 组件 | Radix UI, Lucide icons |
| 图表 | Mermaid, PlantUML |
| 画板 | Excalidraw |
| 代码检查 | Biome |

## 函数式编程库

| 库 | 用途 |
|---|------|
| **fp-ts** | 函数式核心 (pipe, Option, Either, Task) |
| **es-toolkit** | 工具函数 (替代 lodash) |
| **Immer** | 不可变数据更新 |
| **Zod** | 运行时数据校验 |
| **dayjs** | 时间处理 |

## 性能库

| 库 | 用途 |
|---|------|
| **Million.js** | React 编译优化 |
| **@tanstack/react-virtual** | 虚拟列表 |

## 常用命令

```bash
# 安装依赖
bun install

# 开发
bun run desktop:dev    # Desktop
bun run web:dev        # Web
bun run admin:dev      # Admin
bun run api:dev        # API

# 构建
bun run build                    # 全部
bun run build:prod:desktop       # Desktop 生产

# 检查
bun run lint           # Lint
bun run format         # 格式化
bun run check          # 类型检查
bun run test           # 测试

# 版本发布
bun run version:bump   # 递增版本
bun run tag:desktop    # 创建 Desktop tag
```

## Steering 文件使用

### 始终加载（核心规范）

| 文件 | 内容 |
|------|------|
| `architecture.md` | 数据流架构 |
| `structure.md` | 目录结构 |
| `tech.md` | 技术栈（本文件） |
| `code-standards.md` | 代码规范 |
| `workflow.md` | 工作流程 |

### 手动加载（专项知识）

使用 `#steering-filename` 加载：

| 文件 | 场景 |
|------|------|
| `#fp-patterns` | 函数式编程开发 |
| `#design-patterns` | 代码重构/抽象 |
| `#e2e-testing` | E2E 测试 |
| `#release` | 发布流程 |
| `#git-hooks` | 版本/Hooks 问题 |
| `#troubleshooting` | 问题排查 |
| `#decisions` | 技术决策 |
| `#product` | 产品定义 |
