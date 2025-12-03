# ⚡ 快速参考

## 🚀 常用命令

```bash
# 开发
bun web:dev          # 启动官网 (http://localhost:3000)
bun desktop:dev      # 启动桌面应用 (http://localhost:1420)
bun dev              # 启动所有项目

# 构建
bun build            # 构建所有项目
bun turbo run build --filter=web      # 只构建官网
bun turbo run build --filter=desktop  # 只构建桌面应用

# 代码质量
bun lint             # 检查代码
bun format           # 格式化代码
bun check            # 类型检查
```

## 📁 项目结构

```
novel-editor-monorepo/
├── apps/
│   ├── desktop/     # 桌面应用
│   └── web/         # 官网
├── packages/        # 共享包
└── scripts/         # 脚本
```

## 🔗 重要文件

| 文件 | 说明 |
|------|------|
| `package.json` | 根配置 + workspaces |
| `turbo.json` | Turborepo 配置 |
| `apps/web/src/app/page.tsx` | 官网首页 |
| `apps/desktop/package.json` | 桌面应用配置 |

## 📚 文档导航

| 文档 | 用途 |
|------|------|
| [START_HERE.md](./START_HERE.md) | 🚀 开始指南 |
| [SUCCESS_SUMMARY.md](./SUCCESS_SUMMARY.md) | 🎉 完成总结 |
| [QUICKSTART.md](./QUICKSTART.md) | ⚡ 快速开始 |
| [SETUP.md](./SETUP.md) | 🔧 详细设置 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 🚢 部署指南 |

## 🎯 快速任务

### 测试官网
```bash
bun web:dev
# 访问 http://localhost:3000
```

### 自定义首页
```bash
# 编辑这个文件
apps/web/src/app/page.tsx
```

### 添加截图
```bash
# 放到这个目录
apps/web/public/
```

### 构建桌面应用
```bash
cd apps/desktop
bun tauri build
```

### 部署官网
```bash
cd apps/web
bun build
# 输出在 out/ 目录
```

## 🔧 故障排除

### 端口被占用
官网会自动使用下一个可用端口 (3001, 3002...)

### 依赖问题
```bash
rm -rf node_modules
bun install
```

### 构建失败
```bash
bun clean
bun install
bun build
```

## 💡 提示

- 使用 `bun web:dev` 而不是 `bun dev` 可以更快启动
- Turborepo 会缓存构建结果，加快后续构建
- 官网使用静态导出，可以部署到任何静态托管
- 桌面应用支持 Linux、Windows、macOS

## 🎊 下一步

1. ✅ 测试官网: `bun web:dev`
2. ✅ 自定义内容
3. ✅ 添加截图
4. ✅ 部署上线

---

**需要帮助？查看 [START_HERE.md](./START_HERE.md)**
