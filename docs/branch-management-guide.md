# 🌿 分支管理指南

## 为什么会有这么多分支？

### 常见原因

1. **开发过程中创建的功能分支**
   - 每次开发新功能都会创建分支
   - PR 合并后分支仍然保留

2. **测试分支**
   - 测试功能时创建的临时分支
   - 测试完成后忘记删除

3. **自动创建的分支**
   - Dependabot 创建的依赖更新分支
   - 某些 CI/CD 工具创建的临时分支

4. **历史遗留分支**
   - 旧的开发分支
   - 已经合并但未删除的分支

## 🔍 查看所有分支

### 查看本地分支
```bash
git branch
```

### 查看远程分支
```bash
git branch -r
```

### 查看所有分支（本地+远程）
```bash
git branch -a
```

### 查看分支详细信息
```bash
# 查看每个分支的最后一次提交
git branch -v

# 查看已合并到 main 的分支
git branch --merged main

# 查看未合并到 main 的分支
git branch --no-merged main
```

## 🧹 清理不需要的分支

### 1. 删除本地分支

```bash
# 删除已合并的分支
git branch -d branch-name

# 强制删除未合并的分支
git branch -D branch-name
```

### 2. 删除远程分支

```bash
# 删除远程分支
git push origin --delete branch-name

# 或者使用简写
git push origin :branch-name
```

### 3. 批量清理已合并的分支

```bash
# 列出所有已合并到 main 的本地分支（排除 main 和 develop）
git branch --merged main | grep -v "^\*" | grep -v "main" | grep -v "develop"

# 批量删除已合并的本地分支
git branch --merged main | grep -v "^\*" | grep -v "main" | grep -v "develop" | xargs -n 1 git branch -d

# 清理远程已删除的分支引用
git fetch --prune
```

### 4. 使用脚本批量清理

我为你创建了一个清理脚本（见下文）。

## 📋 推荐的分支策略

### 主要分支

1. **main** - 生产分支
   - 始终保持稳定
   - 只接受来自 PR 的合并
   - 受分支保护

2. **develop** - 开发分支（可选）
   - 日常开发的主分支
   - 功能分支从这里创建
   - 定期合并到 main

### 临时分支

1. **功能分支** - `feat/feature-name`
   - 开发新功能
   - 从 main 或 develop 创建
   - 完成后合并并删除

2. **修复分支** - `fix/bug-name`
   - 修复 bug
   - 从 main 或 develop 创建
   - 完成后合并并删除

3. **热修复分支** - `hotfix/critical-bug`
   - 紧急修复生产问题
   - 从 main 创建
   - 完成后合并到 main 和 develop

4. **发布分支** - `release/v1.0.0`
   - 准备发布
   - 从 develop 创建
   - 完成后合并到 main 和 develop

## 🔄 推荐的工作流程

### Git Flow（适合大项目）

```
main (生产)
  ↑
  └─ release/v1.0.0
       ↑
       └─ develop (开发)
            ↑
            ├─ feat/feature-1
            ├─ feat/feature-2
            └─ fix/bug-1
```

### GitHub Flow（推荐，适合你的项目）

```
main (生产)
  ↑
  ├─ feat/feature-1
  ├─ feat/feature-2
  ├─ fix/bug-1
  └─ hotfix/critical-bug
```

**特点**:
- 简单直接
- 只有一个长期分支（main）
- 所有功能分支都从 main 创建
- 完成后通过 PR 合并回 main
- 合并后立即删除分支

## 🎯 最佳实践

### 1. 分支命名规范

```bash
# 功能分支
feat/add-export-function
feat/improve-editor

# 修复分支
fix/login-error
fix/memory-leak

# 热修复
hotfix/critical-security-issue

# 文档
docs/update-readme
docs/add-api-docs

# 重构
refactor/optimize-performance
refactor/clean-code

# 测试
test/add-unit-tests
test/e2e-tests
```

### 2. 及时删除已合并的分支

**在 GitHub 上**:
- PR 合并后，勾选 "Delete branch" 选项
- 或者在 PR 页面点击 "Delete branch" 按钮

**在本地**:
```bash
# 合并后删除本地分支
git checkout main
git pull
git branch -d feat/feature-name

# 清理远程已删除的分支引用
git fetch --prune
```

### 3. 定期清理

**每周或每月**:
```bash
# 1. 更新本地仓库
git fetch --prune

# 2. 查看已合并的分支
git branch --merged main

# 3. 删除已合并的本地分支
git branch --merged main | grep -v "^\*" | grep -v "main" | xargs -n 1 git branch -d

# 4. 查看远程分支
git branch -r

# 5. 删除不需要的远程分支
git push origin --delete old-branch-name
```

### 4. 配置 GitHub 自动删除

在 GitHub 仓库设置中:
1. Settings → General
2. 找到 "Pull Requests" 部分
3. 勾选 **"Automatically delete head branches"**

这样 PR 合并后会自动删除分支。

## 🛠️ 实用命令

### 查看分支信息

```bash
# 查看分支的上游分支
git branch -vv

# 查看分支的创建时间
git for-each-ref --sort=committerdate refs/heads/ --format='%(committerdate:short) %(refname:short)'

# 查看分支的最后提交者
git for-each-ref --sort=authordate refs/heads/ --format='%(authordate:short) %(authorname) %(refname:short)'
```

### 重命名分支

```bash
# 重命名本地分支
git branch -m old-name new-name

# 删除远程旧分支，推送新分支
git push origin :old-name new-name

# 设置新分支的上游
git push origin -u new-name
```

### 恢复已删除的分支

```bash
# 查看最近删除的分支
git reflog

# 恢复分支（找到分支删除前的 commit hash）
git checkout -b branch-name commit-hash
```

## 📊 分支管理工具

### 1. GitHub CLI

```bash
# 安装
brew install gh

# 列出所有分支
gh api repos/:owner/:repo/branches

# 删除分支
gh api -X DELETE repos/:owner/:repo/git/refs/heads/branch-name
```

### 2. Git GUI 工具

- **GitKraken** - 可视化分支管理
- **SourceTree** - 免费的 Git GUI
- **GitHub Desktop** - 简单易用

### 3. VS Code 扩展

- **GitLens** - 强大的 Git 工具
- **Git Graph** - 可视化分支图

## 🚨 注意事项

### 不要删除的分支

- ❌ **main** - 主分支
- ❌ **develop** - 开发分支（如果使用）
- ❌ **release/** - 发布分支（如果还在使用）
- ❌ 其他人正在使用的分支

### 删除前确认

1. 确认分支已合并
2. 确认没有未推送的提交
3. 确认没有其他人在使用
4. 备份重要的分支

## 📝 你的项目建议

基于你的项目（个人开发的小说编辑器），我建议：

### 分支策略

使用 **GitHub Flow**:
```
main
  ↑
  ├─ feat/new-feature
  ├─ fix/bug-fix
  └─ docs/update-docs
```

### 清理计划

1. **立即清理**:
   ```bash
   # 查看所有远程分支
   git branch -r
   
   # 删除已合并的分支
   git branch --merged main | grep -v "^\*" | grep -v "main" | xargs -n 1 git branch -d
   
   # 清理远程引用
   git fetch --prune
   ```

2. **配置自动删除**:
   - Settings → General → Pull Requests
   - 勾选 "Automatically delete head branches"

3. **定期维护**:
   - 每月检查一次分支
   - 删除 3 个月以上未更新的分支
   - 保持分支数量在 5 个以内

## 🔧 快速清理脚本

我为你创建了清理脚本: `scripts/cleanup-branches.sh`

使用方法:
```bash
./scripts/cleanup-branches.sh
```

## 📚 相关文档

- [Git 分支文档](https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%88%86%E6%94%AF%E7%AE%80%E4%BB%8B)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

---

保持分支整洁，让仓库更易管理！🌿
