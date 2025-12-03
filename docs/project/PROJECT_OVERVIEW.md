# Novel Editor Monorepo - 项目概览

## 📊 项目状态

✅ **Monorepo 迁移完成**  
✅ **官网创建完成**  
✅ **开发环境配置完成**  
✅ **文档编写完成**

## 🏗️ 架构

```
novel-editor-monorepo/
│
├── apps/
│   ├── desktop/              # Tauri 桌面应用
│   │   ├── src/              # React 前端
│   │   ├── src-tauri/        # Rust 后端
│   │   └── package.json
│   │
│   └── web/                  # Next.js 官网
│       ├── src/app/          # 页面
│       ├── src/components/   # 组件
│       └── package.json
│
├── packages/                 # 共享包 (预留)
│
├── scripts/                  # 开发脚本
│   └── dev.sh               # 快速启动脚本
│
├── turbo.json               # Turborepo 配置
├── package.json             # 根配置
└── bun.lock                 # 依赖锁文件
```

## 🎯 两个主要项目

### 1. 桌面应用 (`apps/desktop`)

**技术栈**:
- Tauri 2.x (Rust)
- React 19
- TypeScript
- Lexical Editor
- Dexie.js (IndexedDB)
- TanStack Router & Query
- Tailwind CSS 4
- Shadcn UI

**功能**:
- 富文本编辑器
- 项目管理 (书籍/章节/场景)
- 全局搜索
- 自动备份
- 多格式导出
- 离线优先

**启动**: `bun desktop:dev`  
**访问**: http://localhost:1420

### 2. 官网 (`apps/web`)

**技术栈**:
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide Icons

**页面**:
- 首页 (Hero + 功能展示)
- 下载区域 (多平台)
- 响应式设计
- 深色模式

**启动**: `bun web:dev`  
**访问**: http://localhost:3000

## 🚀 快速命令

```bash
# 安装依赖
bun install

# 开发
bun web:dev          # 启动官网
bun desktop:dev      # 启动桌面应用
bun dev              # 启动所有

# 构建
bun build            # 构建所有项目

# 代码质量
bun lint             # 检查代码
bun format           # 格式化
bun check            # 类型检查

# 使用脚本
./scripts/dev.sh     # 交互式启动
```

## 📚 文档索引

| 文档 | 说明 |
|------|------|
| [README.md](./README.md) | 项目总览 |
| [QUICKSTART.md](./QUICKSTART.md) | 5分钟快速开始 |
| [SETUP.md](./SETUP.md) | 详细设置指南 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 部署指南 |
| [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) | 迁移完成总结 |
| [apps/desktop/README.md](./apps/desktop/README.md) | 桌面应用文档 |
| [apps/web/README.md](./apps/web/README.md) | 官网文档 |

## 🎨 官网预览

官网包含以下部分：

1. **导航栏**
   - Logo + 项目名
   - 功能、下载、文档、GitHub 链接

2. **Hero 区域**
   - 大标题和副标题
   - 主要 CTA 按钮 (下载 + GitHub)

3. **功能展示**
   - 6 个核心功能卡片
   - 图标 + 标题 + 描述

4. **下载区域**
   - Linux (AppImage, DEB, RPM)
   - Windows (MSI, EXE)
   - macOS (DMG)

5. **页脚**
   - 版权信息
   - 快速链接

## 🔧 技术特性

### Monorepo 优势
- ✅ 统一依赖管理
- ✅ 代码共享
- ✅ 统一构建流程
- ✅ 更好的协作

### Turborepo 特性
- ✅ 智能缓存
- ✅ 并行构建
- ✅ 增量构建
- ✅ 远程缓存支持

### Bun 优势
- ✅ 超快的包管理
- ✅ 内置 TypeScript 支持
- ✅ 兼容 Node.js
- ✅ 统一的工具链

## 📈 下一步计划

### 立即可做
1. ✅ 测试官网: `bun web:dev`
2. ✅ 测试桌面应用: `bun desktop:dev`
3. ⏳ 添加更多截图到官网
4. ⏳ 更新下载链接

### 短期 (本周)
- [ ] 完善官网内容
- [ ] 添加更多页面 (文档、博客)
- [ ] 构建桌面应用发布版
- [ ] 设置 GitHub Actions

### 中期 (本月)
- [ ] 提取共享包
- [ ] 添加分析统计
- [ ] SEO 优化
- [ ] 社交媒体推广

### 长期 (季度)
- [ ] 建立社区
- [ ] 插件系统
- [ ] 模板市场
- [ ] 用户反馈系统

## 🎉 成就解锁

- ✅ Monorepo 架构搭建完成
- ✅ 官网从零到一创建完成
- ✅ 开发环境配置完成
- ✅ 完整文档体系建立
- ✅ 使用现代化技术栈
- ✅ 支持多平台部署

## 💡 提示

1. **开发时**: 使用 `bun web:dev` 或 `bun desktop:dev` 单独启动项目，速度更快
2. **构建时**: 使用 `bun build` 构建所有项目，Turborepo 会智能缓存
3. **部署时**: 官网可以部署到 Vercel/Netlify，桌面应用使用 GitHub Actions
4. **文档**: 所有文档都在根目录，随时查阅

## 🤝 贡献

欢迎贡献！请查看各个子项目的 README 了解详情。

## 📞 支持

- GitHub Issues: 报告问题
- GitHub Discussions: 讨论和建议
- 文档: 查看完整文档

---

**祝你的项目推广顺利！** 🚀
