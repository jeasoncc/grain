# 🛡️ 分支保护配置完成指南

## 为什么需要分支保护？

你看到的提示 "Your main branch isn't protected" 是 GitHub 的安全建议。

**不配置分支保护的风险**:
- ❌ 可能意外直接推送到 main
- ❌ 可能强制推送覆盖历史
- ❌ 可能意外删除主分支
- ❌ 未经测试的代码可能进入主分支
- ❌ 提交历史可能混乱

**配置分支保护的好处**:
- ✅ 强制通过 PR 流程
- ✅ 确保 CI 检查通过
- ✅ 保持代码质量
- ✅ 保护提交历史
- ✅ 养成良好的开发习惯

## 🚀 快速配置（5 分钟）

### 方法一：Web 界面（推荐）

#### 1. 进入设置
```
https://github.com/jeasoncc/novel-editor/settings/branches
```

或者:
```
仓库首页 → Settings → Branches → Add branch protection rule
```

#### 2. 配置 main 分支

**Branch name pattern**: `main`

**勾选以下选项** (个人项目推荐):

```
✅ Require a pull request before merging
   └─ Required approving reviews: 0 (个人项目可以自己合并)

✅ Require status checks to pass before merging
   └─ ✅ Require branches to be up to date before merging
   └─ 选择状态检查:
       ✅ Lint and Type Check
       ✅ Build Web
       ✅ Build Desktop

✅ Require conversation resolution before merging

✅ Require linear history

✅ Do not allow force pushes

✅ Do not allow deletions
```

#### 3. 保存

点击页面底部的 **Create** 按钮

### 方法二：使用脚本

如果你安装了 GitHub CLI:

```bash
# 安装 GitHub CLI
brew install gh  # macOS
# 或访问: https://cli.github.com/

# 登录
gh auth login

# 运行配置脚本
./scripts/setup-branch-protection.sh
```

## ✅ 配置后的工作流程

### 正确的开发流程

```bash
# 1. 创建功能分支
git checkout -b feat/new-feature

# 2. 开发和提交
git add .
git commit -m "feat: 添加新功能"

# 3. 推送到远程
git push origin feat/new-feature

# 4. 在 GitHub 上创建 PR
# 5. 等待 CI 检查通过
# 6. 合并 PR
```

### 不再能做的事情（这是好事！）

```bash
# ❌ 直接推送到 main
git push origin main
# 错误: 受保护的分支

# ❌ 强制推送
git push -f origin main
# 错误: 不允许强制推送

# ❌ 删除 main 分支
git push origin --delete main
# 错误: 不允许删除
```

## 🧪 测试配置

### 测试 1: 验证分支保护生效

```bash
# 尝试直接推送到 main（应该失败）
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test"
git push origin main

# 预期结果: 
# remote: error: GH006: Protected branch update failed
# ✅ 这说明分支保护生效了！
```

### 测试 2: 通过 PR 推送（应该成功）

```bash
# 撤销刚才的提交
git reset --soft HEAD~1

# 创建新分支
git checkout -b test/branch-protection
git add README.md
git commit -m "test: 测试分支保护"
git push origin test/branch-protection

# 在 GitHub 上创建 PR 并合并
# ✅ 应该可以成功！
```

## 📊 配置级别对比

### 个人项目（推荐）

适合: 个人开发者

```
✅ 要求 PR
✅ 要求 CI 通过
✅ 禁止强制推送
✅ 禁止删除
❌ 不要求审批（自己可以合并）
```

**优点**: 保证代码质量，流程简单
**缺点**: 无

### 小团队

适合: 2-5 人团队

```
✅ 要求 PR
✅ 要求 1 个审批
✅ 要求 CI 通过
✅ 要求解决对话
✅ 禁止强制推送
✅ 禁止删除
```

**优点**: 代码审查，团队协作
**缺点**: 需要等待审批

### 严格模式

适合: 大团队或关键项目

```
✅ 要求 PR
✅ 要求 2 个审批
✅ 要求代码所有者审批
✅ 要求 CI 通过
✅ 要求签名提交
✅ 要求线性历史
✅ 管理员也不能绕过
✅ 禁止强制推送
✅ 禁止删除
```

**优点**: 最高安全性
**缺点**: 流程较慢

## 💡 常见问题

### Q: 配置后我还能推送代码吗？

**A**: 可以！只是不能直接推送到 main，需要通过 PR。这是更好的开发流程。

### Q: 我是唯一的开发者，有必要配置吗？

**A**: 非常有必要！
- 防止意外操作
- 确保 CI 通过
- 养成良好习惯
- 保持历史清晰

### Q: CI 检查失败了怎么办？

**A**: 
1. 查看 Actions 页面的错误日志
2. 在分支上修复问题
3. 推送新提交
4. CI 自动重新运行

### Q: 紧急情况需要快速修复怎么办？

**A**: 
```bash
# 1. 创建 hotfix 分支
git checkout -b hotfix/urgent-fix

# 2. 快速修复
git add .
git commit -m "fix: 紧急修复"

# 3. 推送并创建 PR
git push origin hotfix/urgent-fix

# 4. CI 通过后立即合并
```

整个流程只需 5-10 分钟。

### Q: 如何临时禁用分支保护？

**A**: 
1. Settings → Branches → Edit rule
2. 取消勾选需要禁用的选项
3. **完成操作后立即恢复！**

⚠️ 不建议禁用，除非真的很紧急。

## 📚 详细文档

- **快速开始**: [分支保护快速配置](docs/branch-protection-quick-start.md)
- **完整指南**: [分支保护配置指南](docs/branch-protection-guide.md)
- **自动化功能**: [自动化功能说明](docs/automation-features.md)

## 🎯 推荐配置

基于你的项目（个人开发的小说编辑器），我推荐：

### main 分支

```
Branch name pattern: main

✅ Require a pull request before merging
   └─ Require approvals: 0

✅ Require status checks to pass before merging
   └─ Require branches to be up to date
   └─ Status checks:
       - Lint and Type Check
       - Build Web
       - Build Desktop
       - Code Quality Checks

✅ Require conversation resolution before merging

✅ Require linear history

✅ Do not allow force pushes

✅ Do not allow deletions
```

### develop 分支（可选）

如果你使用 Git Flow:

```
Branch name pattern: develop

✅ Require a pull request before merging
   └─ Require approvals: 0

✅ Require status checks to pass before merging
   └─ Status checks:
       - Lint and Type Check
       - Build Web
       - Build Desktop

✅ Do not allow force pushes
```

## ✨ 配置后的好处

### 代码质量

- ✅ 每次合并前都经过 CI 检查
- ✅ 确保代码能够构建
- ✅ 确保代码通过 lint 检查
- ✅ 确保类型检查通过

### 开发流程

- ✅ 养成使用分支的习惯
- ✅ 保持提交历史清晰
- ✅ 便于回滚和追踪
- ✅ 更专业的开发方式

### 安全性

- ✅ 防止意外操作
- ✅ 保护主分支
- ✅ 保护提交历史
- ✅ 防止强制推送

## 🚀 开始使用

1. ✅ 配置分支保护（5 分钟）
2. ✅ 测试配置是否生效
3. ✅ 创建第一个 PR
4. ✅ 享受更安全的开发流程！

---

**配置链接**: https://github.com/jeasoncc/novel-editor/settings/branches

**需要帮助?** 查看 [快速配置指南](docs/branch-protection-quick-start.md)

配置分支保护是最佳实践，强烈推荐！🛡️
