# 🚀 GitHub Actions 快速参考

## 常用命令

### 发布新版本
```bash
# Desktop 应用
git tag desktop-v0.1.0
git push origin desktop-v0.1.0

# 自动执行: 构建 → 发布 → 更新 AUR → 生成 Release Notes
```

### 创建规范的 PR
```bash
git checkout -b feat/new-feature
# ... 做一些改动 ...
git commit -m "feat: 添加新功能"
git push origin feat/new-feature

# 自动执行: CI 检查 → 添加标签 → 生成统计 → 质量检查
```

### 跳过 CI
```bash
git commit -m "docs: 更新文档 [skip ci]"
```

## 提交信息格式

| 前缀 | 说明 | 示例 |
|------|------|------|
| `feat:` | 新功能 | `feat: 添加导出功能` |
| `fix:` | Bug 修复 | `fix: 修复登录问题` |
| `docs:` | 文档 | `docs: 更新 README` |
| `style:` | 样式 | `style: 调整按钮样式` |
| `refactor:` | 重构 | `refactor: 优化代码结构` |
| `perf:` | 性能 | `perf: 优化加载速度` |
| `test:` | 测试 | `test: 添加单元测试` |
| `chore:` | 其他 | `chore: 更新依赖` |

## 自动化触发器

| 操作 | 触发的 Workflows |
|------|------------------|
| 创建 PR | CI、PR Checks、Quality Gate、Bundle Size |
| 推送 tag | Release Desktop、Release Notes、AUR Publish |
| 创建 Issue | Issue Labeler、Greetings |
| 推送到 main | Deploy Web、CI |
| 每周一 | Security Audit、Dependabot、Performance |
| 每周日 | Backup |
| 每天 | Stale |

## 常用标签

| 标签 | 用途 |
|------|------|
| `bug` | Bug 报告 |
| `enhancement` | 功能请求 |
| `documentation` | 文档相关 |
| `desktop` | Desktop 应用 |
| `web` | Web 应用 |
| `pinned` | 防止自动关闭 |
| `good first issue` | 适合新手 |
| `help wanted` | 需要帮助 |

## 手动触发 Workflow

1. 进入 **Actions** 页面
2. 选择 workflow
3. 点击 **Run workflow**
4. 填写参数（如需要）

## 查看报告

| 报告类型 | 位置 |
|----------|------|
| PR 统计 | PR 评论 |
| 代码质量 | PR 评论 |
| Bundle 大小 | PR 评论 |
| 安全报告 | Actions → Artifacts |
| 性能报告 | Actions → Artifacts |
| 备份文件 | Actions → Artifacts |

## 配置位置

| 配置 | 文件 |
|------|------|
| Workflows | `.github/workflows/*.yml` |
| Dependabot | `.github/dependabot.yml` |
| 标签规则 | `.github/labeler.yml` |
| 代码所有者 | `.github/CODEOWNERS` |

## 需要的 Secrets

### AUR 发布（可选）
- `AUR_USERNAME`
- `AUR_EMAIL`
- `AUR_SSH_PRIVATE_KEY`

### 代码覆盖率（可选）
- `CODECOV_TOKEN`

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| Workflow 失败 | 查看 Actions 日志 |
| 权限错误 | 检查 Settings → Actions → Permissions |
| AUR 发布失败 | 检查 Secrets 配置 |
| Dependabot 不工作 | 检查 `.github/dependabot.yml` |

## 有用的链接

- [完整文档](../docs/github-hooks-guide.md)
- [设置清单](SETUP_CHECKLIST.md)
- [自动化功能](../docs/automation-features.md)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

## 快速设置

```bash
# 1. 配置权限
# Settings → Actions → General → Read and write permissions

# 2. 创建标签
./scripts/setup-github-labels.sh

# 3. 测试
git checkout -b test/actions
echo "test" >> README.md
git commit -m "test: 测试自动化"
git push origin test/actions
# 创建 PR 查看效果
```

---

💡 **提示**: 将此文件加入书签，随时查阅！
