# GitHub Workflows 说明

## 当前的 5 个 Workflows

### 1. deploy-web.yml - Web 应用部署
**触发条件：**
- 手动触发
- Push 到 `main` 分支且修改了 `apps/web/**` 文件

**作用：**
- 构建 Web 应用
- 部署到 GitHub Pages

**运行时间：** ~2-3 分钟

---

### 2. release-desktop.yml - 桌面应用发布
**触发条件：**
- 手动触发
- Push 到 `release` 分支
- 创建 `v*.*.*` 或 `desktop-v*.*.*` tag

**作用：**
- 为多个平台构建 Tauri 应用（Windows, macOS, Linux）
- 创建 GitHub Release（草稿）
- 上传安装包

**运行时间：** ~15-30 分钟（多平台并行）

---

### 3. aur-publish.yml - AUR 包发布
**触发条件：**
- Release 发布时
- 手动触发
- 创建 `desktop-v*.*.*` tag

**作用：**
- 更新 PKGBUILD 版本号
- 发布到 AUR（Arch User Repository）

**运行时间：** ~2-3 分钟

---

### 4. release-notes.yml - 发布说明生成
**触发条件：**
- Release 创建或编辑时
- 手动触发

**作用：**
- 自动生成发布说明
- 按类型分组提交（feat, fix, docs 等）
- 添加统计信息和安装说明

**运行时间：** ~1 分钟

---

### 5. snap-publish.yml - Snap Store 发布
**触发条件：**
- 创建 `snap-v*.*.*` tag
- 手动触发

**作用：**
- 构建 Snap 包
- 发布到 Snap Store

**运行时间：** ~10-15 分钟

---

## 典型发布流程

### 发布新版本的完整流程：

```bash
# 1. 更新版本号（会自动更新所有相关文件）
./scripts/bump-version.sh

# 2. 提交版本号更新
git add .
git commit -m "chore: bump version to 0.1.9"
git push origin main

# 3. 创建 desktop tag（触发 desktop 发布）
git tag desktop-v0.1.9
git push origin desktop-v0.1.9
# 触发：release-desktop.yml, aur-publish.yml

# 4. 在 GitHub 上发布 Release
# 触发：release-notes.yml（自动生成说明）

# 5. （可选）发布到 Snap Store
git tag snap-v0.1.9
git push origin snap-v0.1.9
# 触发：snap-publish.yml
```

### 只更新 Web 应用：

```bash
# 修改 apps/web 下的文件
git add apps/web
git commit -m "feat(web): add new feature"
git push origin main
# 触发：deploy-web.yml（自动部署）
```

---

## Dependabot 配置

### 当前设置：
- **频率：** 每月一次（Monday 09:00）
- **同时打开的 PR 数量：** 最多 3 个
- **分组策略：** 将 minor 和 patch 更新分组到一个 PR

### 为什么这样配置？

之前是每周更新，导致：
- 每周产生大量 PR
- 每个 PR 都触发 workflows
- 消耗大量 GitHub Actions 配额

现在改为每月更新：
- 减少 PR 数量
- 减少 workflow 运行次数
- 依然保持依赖更新

### 手动更新依赖：

如果需要立即更新某个依赖：

```bash
# 更新所有依赖
bun update

# 更新特定依赖
bun update <package-name>

# 检查过时的依赖
bun outdated
```

---

## Workflow 运行次数优化

### 优化前的问题：
- Dependabot 每周创建 ~50 个 PR
- 每个 PR 触发多个 workflows
- 每周运行 ~200+ 次 workflows

### 优化后：
- Dependabot 每月创建 ~10 个 PR（分组后）
- 只在必要时触发 workflows
- 每月运行 ~50 次 workflows

### 进一步优化建议：

1. **合并 Dependabot PR 时使用 squash merge**
   - 减少提交历史噪音
   - 更清晰的版本历史

2. **定期批量处理 Dependabot PR**
   - 每月集中处理一次
   - 测试后一起合并

3. **关闭不需要的 Dependabot 更新**
   - 如果某些依赖很稳定，可以禁用自动更新

---

## 监控和调试

### 查看 Workflow 运行情况：
https://github.com/your-username/novel-editor/actions

### 取消正在运行的 Workflows：
```bash
# 使用 GitHub CLI
gh run list --status in_progress
gh run cancel <run-id>
```

### 禁用某个 Workflow：
在 workflow 文件顶部添加：
```yaml
on:
  workflow_dispatch:  # 只允许手动触发
```

---

## 常见问题

### Q: 为什么一次提交触发了多个 workflows？
A: 因为不同的 workflows 有不同的触发条件，一次提交可能满足多个条件。

### Q: 如何临时禁用 Dependabot？
A: 在 `.github/dependabot.yml` 中设置 `open-pull-requests-limit: 0`

### Q: Workflow 失败了怎么办？
A: 
1. 查看失败日志
2. 修复问题
3. 重新运行 workflow（GitHub Actions 页面有 "Re-run" 按钮）

### Q: 如何减少 Actions 配额消耗？
A:
1. 减少 Dependabot 频率（已优化）
2. 使用 `paths` 过滤器（已配置）
3. 使用 `concurrency` 取消重复运行（已配置）
4. 只在必要的分支运行（已配置）
