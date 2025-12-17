# 🔒 修复 GitHub Token 泄露问题

## ⚠️ 立即行动（最重要！）

**第一步：撤销泄露的 Token**

1. 访问 GitHub Token 设置页面：
   ```
   https://github.com/settings/tokens
   ```

2. 找到泄露的 token（以 `github_pat_11AIIRJQA0V4Bb3REIPUvV_` 开头）

3. 点击 "Delete" 删除这个 token

4. 如果需要，创建一个新的 token

## 🔧 修复 Git 历史

### 方案 1：重置到远程分支（推荐，最简单）

```bash
# 1. 备份当前工作
git branch backup-$(date +%Y%m%d)

# 2. 重置到远程分支
git reset --hard origin/main

# 3. 重新应用你的更改（不包含敏感文件）
git cherry-pick b364499  # 如果需要这个提交的其他更改

# 4. 确保 .gitignore 已更新
git add .gitignore .kiro/settings/mcp.json.example

# 5. 提交
git commit -m "chore: update gitignore to exclude MCP config files"

# 6. 推送
git push origin main
```

### 方案 2：使用 BFG Repo-Cleaner（彻底清理）

```bash
# 1. 安装 BFG
# macOS: brew install bfg
# Linux: 下载 https://rtyley.github.io/bfg-repo-cleaner/

# 2. 创建仓库镜像
cd ..
git clone --mirror https://github.com/jeasoncc/novel-editor.git

# 3. 清理敏感文件
bfg --delete-files mcp.json novel-editor.git

# 4. 清理引用
cd novel-editor.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. 强制推送
git push --force
```

### 方案 3：使用 git filter-repo（推荐用于大型清理）

```bash
# 1. 安装 git-filter-repo
pip install git-filter-repo

# 2. 移除文件
git filter-repo --path .kiro/settings/mcp.json --invert-paths

# 3. 强制推送
git push origin main --force
```

## 📝 后续步骤

1. ✅ 已更新 `.gitignore` 排除 MCP 配置文件
2. ✅ 已创建 `.kiro/settings/mcp.json.example` 作为模板
3. ⚠️ 需要撤销泄露的 GitHub token
4. ⚠️ 需要清理 Git 历史
5. ⚠️ 通知协作者重新克隆仓库（如果使用方案 2 或 3）

## 🔐 预防措施

1. 使用环境变量存储敏感信息
2. 将配置文件添加到 `.gitignore`
3. 使用 `.example` 文件作为模板
4. 启用 GitHub Secret Scanning
5. 使用 pre-commit hooks 检查敏感信息

## 📚 相关链接

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
