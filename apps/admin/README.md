# 后台管理系统

完整的访客管理后台，包含登录、仪表板和访客列表功能。

## 功能特性

- 🔐 用户登录认证
- 📊 统计仪表板（总访客、今日访客、本周/本月访客、独立IP）
- 📋 访客列表（分页、搜索、排序）
- 🎨 现代化 UI（使用 shadcn/ui）
- 📱 响应式设计

## 技术栈

- **React 19** + **TypeScript**
- **TanStack Router** - 路由管理
- **TanStack Query** - 数据获取和缓存
- **TanStack Table** - 表格组件
- **shadcn/ui** - UI 组件库
- **Tailwind CSS** - 样式

## 快速开始

### 安装依赖

```bash
cd apps/admin
bun install
```

### 配置环境变量

复制 `.env.example` 并配置 API 地址：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
VITE_API_URL=http://localhost:4001/api
```

### 启动开发服务器

```bash
bun run dev
```

前端将在 `http://localhost:4000` 运行。

## 登录信息

默认登录凭证：
- 用户名: `admin`
- 密码: `admin123`

## 项目结构

```
src/
├── api/              # API 客户端
│   └── client.ts
├── app/              # 路由页面
│   ├── __root.tsx    # 根路由
│   ├── index.tsx     # 首页（重定向）
│   ├── login.tsx     # 登录页
│   ├── dashboard.tsx # 仪表板
│   └── visitors.tsx  # 访客列表
├── components/       # 组件
│   ├── ui/          # shadcn UI 组件
│   └── layout/      # 布局组件
├── lib/             # 工具函数
│   ├── auth.ts      # 认证逻辑
│   └── utils.ts     # 通用工具
├── types/           # TypeScript 类型
└── hooks/           # React Hooks
```

## 页面说明

### 登录页面 (`/login`)
- 用户登录表单
- 认证状态检查
- 自动重定向

### 仪表板 (`/dashboard`)
- 显示统计信息卡片
- 自动刷新数据（30秒）
- 响应式布局

### 访客列表 (`/visitors`)
- 表格展示访客信息
- IP 地址搜索
- 分页功能
- 实时数据

## 构建生产版本

```bash
bun run build
```

构建输出在 `dist/` 目录。

## 相关项目

- **API 服务器**: `../api` - 后端 API 服务
