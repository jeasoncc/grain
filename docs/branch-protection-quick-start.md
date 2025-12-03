# 🚀 分支保护快速配置（5 分钟）

## 方法一：Web 界面配置（推荐）

### 步骤 1: 进入设置

1. 打开你的 GitHub 仓库: https://github.com/jeasoncc/novel-editor
2. 点击顶部的 **Settings** (设置) 标签
3. 左侧菜单找到 **Branches** (分支)

### 步骤 2: 添加保护规则

点击 **Add branch protection rule** (添加分支保护规则) 按钮

### 步骤 3: 配置 main 分支

#### 3.1 填写分支名称

在 **Branch name pattern** 输入框中填写:
```
main
```

#### 3.2 勾选保护选项（个人项目推荐配置）

**必需勾选**:

1. ✅ **Require a pull request before merging**
   - 展开后，将 "Required number of approvals before merging" 设置为 **0**
   - (个人项目可以自己合并，不需要别人审批)

2. ✅ **Require status checks to pass before merging**
   - 勾选 **Require branches to be up to date before merging**
   - 在搜索框中搜索并勾选以下状态检查:
     - `Lint and Type Check`
     - `Build Web`
     - `Build Desktop`
   - (这些是你的 CI workflows，确保代码质量)

3. ✅ **Require conversation resolution before merging**
   - (确保所有讨论都已解决)

4. ✅ **Require linear history**
   - (保持提交历史清晰)

5. ✅ **Do not allow force pushes**
   - (防止强制推送覆盖历史)

6. ✅ **Do not allow deletions**
   - (防止意外删除主分支)

#### 3.3 保存

滚动到页面底部，点击绿色的 **Create** 按钮

### 步骤 4: 验证配置

配置完成后，你会看到一个绿色的成功提示。

## 方法二：使用脚本配置

如果你安装了 GitHub CLI:

```bash
# 安装 GitHub CLI (如果还没安装)
# macOS:
brew install gh

# Linux:
# 参考: https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# 登录
gh auth login

# 运行配置脚本
./scripts/setup-branch-protection.sh
```

## 配置后的效果

### ✅ 可以做的事情

1. **创建分支并推送**
   ```bash
   git checkout -b feat/new-feature
   git add .
   git commit -m "feat: 添加新功能"
   git push origin feat/new-feature
   ```

2. **创建 PR 并合并**
   - 在 GitHub 上创建 Pull Request
   - 等待 CI 检查通过（绿色勾）
   - 点击 "Merge pull request" 合并

### ❌ 不能做的事情

1. **直接推送到 main**
   ```bash
   git checkout main
   git add .
   git commit -m "直接提交"
   git push origin main
   # ❌ 错误: 受保护的分支
   ```

2. **强制推送**
   ```bash
   git push -f origin main
   # ❌ 错误: 不允许强制推送
   ```

3. **删除 main 分支**
   ```bash
   git push origin --delete main
   # ❌ 错误: 不允许删除
   ```

## 测试配置

### 测试 1: 尝试直接推送（应该失败）

```bash
# 切换到 main 分支
git checkout main

# 做一些改动
echo "test" >> README.md
git add README.md
git commit -m "test: 测试分支保护"

# 尝试推送
git push origin main
```

**预期结果**:
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
```

✅ 如果看到这个错误，说明分支保护生效了！

### 测试 2: 通过 PR 推送（应该成功）

```bash
# 撤销刚才的提交
git reset --soft HEAD~1

# 创建新分支
git checkout -b test/branch-protection

# 提交并推送
git add README.md
git commit -m "test: 测试分支保护"
git push origin test/branch-protection
```

然后在 GitHub 上:
1. 创建 Pull Request
2. 等待 CI 通过
3. 点击 "Merge pull request"

✅ 应该可以成功合并！

## 常见问题

### Q: 我是唯一的开发者，为什么还要配置分支保护？

A: 即使是个人项目，分支保护也很有用：
- ✅ 防止意外的直接推送
- ✅ 确保 CI 检查通过
- ✅ 养成良好的开发习惯
- ✅ 保持提交历史清晰

### Q: 配置后我还能推送代码吗？

A: 可以！只是不能直接推送到 main，需要：
1. 创建功能分支
2. 推送到功能分支
3. 创建 PR
4. 合并 PR

这是更好的开发流程！

### Q: CI 检查失败了怎么办？

A: 
1. 查看 Actions 页面的错误日志
2. 在你的分支上修复问题
3. 推送新的提交
4. CI 会自动重新运行

### Q: 我需要紧急修复怎么办？

A: 
1. 创建 hotfix 分支
2. 快速修复
3. 创建 PR
4. CI 通过后立即合并

整个流程可能只需要 5-10 分钟。

### Q: 如何临时禁用分支保护？

A: 
1. Settings → Branches
2. 找到 main 的规则
3. 点击 Edit
4. 取消勾选需要禁用的选项
5. **完成操作后立即恢复！**

⚠️ 不建议禁用，除非真的很紧急。

## 推荐的工作流程

### 日常开发

```bash
# 1. 更新 main 分支
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feat/awesome-feature

# 3. 开发功能
# ... 编写代码 ...

# 4. 提交
git add .
git commit -m "feat: 添加很棒的功能"

# 5. 推送
git push origin feat/awesome-feature

# 6. 在 GitHub 上创建 PR

# 7. 等待 CI 通过

# 8. 合并 PR

# 9. 删除功能分支
git checkout main
git pull origin main
git branch -d feat/awesome-feature
```

### 快速修复

```bash
# 1. 创建 hotfix 分支
git checkout -b hotfix/critical-bug

# 2. 修复
# ... 修复代码 ...

# 3. 提交并推送
git add .
git commit -m "fix: 修复严重 bug"
git push origin hotfix/critical-bug

# 4. 创建 PR 并快速合并
```

## 下一步

配置完分支保护后:

1. ✅ 阅读完整指南: [branch-protection-guide.md](branch-protection-guide.md)
2. ✅ 更新团队文档
3. ✅ 创建第一个 PR 测试流程
4. ✅ 享受更安全的开发流程！

## 相关链接

- [GitHub 分支保护文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [自动化配置指南](automation-features.md)
- [GitHub Actions 指南](github-hooks-guide.md)

---

配置只需 5 分钟，但能带来长期的代码质量保障！🛡️
