# 自动化发布工作流

## 🚀 概述

我们已经实现了完全自动化的发布流程，确保正确的时序性和依赖关系。

## 🔄 工作流程

### 1. Desktop 优先发布
当 `desktop-v*` 标签被推送时：
1. **Desktop 工作流**开始构建所有桌面格式（Windows/macOS/Linux）
2. 构建完成后，自动检测是否有其他平台的标签等待发布
3. 自动触发所有依赖 desktop release 的平台工作流

### 2. 自动触发机制
Desktop 工作流完成后会：
- 🔍 检查是否存在同版本的其他平台标签
- 🚀 自动触发对应的工作流
- 📝 创建进度跟踪评论
- 🔔 发送通知

### 3. 支持的触发方式
每个工作流现在支持三种触发方式：
- **标签推送**: `{platform}-v*.*.*`
- **手动触发**: GitHub Actions 界面
- **自动触发**: Desktop 工作流完成后

## 📋 发布方式

### 方式 1: 一键发布所有平台（推荐）
```bash
npm run tag:all
```

**流程**:
1. 创建 `desktop-v0.1.54` 标签 → 触发 Desktop 构建
2. 创建所有其他平台标签 → 等待 Desktop 完成
3. Desktop 完成后 → 自动触发所有其他平台
4. 20-30 分钟后 → 所有平台发布完成

### 方式 2: 分步发布
```bash
# 1. 先发布 desktop
npm run tag:desktop

# 2. 等待 desktop 完成后，发布其他平台
npm run tag:linux:flatpak
npm run tag:windows:winget
# 等等...
```

### 方式 3: 使用发布编排器
通过 GitHub Actions 界面运行 "Release Orchestrator" 工作流：
- 可以选择特定平台
- 可以指定版本号
- 自动创建进度跟踪 issue

## 🎯 依赖关系

### 需要 Desktop Release 的平台
这些平台会等待 desktop 构建完成后自动触发：
- ✅ **Flatpak** - 需要源码和 release
- ✅ **Winget** - 需要 MSI 文件
- ✅ **Chocolatey** - 需要 NSIS 安装包
- ✅ **Scoop** - 需要 NSIS 安装包
- ✅ **Homebrew** - 需要 DMG 文件
- ✅ **PPA** - 需要 DEB 文件
- ✅ **COPR** - 需要 RPM 文件
- ✅ **OBS** - 需要源码
- ✅ **AUR** - 需要源码
- ✅ **AUR-bin** - 需要 DEB 文件
- ✅ **Gentoo** - 需要源码

### 独立的平台
这些平台不依赖 desktop release：
- 🔄 **Snap** - 直接从源码构建
- 🌐 **Web** - 直接部署 web 应用

## 📊 监控和跟踪

### 1. GitHub Actions 界面
- 查看所有工作流状态
- 实时日志和错误信息
- 重新运行失败的工作流

### 2. 自动创建的评论
Desktop 工作流完成后会在 commit 上创建评论，包含：
- ✅ 构建状态
- 🚀 触发的平台列表
- 📥 下载链接
- ⏱️ 预计完成时间

### 3. 进度跟踪 Issue（可选）
Release Orchestrator 会创建跟踪 issue，包含：
- 📋 所有平台的状态
- 🔗 相关链接
- 📊 时间线

## 🔧 故障排除

### 问题 1: 某个平台工作流失败
**解决方案**:
1. 在 GitHub Actions 中重新运行失败的工作流
2. 或者手动触发该平台的工作流
3. 检查错误日志并修复问题

### 问题 2: Desktop 工作流失败
**解决方案**:
1. 修复 desktop 构建问题
2. 重新推送 desktop 标签
3. 其他平台会自动重新触发

### 问题 3: 自动触发不工作
**可能原因**:
- GitHub Actions 权限问题
- 工作流文件语法错误
- API 限制

**解决方案**:
1. 检查工作流权限设置
2. 手动触发工作流
3. 查看 GitHub Actions 日志

## 🎉 优势

### 1. 时序保证
- Desktop 总是首先完成
- 其他平台自动等待依赖就绪
- 避免了手动协调的复杂性

### 2. 容错性
- 单个平台失败不影响其他平台
- 可以重新运行失败的工作流
- 保持原有的手动触发能力

### 3. 可见性
- 自动创建进度跟踪
- 实时状态更新
- 完整的发布历史

### 4. 灵活性
- 支持全平台发布
- 支持选择性发布
- 支持手动干预

## 📝 最佳实践

### 1. 发布前检查
```bash
# 检查版本号
npm run version:bump --dry-run

# 检查构建状态
npm run build:prod:desktop

# 提交所有更改
git add .
git commit -m "chore: prepare for release v0.1.54"
git push
```

### 2. 发布流程
```bash
# 一键发布（推荐）
npm run tag:all

# 或者分步发布
npm run tag:desktop
# 等待完成后...
npm run tag:linux:all
npm run tag:windows:all
npm run tag:macos:all
```

### 3. 发布后验证
- 检查 GitHub Releases 页面
- 验证各平台的包管理器
- 测试下载和安装

## 🔮 未来改进

- [ ] 添加发布状态仪表板
- [ ] 集成 Slack/Discord 通知
- [ ] 自动化版本号管理
- [ ] 发布质量检查
- [ ] 回滚机制