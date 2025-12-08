# Admin 项目错误修复总结

## 已修复的错误

### 1. ✅ TanStack Router 路由目录问题

**错误**: `ENOENT: no such file or directory, scandir '/home/lotus/project/book2/novel-editor/apps/admin/src/routes'`

**原因**: TanStack Router 插件在查找路由文件

**解决**: 
- 路由文件已正确放置在 `src/routes/` 目录
- vite.config.ts 已配置正确的路由目录

### 2. ✅ 路由树生成文件缺失

**错误**: `Failed to resolve import "./routeTree.gen"`

**原因**: 路由树文件还未生成

**解决**: 
- 清理了旧的 routeTree.gen.ts 文件
- 路由树会在启动开发服务器时自动生成

### 3. ✅ Tailwind CSS 配置错误

**错误**: `Cannot apply unknown utility class 'border-border'`

**原因**: Tailwind CSS v4 的语法变更

**解决**: 
- 更新了 `src/index.css` 文件
- 使用兼容的 CSS 变量语法

### 4. ✅ 端口占用问题

**错误**: `Port 4000 is already in use`

**解决**: 
- 设置 `strictPort: false` 允许使用其他端口

## 当前项目结构

```
apps/admin/
├── src/
│   ├── routes/              # 路由文件（TanStack Router）
│   │   ├── __root.tsx
│   │   ├── index.tsx        # 首页重定向
│   │   ├── login.tsx        # 登录页
│   │   ├── dashboard.tsx    # 仪表板
│   │   └── visitors.tsx     # 访客列表
│   ├── components/          # React 组件
│   ├── api/                 # API 客户端
│   ├── lib/                 # 工具函数和认证
│   └── types/               # TypeScript 类型
└── vite.config.ts
```

## 启动步骤

### 1. 清理缓存（推荐）

```bash
cd /home/lotus/project/book2/novel-editor/apps/admin
bash ../../scripts/fix-admin-dev.sh
```

### 2. 启动开发服务器

```bash
bun run dev
```

路由树文件会在首次启动时自动生成。

### 3. 如果端口被占用

可以：
- 等待几秒让 Vite 自动选择其他端口
- 或者手动指定端口：修改 `vite.config.ts` 中的 `port: 4001`

## 验证

启动成功后，你应该看到：
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:4000/
```

访问 http://localhost:4000 应该能看到登录页面。

## 默认登录信息

- 用户名: `admin`
- 密码: `admin123`

