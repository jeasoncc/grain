# 后台管理系统（前端）

用于查看和管理网站访客信息的前端管理界面。

## 技术栈

- **前端框架**: React 19 + TypeScript
- **路由**: TanStack Router
- **数据获取**: TanStack Query
- **表格**: TanStack Table
- **UI 组件**: shadcn/ui + Radix UI
- **构建工具**: Vite
- **样式**: Tailwind CSS

## 项目结构

```
apps/admin/
├── src/
│   ├── app/            # TanStack Router 路由
│   ├── components/     # React 组件
│   ├── lib/           # 工具函数
│   ├── api/           # API 客户端
│   └── types/         # TypeScript 类型定义
├── index.html
└── package.json
```

## 快速开始

### 安装依赖

```bash
cd apps/admin
bun install
```

### 启动开发服务器

```bash
bun run dev
```

前端将在 `http://localhost:4000` 运行。

**注意**: 需要同时启动 API 服务器（`apps/api`），前端通过代理访问 API。

### 构建生产版本

```bash
bun run build
```

构建输出在 `dist/` 目录。

## API 代理配置

开发环境下，Vite 会自动将 `/api` 请求代理到 `http://localhost:4001`（API 服务器）。

生产环境需要配置 nginx 反向代理。

## 功能特性

- 🔄 访客列表查看（开发中）
- 📊 统计信息展示（开发中）
- 🔍 筛选和搜索（开发中）
- 📄 分页功能（开发中）

## 开发计划

- [ ] 完成访客列表页面
- [ ] 完成统计仪表板
- [ ] 添加数据导出功能
- [ ] 添加实时更新
- [ ] 添加用户认证

## 相关项目

- **API 服务器**: `../api` - 后端 API 服务（Elysia + Bun）
