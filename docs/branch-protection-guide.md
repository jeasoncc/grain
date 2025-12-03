# 🛡️ 分支保护配置指南

## 为什么需要分支保护？

分支保护可以：
- ✅ 防止直接推送到主分支
- ✅ 防止意外删除主分支
- ✅ 强制代码审查
- ✅ 确保 CI 通过后才能合并
- ✅ 保持代码质量

## 快速配置（推荐）

### 1. 进入分支保护设置

1. 打开你的 GitHub 仓库
2. 点击 **Settings** (设置)
3. 左侧菜单选择 **Branches** (分支)
4. 点击 **Add branch protection rule** (添加分支保护规则)

### 2. 配置 main 分支保护

#### 基础配置

**Branch name pattern** (分支名称模式):
```
main
```

#### 推荐的保护规则

勾选以下选项：

##### ✅ 必需配置

- [x] **Require a pull request before merging**
  - 要求通过 PR 才能合并到 main
  - [x] **Require approvals**: 1 (至少需要 1 个审批)
  - [ ] **Dismiss stale pull request approvals when new commits are pushed**
    - 新提交时清除旧的审批（可选，严格模式）
  - [ ] **Require review from Code Owners**
    - 需要代码所有者审批（可选）

- [x] **Require status checks to pass before merging**
  - 要求 CI 检查通过才能合并
  - [x] **Require branches to be up to date before merging**
    - 要求分支是最新的
  - 选择必需的状态检查：
    - [x] `Lint and Type Check`
    - [x] `Build Web`
    - [x] `Build Desktop`
    - [x] `Code Quality Checks` (如果有)

- [x] **Require conversation resolution before merging**
  - 要求解决所有对话后才能合并

- [x] **Require signed commits** (可选，更安全)
  - 要求签名提交

- [x] **Require linear history** (推荐)
  - 要求线性历史，防止合并提交混乱

- [x] **Do not allow bypassing the above settings**
  - 管理员也不能绕过规则（推荐）

##### ✅ 防止破坏性操作

- [x] **Lock branch** (可选，完全锁定)
  - 完全锁定分支，只读模式

- [x] **Do not allow force pushes**
  - 禁止强制推送

- [x] **Do not allow deletions**
  - 禁止删除分支

#### 保存配置

点击 **Create** 或 **Save changes**

## 配置截图指南

### 步骤 1: 进入设置
```
仓库首页 → Settings → Branches → Add branch protection rule
```

### 步骤 2: 填写分支名称
```
Branch name pattern: main
```

### 步骤 3: 勾选保护选项

**最小配置（适合个人项目）**:
```
✅ Require a pull request before merging
  └─ Require approvals: 0 (个人项目可以自己合并)
✅ Require status checks to pass before merging
  └─ 选择 CI workflows
✅ Do not allow force pushes
✅ Do not allow deletions
```

**标准配置（适合小团队）**:
```
✅ Require a pull request before merging
  └─ Require approvals: 1
✅ Require status checks to pass before merging
  └─ Require branches to be up to date
  └─ 选择所有 CI workflows
✅ Require conversation resolution before merging
✅ Require linear history
✅ Do not allow force pushes
✅ Do not allow deletions
```

**严格配置（适合大团队）**:
```
✅ Require a pull request before merging
  └─ Require approvals: 2
  └─ Dismiss stale pull request approvals
  └─ Require review from Code Owners
✅ Require status checks to pass before merging
  └─ Require branches to be up to date
  └─ 选择所有 CI workflows
✅ Require conversation resolution before merging
✅ Require signed commits
✅ Require linear history
✅ Do not allow bypassing the above settings
✅ Do not allow force pushes
✅ Do not allow deletions
```

## 同时保护 develop 分支

如果你使用 Git Flow 工作流，也应该保护 develop 分支：

1. 再次点击 **Add branch protection rule**
2. Branch name pattern: `develop`
3. 使用相同或稍微宽松的规则

## 使用通配符保护多个分支

保护所有 release 分支：
```
Branch name pattern: release/*
```

保护所有重要分支：
```
Branch name pattern: main
Branch name pattern: develop
Branch name pattern: release/*
Branch name pattern: hotfix/*
```

## 配置后的工作流程

### 1. 日常开发流程

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
# 6. 请求代码审查（如果需要）
# 7. 合并 PR
```

### 2. 紧急修复流程

```bash
# 1. 创建 hotfix 分支
git checkout -b hotfix/critical-bug

# 2. 修复和提交
git add .
git commit -m "fix: 修复严重 bug"

# 3. 推送并创建 PR
git push origin hotfix/critical-bug

# 4. 快速审查和合并
```

### 3. 如果需要绕过保护（紧急情况）

如果你是管理员且确实需要直接推送：

1. 临时禁用分支保护
2. 进行必要的操作
3. 立即重新启用保护

**注意**: 这应该是极少数情况！

## 验证配置

### 测试分支保护

```bash
# 尝试直接推送到 main（应该失败）
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test: 测试分支保护"
git push origin main

# 预期结果：
# remote: error: GH006: Protected branch update failed
# 这说明分支保护生效了！
```

### 正确的流程

```bash
# 创建分支
git checkout -b test/branch-protection
echo "test" >> README.md
git add README.md
git commit -m "test: 测试分支保护"
git push origin test/branch-protection

# 然后在 GitHub 上创建 PR
```

## 团队协作建议

### 对于个人项目

**推荐配置**:
- ✅ 要求 PR
- ✅ 要求 CI 通过
- ✅ 禁止强制推送
- ✅ 禁止删除
- ❌ 不需要审批（自己可以合并）

### 对于 2-5 人团队

**推荐配置**:
- ✅ 要求 PR
- ✅ 要求 1 个审批
- ✅ 要求 CI 通过
- ✅ 要求解决对话
- ✅ 禁止强制推送
- ✅ 禁止删除

### 对于大团队

**推荐配置**:
- ✅ 要求 PR
- ✅ 要求 2 个审批
- ✅ 要求代码所有者审批
- ✅ 要求 CI 通过
- ✅ 要求签名提交
- ✅ 要求线性历史
- ✅ 管理员也不能绕过
- ✅ 禁止强制推送
- ✅ 禁止删除

## 常见问题

### Q: 我是唯一的开发者，需要配置审批吗？

A: 个人项目可以不要求审批，但建议至少要求 CI 通过。这样可以防止意外推送未测试的代码。

### Q: 如何允许自己合并 PR？

A: 在 "Require approvals" 中设置为 0，或者不勾选 "Require review from Code Owners"。

### Q: CI 检查失败了怎么办？

A: 
1. 查看 CI 日志找出问题
2. 在分支上修复问题
3. 推送新的提交
4. CI 会自动重新运行

### Q: 如何临时禁用分支保护？

A: 
1. Settings → Branches
2. 找到对应的规则
3. 点击 Edit
4. 取消勾选需要禁用的选项
5. 完成操作后立即恢复

### Q: 分支保护会影响 GitHub Actions 吗？

A: 不会。GitHub Actions 使用 `GITHUB_TOKEN` 可以正常工作。但如果你勾选了 "Do not allow bypassing"，Actions 也需要遵守规则。

## 高级配置

### 使用 Rulesets (新功能)

GitHub 现在提供了更强大的 Rulesets 功能：

1. Settings → Rules → Rulesets
2. New ruleset → New branch ruleset
3. 配置更细粒度的规则

### 配置 CODEOWNERS

我们已经创建了 `.github/CODEOWNERS` 文件，配合分支保护使用：

```
# .github/CODEOWNERS
* @jeasoncc
/apps/desktop/ @jeasoncc
/apps/web/ @jeasoncc
```

启用 "Require review from Code Owners" 后，修改这些路径的 PR 必须由对应的所有者审批。

## 推荐的完整配置

基于你的项目特点，我推荐以下配置：

### main 分支

```
Branch name pattern: main

✅ Require a pull request before merging
  └─ Require approvals: 0 (个人项目，可以自己合并)
  
✅ Require status checks to pass before merging
  └─ Require branches to be up to date before merging
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

### develop 分支（如果使用）

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

## 配置完成后

1. ✅ 测试分支保护是否生效
2. ✅ 更新团队文档
3. ✅ 通知团队成员新的工作流程
4. ✅ 创建第一个 PR 测试流程

## 相关文档

- [GitHub 分支保护文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [CODEOWNERS 文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [签名提交指南](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)

---

配置分支保护后，你的代码库将更加安全和规范！🛡️
