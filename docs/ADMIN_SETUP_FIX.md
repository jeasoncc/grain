# Admin 项目设置修复指南

## 当前错误

1. **TanStack Router 路由目录问题**
   - 错误: `ENOENT: no such file or directory, scandir '/home/lotus/project/book2/novel-editor/apps/admin/src/routes'`
   - 原因: TanStack Router 默认查找 `src/routes`，但路由文件在 `src/app`

2. **路由树生成文件缺失**
   - 错误: `Failed to resolve import "./routeTree.gen"`
   - 原因: 路由生成器还没有运行

3. **Tailwind CSS 配置问题**
   - 错误: `Cannot apply unknown utility class 'border-border'`
   - 原因: Tailwind CSS v4 的语法变更

## 解决方案

### 方法 1: 使用 TanStack Router 默认目录结构

将路由文件从 `src/app` 移动到 `src/routes`：

```bash
cd apps/admin
mv src/app src/routes
```

然后更新 `vite.config.ts`：
```typescript
tanstackRouter({
  target: 'react',
  // 移除 routesDirectory，使用默认的 src/routes
  autoCodeSplitting: true,
}),
```

### 方法 2: 修复当前配置（推荐）

保持 `src/app` 目录，但需要：

1. 确保 vite.config.ts 配置正确：
```typescript
tanstackRouter({
  target: 'react',
  routesDirectory: './src/app',
  generatedRouteTree: './src/routeTree.gen.ts',
  autoCodeSplitting: true,
}),
```

2. 修复 Tailwind CSS - 已在 index.css 中修复

3. 重启开发服务器，让路由生成器运行

## 快速修复步骤

```bash
cd /home/lotus/project/book2/novel-editor/apps/admin

# 1. 清理旧文件
rm -rf src/routeTree.gen.ts .tanstack

# 2. 确保路由文件存在
ls -la src/app/*.tsx

# 3. 重启开发服务器（会自动生成路由树）
bun run dev
```

## 如果端口被占用

```bash
# 查找占用 4000 端口的进程
lsof -i :4000

# 或者使用其他端口
# 修改 vite.config.ts 中的 port: 4001
```

