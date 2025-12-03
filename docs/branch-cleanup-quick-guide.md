# 🧹 分支清理快速指南

## 为什么有这么多分支？

GitHub 显示 9 个分支可能是因为：
- ✅ 开发过程中创建的功能分支
- ✅ PR 合并后未删除的分支
- ✅ 测试分支
- ✅ Dependabot 创建的更新分支

## 🚀 快速清理（3 分钟）

### 方法一：使用清理脚本（推荐）

```bash
./scripts/cleanup-branches.sh
```

脚本会自动：
- 查找已合并的分支
- 查找过期的分支
- 询问是否删除
- 显示清理结果

### 方法二：手动清理

#### 1. 查看所有分支

```bash
# 本地分支
git branch

# 远程分支
git branch -r

# 所有分支
git branch -a
```

#### 2. 删除本地已合并的分支

```bash
# 查看已合并的分支
git branch --merged main

# 批量删除（排除 main 和 develop）
git branch --merged main | grep -v "^\*" | grep -v "main" | grep -v "develop" | xargs -n 1 git branch -d
```

#### 3. 清理远程已删除的分支引用

```bash
git fetch --prune
```

#### 4. 删除远程分支

```bash
# 删除单个远程分支
git push origin --delete branch-name

# 或使用简写
git push origin :branch-name
```

## 🌐 在 GitHub 网页上清理

### 1. 查看所有分支

访问: https://github.com/jeasoncc/novel-editor/branches

### 2. 删除分支

- 找到要删除的分支
- 点击右侧的垃圾桶图标 🗑️
- 确认删除

### 3. 批量删除

- 点击 "Stale" 标签查看过期分支
- 点击 "Delete stale branches" 批量删除

## ⚙️ 配置自动删除

### 在 GitHub 上配置

1. 进入仓库 Settings
2. 找到 "Pull Requests" 部分
3. 勾选 **"Automatically delete head branches"**

这样 PR 合并后会自动删除分支！

## 📋 推荐的分支管理策略

### 保留的分支

- ✅ **main** - 主分支（永久）
- ✅ **develop** - 开发分支（可选，永久）

### 临时分支（用完即删）

- ✅ **feat/*** - 功能分支
- ✅ **fix/*** - 修复分支
- ✅ **docs/*** - 文档分支
- ✅ **test/*** - 测试分支

### 分支生命周期

```
创建分支 → 开发 → 推送 → 创建 PR → 合并 → 删除分支
```

## 🎯 最佳实践

### 1. 及时删除已合并的分支

```bash
# PR 合并后立即删除
git checkout main
git pull
git branch -d feat/feature-name
```

### 2. 使用规范的分支命名

```bash
feat/add-export        # ✅ 好
fix/login-bug          # ✅ 好
test-branch            # ❌ 不好
my-changes             # ❌ 不好
```

### 3. 定期清理（每周或每月）

```bash
# 运行清理脚本
./scripts/cleanup-branches.sh

# 或手动清理
git fetch --prune
git branch --merged main | grep -v "^\*" | grep -v "main" | xargs -n 1 git branch -d
```

### 4. 保持分支数量在 5 个以内

- 1 个 main 分支
- 1 个 develop 分支（可选）
- 2-3 个活跃的功能分支

## 🔍 常用命令

### 查看分支信息

```bash
# 查看分支及最后提交
git branch -v

# 查看分支及上游
git branch -vv

# 查看已合并的分支
git branch --merged main

# 查看未合并的分支
git branch --no-merged main
```

### 删除分支

```bash
# 删除本地分支（已合并）
git branch -d branch-name

# 强制删除本地分支（未合并）
git branch -D branch-name

# 删除远程分支
git push origin --delete branch-name
```

### 清理引用

```bash
# 清理远程已删除的分支引用
git fetch --prune

# 或使用
git remote prune origin
```

## 🚨 注意事项

### 不要删除的分支

- ❌ main
- ❌ develop（如果使用）
- ❌ 其他人正在使用的分支
- ❌ 未合并的重要分支

### 删除前确认

1. ✅ 确认分支已合并
2. ✅ 确认没有未推送的提交
3. ✅ 确认没有其他人在使用

## 💡 你的项目建议

基于你的项目，建议：

### 1. 立即清理

```bash
# 运行清理脚本
./scripts/cleanup-branches.sh
```

### 2. 配置自动删除

- Settings → General → Pull Requests
- 勾选 "Automatically delete head branches"

### 3. 采用简单的分支策略

```
main
  ↑
  ├─ feat/new-feature
  ├─ fix/bug-fix
  └─ docs/update-docs
```

### 4. 工作流程

```bash
# 1. 创建分支
git checkout -b feat/new-feature

# 2. 开发
git add .
git commit -m "feat: 添加新功能"

# 3. 推送
git push origin feat/new-feature

# 4. 创建 PR 并合并

# 5. 删除分支
git checkout main
git pull
git branch -d feat/new-feature
```

## 📊 检查分支健康度

```bash
# 查看分支数量
echo "本地分支: $(git branch | wc -l)"
echo "远程分支: $(git branch -r | wc -l)"

# 查看最旧的分支
git for-each-ref --sort=committerdate refs/heads/ --format='%(committerdate:short) %(refname:short)' | head -5

# 查看最新的分支
git for-each-ref --sort=-committerdate refs/heads/ --format='%(committerdate:short) %(refname:short)' | head -5
```

## 🔗 相关链接

- [完整分支管理指南](branch-management-guide.md)
- [GitHub 分支文档](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches)

---

保持分支整洁，让开发更高效！🌿
