# GitHub Actions 设置检查清单

完成以下步骤以启用所有自动化功能。

## ✅ 必需配置 (10 分钟)

### 1. 配置分支保护 ⭐ 重要！

- [ ] 进入 `Settings` → `Branches`
- [ ] 点击 **"Add branch protection rule"**
- [ ] Branch name pattern: `main`
- [ ] 勾选以下选项:
  - [ ] **Require a pull request before merging** (审批数设为 0)
  - [ ] **Require status checks to pass before merging**
    - [ ] Require branches to be up to date
    - [ ] 选择: `Lint and Type Check`, `Build Web`, `Build Desktop`
  - [ ] **Require conversation resolution before merging**
  - [ ] **Require linear history**
  - [ ] **Do not allow force pushes**
  - [ ] **Do not allow deletions**
- [ ] 点击 **Create**

📖 详细指南: [分支保护快速配置](../docs/branch-protection-quick-start.md)

### 2. 配置 GitHub Actions 权限

- [ ] 进入 `Settings` → `Actions` → `General`
- [ ] 在 "Workflow permissions" 部分:
  - [ ] 选择 **"Read and write permissions"**
  - [ ] 勾选 **"Allow GitHub Actions to create and approve pull requests"**
- [ ] 点击 **Save**

### 3. 启用 GitHub Pages (用于 Web 部署)

- [ ] 进入 `Settings` → `Pages`
- [ ] Source 选择 **"GitHub Actions"**
- [ ] 点击 **Save**

### 4. 创建必需的标签

运行标签创建脚本:

```bash
./scripts/setup-github-labels.sh
```

或手动创建以下标签:
- [ ] `bug` (红色)
- [ ] `enhancement` (蓝色)
- [ ] `documentation` (蓝色)
- [ ] `desktop` (紫色)
- [ ] `web` (绿色)
- [ ] `dependencies` (蓝色)
- [ ] `ci/cd` (黑色)

## 🔐 可选配置 - AUR 自动发布 (10 分钟)

如果需要自动发布到 AUR:

### 1. 生成 SSH 密钥

```bash
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/aur
```

### 2. 添加公钥到 AUR

- [ ] 访问 https://aur.archlinux.org/account/
- [ ] 登录你的账户
- [ ] 进入 "My Account" → "SSH Public Key"
- [ ] 粘贴 `~/.ssh/aur.pub` 的内容
- [ ] 点击 **Update**

### 3. 配置 GitHub Secrets

- [ ] 进入 `Settings` → `Secrets and variables` → `Actions`
- [ ] 点击 **New repository secret**
- [ ] 添加以下 secrets:

| Name | Value |
|------|-------|
| `AUR_USERNAME` | 你的 AUR 用户名 |
| `AUR_EMAIL` | 你的 AUR 邮箱 |
| `AUR_SSH_PRIVATE_KEY` | `~/.ssh/aur` 的内容 |

## 🧪 测试配置 (5 分钟)

### 1. 测试 PR Workflows

```bash
# 创建测试分支
git checkout -b test/github-actions

# 做一些改动
echo "# Test" >> README.md
git add README.md
git commit -m "test: 测试 GitHub Actions"

# 推送并创建 PR
git push origin test/github-actions
```

然后在 GitHub 上创建 PR，观察自动化效果:
- [ ] CI 检查运行
- [ ] 自动添加标签
- [ ] 自动添加 PR 统计评论
- [ ] 代码质量检查

### 2. 测试手动触发

- [ ] 进入 `Actions` 页面
- [ ] 选择 "Backup Repository"
- [ ] 点击 **Run workflow**
- [ ] 查看运行结果

### 3. 测试 Issue 自动化

- [ ] 创建一个新 Issue，标题包含 "bug"
- [ ] 检查是否自动添加了 `bug` 标签
- [ ] 检查是否收到欢迎消息（如果是首次创建 Issue）

## 📊 验证配置

### 检查 Workflows 状态

- [ ] 进入 `Actions` 页面
- [ ] 确认所有 workflows 都显示为绿色或未运行
- [ ] 没有红色失败的 workflows

### 检查 Dependabot

- [ ] 进入 `Insights` → `Dependency graph` → `Dependabot`
- [ ] 确认 Dependabot 已启用
- [ ] 查看是否有待处理的更新

## 🎯 下一步

配置完成后，你可以:

1. **发布第一个自动化 Release**
   ```bash
   git tag desktop-v0.1.0
   git push origin desktop-v0.1.0
   ```

2. **查看自动化效果**
   - Release Notes 自动生成
   - CHANGELOG 自动更新
   - AUR 包自动发布（如果配置了）

3. **日常使用**
   - 创建 PR 时使用规范的标题格式
   - 定期查看和合并 Dependabot PR
   - 处理 stale issues

## 📚 参考文档

- [完整配置指南](../docs/github-hooks-guide.md)
- [配置总结](../GITHUB_HOOKS_SUMMARY.md)

## ❓ 遇到问题？

如果遇到问题:

1. 查看 Actions 页面的详细日志
2. 检查本文档的配置步骤
3. 查看 [GitHub Actions 文档](https://docs.github.com/en/actions)
4. 创建 Issue 寻求帮助

## ✨ 完成！

- [ ] 所有必需配置已完成
- [ ] 可选配置已完成（如需要）
- [ ] 测试通过
- [ ] 验证成功

恭喜！你的 GitHub Actions 自动化系统已经就绪！🎉
