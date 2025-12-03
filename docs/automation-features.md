# 🤖 自动化功能说明

本项目配置了完整的 GitHub Actions 自动化系统，大幅提升开发效率。

## 🎯 核心自动化功能

### 1. 自动化发布 🚀

**触发**: 推送 `desktop-v*.*.*` tag

**自动执行**:
- ✅ 构建 Windows/macOS/Linux 安装包
- ✅ 创建 GitHub Release
- ✅ 生成详细的 Release Notes
- ✅ 更新 CHANGELOG.md
- ✅ 发布到 AUR (Arch Linux)

**使用示例**:
```bash
git tag desktop-v0.1.0
git push origin desktop-v0.1.0
# 等待 5-10 分钟，所有平台的安装包自动发布！
```

### 2. 智能 PR 检查 🔍

**触发**: 创建或更新 Pull Request

**自动执行**:
- ✅ 代码质量检查 (Biome)
- ✅ 类型检查 (TypeScript)
- ✅ 构建测试
- ✅ Bundle 大小分析
- ✅ 自动添加标签
- ✅ 计算 PR 大小
- ✅ 检测 breaking changes
- ✅ 生成 PR 统计报告

**PR 标题建议格式**:
```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 样式改进
refactor: 代码重构
perf: 性能优化
```

### 3. 自动 Issue 管理 🏷️

**触发**: 创建或编辑 Issue

**自动执行**:
- ✅ 识别问题类型 (bug/feature/docs)
- ✅ 自动添加相关标签
- ✅ 区分 desktop/web 问题
- ✅ 欢迎首次贡献者

**示例**:
- Issue 标题包含 "bug" → 自动添加 `bug` 标签
- Issue 标题包含 "desktop" → 自动添加 `desktop` 标签

### 4. 依赖自动更新 📦

**触发**: 每周一自动运行

**自动执行**:
- ✅ 检查 NPM 依赖更新
- ✅ 检查 Cargo 依赖更新
- ✅ 检查 GitHub Actions 更新
- ✅ 创建更新 PR
- ✅ 分组小版本更新

**效果**: 依赖始终保持最新，减少安全风险

### 5. 安全扫描 🔒

**触发**: 每周一、依赖文件变更

**自动执行**:
- ✅ NPM 依赖安全扫描
- ✅ Cargo 依赖安全扫描
- ✅ 生成安全报告
- ✅ 上传审计报告

### 6. 过期项目清理 🧹

**触发**: 每天自动运行

**自动执行**:
- ✅ 标记 30 天无活动的 Issues
- ✅ 标记 14 天无活动的 PRs
- ✅ 7 天后自动关闭
- ✅ 排除 pinned/security 标签

**避免被关闭**: 给重要 Issue 添加 `pinned` 标签

### 7. 性能监控 ⚡

**触发**: PR 到 main、每周一

**自动执行**:
- ✅ Lighthouse 性能测试
- ✅ 构建时间追踪
- ✅ Bundle 大小监控
- ✅ 生成性能报告

### 8. 自动备份 💾

**触发**: 每周日凌晨 3 点

**自动执行**:
- ✅ 创建完整备份 (含 Git 历史)
- ✅ 创建源码备份
- ✅ 生成备份信息
- ✅ 保留 90 天

## 📊 效率提升

| 任务 | 手动耗时 | 自动化耗时 | 节省 |
|------|----------|------------|------|
| 发布新版本 | 30 分钟 | 5 分钟 | 83% |
| 代码审查 | 20 分钟 | 10 分钟 | 50% |
| 依赖更新 | 2 小时/月 | 10 分钟/月 | 92% |
| Issue 管理 | 1 小时/周 | 10 分钟/周 | 83% |
| 安全检查 | 1 小时/月 | 自动 | 100% |

**总计每月节省**: ~15 小时

## 🎓 使用技巧

### 跳过 CI

在提交信息中添加 `[skip ci]`:
```bash
git commit -m "docs: 更新文档 [skip ci]"
```

### 手动触发 Workflow

1. 进入 Actions 页面
2. 选择要运行的 workflow
3. 点击 "Run workflow"

### 查看自动化报告

- **PR 统计**: 在 PR 评论中查看
- **安全报告**: Actions → Security Audit → Artifacts
- **性能报告**: Actions → Performance → Artifacts
- **备份文件**: Actions → Backup → Artifacts

### 自定义标签

编辑 `.github/labeler.yml` 添加自定义规则:
```yaml
your-label:
  - path/to/files/**/*
```

## 🔧 配置说明

### 必需配置

1. **GitHub Actions 权限**
   - Settings → Actions → General
   - 选择 "Read and write permissions"
   - 勾选 "Allow GitHub Actions to create and approve pull requests"

2. **GitHub Pages** (用于 Web 部署)
   - Settings → Pages
   - Source 选择 "GitHub Actions"

### 可选配置

**AUR 自动发布** (需要配置 Secrets):
- `AUR_USERNAME`: AUR 用户名
- `AUR_EMAIL`: AUR 邮箱
- `AUR_SSH_PRIVATE_KEY`: AUR SSH 私钥

**代码覆盖率** (需要配置 Secrets):
- `CODECOV_TOKEN`: Codecov token

## 📚 详细文档

- [完整配置指南](github-hooks-guide.md)
- [设置检查清单](../.github/SETUP_CHECKLIST.md)
- [配置总结](../GITHUB_HOOKS_SUMMARY.md)

## 🆘 故障排除

### Workflow 失败

1. 查看 Actions 页面的详细日志
2. 检查 Secrets 配置
3. 确认权限设置正确

### Dependabot PR 太多

编辑 `.github/dependabot.yml`:
```yaml
open-pull-requests-limit: 3  # 减少数量
schedule:
  interval: "monthly"  # 改为每月
```

### AUR 发布失败

1. 确认 SSH 密钥配置正确
2. 检查 AUR 账户权限
3. 验证 PKGBUILD 格式

## 🎉 总结

通过这套自动化系统，你可以:

- ✅ 一键发布多平台应用
- ✅ 自动保证代码质量
- ✅ 自动管理依赖更新
- ✅ 自动处理 Issues 和 PRs
- ✅ 自动监控安全和性能

专注于开发，让自动化处理其他一切！🚀

---

有问题或建议？欢迎创建 Issue 讨论！
