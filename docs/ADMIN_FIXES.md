# Admin 项目错误修复指南

## 已修复的问题

### 1. ✅ 路由目录结构
- 路由文件已正确放置在 `src/routes/` 目录
- 所有路由文件都已创建

### 2. ✅ Tailwind CSS 配置
- 已修复 `border-border` 错误
- 使用 Tailwind CSS v4 兼容的语法

### 3. ⚠️ 待解决的问题

#### 问题 1: 路由树生成文件缺失
**错误**: `Failed to resolve import "./routeTree.gen"`

**解决方案**: 
路由树文件会在启动开发服务器时自动生成。如果仍有问题，可以：

1. 确保路由文件在 `src/routes/` 目录
2. 清理并重启：
```bash
cd apps/admin
rm -rf src/routeTree.gen.ts .tanstack
bun run dev
```

#### 问题 2: 端口被占用
**错误**: `Port 4000 is already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :4000

# 或者修改 vite.config.ts 使用其他端口
```

## 项目结构

```
apps/admin/
├── src/
│   ├── routes/           # 路由文件（TanStack Router）
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── dashboard.tsx
│   │   └── visitors.tsx
│   ├── components/       # 组件
│   ├── api/             # API 客户端
│   ├── lib/             # 工具函数
│   └── types/           # 类型定义
└── vite.config.ts       # Vite 配置
```

## 快速启动

```bash
cd apps/admin

# 清理并重启
rm -rf src/routeTree.gen.ts .tanstack node_modules/.vite

# 启动开发服务器
bun run dev
```

路由树文件会在首次启动时自动生成。

