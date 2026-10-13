# 技术栈

## Monorepo

- **包管理器**: Bun 1.4.2（workspace 隔离链接，统一根 `bun.lock`）
- **构建编排**: Turborepo
- **Node.js**: `^22.22.2 || ^24.15.0 || >=26.0.0`（CI: 24.21.0）
- **Bun**: >= 1.4.2（CI 固定 1.4.2）

## 核心技术

| 应用 | 框架 | 构建工具 | UI |
|-----|-----------|------------|-----|
| Desktop | Tauri 2.x + React 19 | Vite 8 | shadcn/ui + Tailwind 4 |
| Web | Next.js 16 | Next.js | shadcn/ui + Tailwind 4 |
| Admin | 历史 React 源码（无 package.json，不在当前构建工作区） | — | shadcn/ui + Tailwind 4 |

## 关键库

| 场景 | 库 |
|------|-----|
| 编辑器 | CodeMirror（Org 主链路）、Lexical（旧模式） |
| 状态管理 | Zustand + Immer |
| 数据获取 | TanStack Query |
| 持久化 | SQLite (Rust 后端) |
| 路由 | TanStack Router |
| 表单 | TanStack Form + Zod |
| UI 组件 | Radix UI, Lucide icons |
| 图表 | Mermaid 12（dagre/classic，原 loose 安全策略不变）, PlantUML |
| 画板 | Excalidraw |
| 代码检查 | Biome；Desktop/插件 ESLint 10，Web ESLint 9（Next 插件 peer 约束） |

TypeScript 固定 6.0.x：稳定 typescript-eslint 的 peer 范围为 `<6.1.0`，
声明文件构建仍依赖经典编译器 API，不能直接切换 TypeScript 7 原生编译器。
编辑器包使用 `unplugin-dts/vite`；Lexical 0.52、Tiptap 3、panels 4 已迁移实际消费者。
Mermaid 12 的 ES2024 原生 API 要求 Safari 17.4+；这不等同于已验证所有平台 WebView。

## 函数式编程库

| 库 | 用途 |
|---|------|
| **fp-ts** | 函数式核心 (pipe, Option, Either, TaskEither) |
| **es-toolkit** | 工具函数 (替代 lodash) |
| **Immer** | 不可变数据更新 |
| **Zod** | 运行时数据校验 |
| **dayjs** | 时间处理 |

## Rust 后端技术栈

最低 Rust 版本为 1.94.0；保留 SQLite、TLS、原生凭据和桌面功能。


| 场景 | 库 |
|------|-----|
| 框架 | Tauri 2.x |
| ORM | SeaORM 2 / sqlx 0.9 |
| 数据库 | SQLite |
| 序列化 | serde + serde_json |
| 异步运行时 | tokio |
| 错误处理 | thiserror |
| 日志 | tracing |
| HTTP | Warp 0.4 / Hyper 1（HTTP/1 + HTTP/2） |
| HTTP 客户端 | reqwest 0.13 |

## 常用命令

```bash
# 开发
bun run desktop:dev    # Desktop
bun run web:dev        # Web

# 构建
bun run build:prod:desktop  # Desktop 生产

# 检查
bun run lint           # Lint
bun run test           # 测试
```

---

## Steering 文件索引

### 始终加载（核心规范）

| 文件 | 内容 |
|------|------|
| `architecture.md` | 三层数据流架构 |
| `structure.md` | 目录结构 |
| `tech.md` | 技术栈（本文件） |
| `workflow.md` | 工作流程 |

### 手动加载（专项知识）

使用 `#steering-filename` 加载：

| 文件 | 场景 | 说明 |
|------|------|------|
| `#data-flow-frontend` | 前端数据流 | 同步/异步数据流、TaskEither |
| `#data-flow-backend` | 后端数据流 | Rust API 端点、宏生成 |
| `#data-flow-e2e` | 端到端数据流 | 完整请求路径、时序图 |
| `#code-standards` | 写代码时 | 代码规范、组件规范 |
| `#fp-patterns` | 函数式编程 | TaskEither、pipe 用法 |
| `#rust-backend` | Rust 开发 | Rust 后端规范 |
| `#design-patterns` | 重构/抽象 | 高阶函数、队列模式 |
| `#release` | 发布流程 | 版本发布 |
| `#troubleshooting` | 问题排查 | 常见问题 |
| `#decisions` | 技术决策 | 架构决策记录 |
| `#git-hooks` | Git 钩子 | 版本自动递增 |
| `#e2e-testing` | E2E 测试 | Puppeteer 测试规范 |
| `#product` | 产品概述 | 功能和平台介绍 |
