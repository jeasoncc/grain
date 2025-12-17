# Grain 品牌重命名指南

## 📋 概述

本项目已从 "Novel Editor（小说编辑器）" 重命名为 "Grain（小麦）"，以更好地反映我们对通用写作和知识管理的关注。

**英文名**: Grain  
**中文名**: 小麦  
**定位**: 通用写作工具（长文写作、知识管理、创意表达）

---

## ✅ 已完成的更改

### 1. 项目配置文件
- ✅ `package.json` - 更新为 `grain-editor-monorepo`
- ✅ `apps/desktop/src-tauri/tauri.conf.json` - 产品名改为 `grain`
- ✅ `apps/desktop/src-tauri/Cargo.toml` - Rust 包名改为 `grain`
- ✅ `apps/desktop/index.html` - 页面标题改为 "小麦 - Grain"
- ✅ `README.md` 和 `README.zh-CN.md` - 完全重写

### 2. 应用标识
- ✅ Bundle ID: `com.lotus.grain`
- ✅ 窗口标题: "小麦 - Grain"
- ✅ 产品名: `grain`

### 3. Snap 配置
- ✅ 新的 `snap/snapcraft.yaml` 文件
- ✅ 包名: `grain-editor`
- ✅ 命令: `grain`

---

## 📦 发布策略

### 选项 A：创建新应用（推荐）⭐

**优点**:
- 品牌清晰，避免用户困惑
- 可以同时维护两个版本一段时间
- 新应用有新的开始

**缺点**:
- 失去现有评分和下载量
- 需要重新建立用户基础

**实施步骤**:

#### Snap Store
1. 注册新的 snap 名称: `grain-editor`
2. 上传新的 snap 包
3. 在旧的 `novel-editor-app` 描述中添加弃用通知:
   ```
   ⚠️ 注意：本应用已更名为 "Grain"
   请安装新版本：sudo snap install grain-editor
   ```
4. 保留旧版本 3-6 个月，然后下架

#### Windows Store
1. 创建新的应用提交
2. 应用名称: "Grain" 或 "小麦 - Grain"
3. 包标识符: 使用新的 `com.lotus.grain`
4. 在旧应用描述中添加通知
5. 保留旧版本 3-6 个月

### 选项 B：更新现有应用

**优点**:
- 保留现有用户和评分
- 无需重新建立用户基础

**缺点**:
- 可能导致用户困惑
- 需要审核批准
- 品牌不够清晰

**实施步骤**:

#### Snap Store
1. 更新 `snapcraft.yaml` 中的描述
2. 添加迁移说明
3. 提交更新

#### Windows Store
1. 更新应用名称和描述
2. 提交审核（可能需要额外说明）

---

## 🚀 推荐的发布流程

### 第一阶段：准备（1-2 周）

1. **更新代码库**
   ```bash
   # 已完成
   - 更新所有配置文件
   - 更新 README
   - 更新文档
   ```

2. **测试构建**
   ```bash
   # 本地测试
   bun run desktop:dev
   
   # 生产构建测试
   bun run build:prod:desktop
   ```

3. **更新 GitHub 仓库**
   ```bash
   # 如果需要，重命名仓库
   # GitHub Settings → Repository name → grain-editor
   
   # 更新所有链接和引用
   ```

### 第二阶段：发布新应用（2-4 周）

#### Snap Store

1. **注册新名称**
   ```bash
   snapcraft register grain-editor
   ```

2. **构建并上传**
   ```bash
   # 构建 snap
   snapcraft
   
   # 上传到 edge channel 测试
   snapcraft upload --release=edge grain-editor_0.1.80_amd64.snap
   
   # 测试通过后发布到 stable
   snapcraft release grain-editor 1 stable
   ```

3. **更新旧应用**
   - 在 `novel-editor-app` 的描述中添加迁移通知
   - 提供安装新版本的命令

#### Windows Store

1. **创建新应用**
   - 登录 [Partner Center](https://partner.microsoft.com/)
   - 创建新应用提交
   - 应用名称: "Grain" 或 "小麦"
   - 上传新的 MSIX 包

2. **准备应用商店资源**
   - 更新截图
   - 更新应用描述
   - 更新图标

3. **提交审核**
   - 提交新应用
   - 等待审核（通常 1-3 天）

### 第三阶段：迁移用户（3-6 个月）

1. **通知现有用户**
   - 在旧应用中添加更新通知
   - 发布博客文章说明更名原因
   - 社交媒体公告

2. **保持旧版本可用**
   - 继续维护旧版本 3-6 个月
   - 修复关键 bug
   - 不添加新功能

3. **监控迁移进度**
   - 跟踪新应用下载量
   - 收集用户反馈
   - 调整策略

### 第四阶段：完成迁移（6 个月后）

1. **下架旧应用**
   - Snap: 从 stable channel 移除
   - Windows Store: 停止分发

2. **清理**
   - 归档旧文档
   - 更新所有外部链接
   - 更新社区资源

---

## 📝 需要更新的其他地方

### 代码中的引用
```bash
# 搜索并替换
grep -r "novel-editor" --exclude-dir=node_modules
grep -r "Novel Editor" --exclude-dir=node_modules
grep -r "小说编辑器" --exclude-dir=node_modules
```

### 文档
- [ ] 所有 docs/ 目录下的文档
- [ ] API 文档
- [ ] 用户指南
- [ ] 开发者文档

### 外部资源
- [ ] GitHub 仓库名称和描述
- [ ] 社交媒体账号
- [ ] 官方网站（如果有）
- [ ] 博客文章
- [ ] 视频教程

### 构建和发布脚本
- [ ] CI/CD 配置
- [ ] 发布脚本
- [ ] 版本标签

---

## 🎯 关键决策点

### 1. GitHub 仓库是否重命名？

**建议**: 是，重命名为 `grain-editor`

**原因**:
- 保持一致性
- 更好的 SEO
- 清晰的品牌识别

**步骤**:
1. GitHub Settings → Repository name → `grain-editor`
2. GitHub 会自动设置重定向
3. 更新本地 remote: `git remote set-url origin https://github.com/jeasoncc/grain-editor.git`

### 2. 是否保留旧的 npm 包名？

**建议**: 创建新的 npm 包（如果发布到 npm）

**包名建议**:
- `@grain-editor/core`
- `@grain-editor/editor`
- `@grain-editor/desktop`

### 3. 版本号如何处理？

**建议**: 继续使用当前版本号 `0.1.80`

**原因**:
- 这是品牌更新，不是新产品
- 保持版本连续性
- 用户可以看到演进历史

---

## 📞 支持和反馈

如果在重命名过程中遇到问题：

1. 检查本文档的相关章节
2. 查看 GitHub Issues
3. 联系维护者: xiaomiquan@aliyun.com

---

## 📅 时间线示例

| 时间 | 任务 | 状态 |
|------|------|------|
| Week 1 | 更新代码库和配置 | ✅ 完成 |
| Week 2 | 测试构建和本地验证 | 🔄 进行中 |
| Week 3 | 注册新的 Snap 名称 | ⏳ 待办 |
| Week 4 | 创建 Windows Store 新应用 | ⏳ 待办 |
| Week 5-6 | 提交审核和发布 | ⏳ 待办 |
| Month 2-6 | 用户迁移期 | ⏳ 待办 |
| Month 7 | 下架旧应用 | ⏳ 待办 |

---

**最后更新**: 2025-12-16  
**维护者**: Jeason
