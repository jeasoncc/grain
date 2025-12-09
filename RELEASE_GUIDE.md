# 🚀 发布指南

## 📋 发布流程概览

所有发布流程都通过 **打 tag** 触发，不会在每次提交时自动构建。

## 🏷️ Tag 命名规范

| 平台 | Tag 格式 | 示例 | 触发的工作流 |
|------|---------|------|-------------|
| **Desktop** | `desktop-v*.*.*` | `desktop-v0.1.7` | Release Desktop App |
| **AUR** | `aur-v*.*.*` | `aur-v0.1.7` | Publish to AUR |
| **Snap** | `snap-v*.*.*` | `snap-v0.1.7` | Publish to Snap Store |
| **Web** | `web-v*.*.*` | `web-v0.1.7` | Deploy Website |

## 🎯 发布步骤

### 1️⃣ 发布桌面应用 (Desktop)

```bash
# 创建并推送 tag
git tag desktop-v0.1.7
git push origin desktop-v0.1.7
```

**构建内容**：
- ✅ Windows (MSI, NSIS, MSIX)
- ✅ macOS (DMG, App - Intel & Apple Silicon)
- ✅ Linux (DEB, AppImage, RPM)

**产物位置**：
- GitHub Release (draft)
- GitHub Actions Artifacts

**时间**：约 20-30 分钟

---

### 2️⃣ 发布到 AUR

```bash
# 创建并推送 tag
git tag aur-v0.1.7
git push origin aur-v0.1.7
```

**构建内容**：
- ✅ 更新 PKGBUILD
- ✅ 生成 .SRCINFO
- ✅ 推送到 AUR 仓库

**安装命令**：
```bash
yay -S novel-editor
# 或
paru -S novel-editor
```

**时间**：约 5 分钟

---

### 3️⃣ 发布到 Snap Store

```bash
# 创建并推送 tag
git tag snap-v0.1.7
git push origin snap-v0.1.7
```

**构建内容**：
- ✅ 构建 Snap 包
- ✅ 发布到 Snap Store (edge channel)

**安装命令**：
```bash
sudo snap install novel-editor --edge
```

**时间**：约 15-20 分钟

---

### 4️⃣ 部署网站 (Web)

```bash
# 创建并推送 tag
git tag web-v0.1.7
git push origin web-v0.1.7
```

**构建内容**：
- ✅ 构建 Next.js 静态站点
- ✅ 部署到 GitHub Pages

**访问地址**：
- https://yourusername.github.io/novel-editor

**时间**：约 5 分钟

---

## 🔄 完整发布流程

如果要同时发布所有平台：

```bash
VERSION="0.1.7"

# 1. 发布桌面应用
git tag desktop-v$VERSION
git push origin desktop-v$VERSION

# 2. 等待桌面应用构建完成后，发布到 AUR
git tag aur-v$VERSION
git push origin aur-v$VERSION

# 3. 发布到 Snap Store
git tag snap-v$VERSION
git push origin snap-v$VERSION

# 4. 部署网站
git tag web-v$VERSION
git push origin web-v$VERSION
```

**推荐顺序**：
1. Desktop（生成安装包）
2. AUR（依赖 Desktop 的 release）
3. Snap（独立构建）
4. Web（独立部署）

---

## 🛠️ 手动触发

如果需要手动触发（不打 tag）：

### Desktop
1. 进入 Actions → Release Desktop App
2. 点击 "Run workflow"
3. 选择分支并运行

### AUR
1. 进入 Actions → Publish to AUR
2. 点击 "Run workflow"
3. 输入版本号（如 `0.1.7`）
4. 运行

### Snap
1. 进入 Actions → Publish to Snap Store
2. 点击 "Run workflow"
3. 选择 channel (edge/beta/candidate/stable)
4. 运行

### Web
1. 进入 Actions → Deploy Website
2. 点击 "Run workflow"
3. 选择分支并运行

---

## 📝 版本号管理

### 更新版本号

在发布前，确保更新以下文件中的版本号：

```bash
# 1. 根目录 package.json
"version": "0.1.7"

# 2. Desktop package.json
apps/desktop/package.json
"version": "0.1.7"

# 3. Tauri 配置
apps/desktop/src-tauri/tauri.conf.json
"version": "0.1.7"

# 4. AUR PKGBUILD
aur/PKGBUILD
pkgver=0.1.7

# 5. Snap snapcraft.yaml
snap/snapcraft.yaml
version: '0.1.7'
```

### 使用脚本自动更新

```bash
# 使用 bump-version 脚本
./scripts/bump-version.sh 0.1.7
```

---

## ✅ 发布检查清单

发布前确认：

- [ ] 所有测试通过
- [ ] 版本号已更新
- [ ] CHANGELOG 已更新
- [ ] 文档已更新
- [ ] 本地测试通过

发布后确认：

- [ ] GitHub Release 创建成功
- [ ] 所有平台的安装包可下载
- [ ] AUR 包可安装
- [ ] Snap 包可安装
- [ ] 网站已更新

---

## 🔧 MSIX 特殊配置

如果要发布到 Microsoft Store，需要配置 GitHub Secrets：

1. 进入 Settings → Secrets and variables → Actions
2. 添加以下 secrets：
   - `MSIX_IDENTITY_NAME`: 从 Partner Center 获取
   - `MSIX_PUBLISHER`: 从 Partner Center 获取
   - `MSIX_PUBLISHER_DISPLAY_NAME`: 你的公司名称

详见：[MSIX_QUICK_FIX.md](./MSIX_QUICK_FIX.md)

---

## 🚨 常见问题

### Q: 为什么不在每次提交时自动构建？

A: 构建需要大量时间和资源，只在发布时构建可以：
- 节省 GitHub Actions 配额
- 避免不必要的构建
- 更好地控制发布节奏

### Q: 如何回滚版本？

A: 删除 tag 并重新创建：

```bash
# 删除本地 tag
git tag -d desktop-v0.1.7

# 删除远程 tag
git push origin :refs/tags/desktop-v0.1.7

# 重新创建并推送
git tag desktop-v0.1.7
git push origin desktop-v0.1.7
```

### Q: 可以同时推送多个 tag 吗？

A: 可以，但建议分开推送，便于监控每个平台的构建状态。

### Q: 如何测试构建流程？

A: 使用手动触发（workflow_dispatch），不需要打 tag。

---

## 📚 相关文档

- [MSIX 快速修复](./MSIX_QUICK_FIX.md)
- [MSIX 名称修复指南](./MICROSOFT_STORE_NAME_FIX.md)
- [AUR 发布指南](./docs/AUR发布指南.md)
- [Snap Store 指南](./docs/snap-store-guide.md)

---

**提示**：首次发布建议先手动触发测试，确认流程正常后再使用 tag 自动触发。
