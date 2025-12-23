# 发布流程

所有发布通过 **打 tag** 触发，不会在每次提交时自动构建。

## Tag 命名规范

| 平台 | Tag 格式 | 示例 | 说明 |
|------|---------|------|------|
| Desktop | `desktop-v*.*.*` | `desktop-v0.1.7` | Windows/macOS/Linux 安装包 |
| AUR | `aur-v*.*.*` | `aur-v0.1.7` | Arch Linux 包 |
| Snap | `snap-v*.*.*` | `snap-v0.1.7` | Snap Store |
| Web | `web-v*.*.*` | `web-v0.1.7` | 网站部署 |

## 快速发布命令

```bash
# 发布桌面应用
git tag desktop-v0.1.7
git push origin desktop-v0.1.7

# 发布到 AUR
git tag aur-v0.1.7
git push origin aur-v0.1.7

# 发布到 Snap Store
git tag snap-v0.1.7
git push origin snap-v0.1.7

# 部署网站
git tag web-v0.1.7
git push origin web-v0.1.7
```

## 完整发布流程

```bash
VERSION="0.1.7"

# 推荐顺序：Desktop → AUR → Snap → Web
git tag desktop-v$VERSION && git push origin desktop-v$VERSION
# 等待 Desktop 构建完成后
git tag aur-v$VERSION && git push origin aur-v$VERSION
git tag snap-v$VERSION && git push origin snap-v$VERSION
git tag web-v$VERSION && git push origin web-v$VERSION
```

## 使用脚本发布

```bash
# 创建桌面应用 tag
npm run tag:desktop

# 创建所有 tag
npm run tag:all
```

## 构建产物

| 平台 | 产物 | 位置 |
|------|------|------|
| Windows | MSI, NSIS, MSIX | GitHub Releases |
| macOS | DMG, App | GitHub Releases |
| Linux | DEB, AppImage, RPM | GitHub Releases |
| AUR | PKGBUILD | AUR 仓库 |
| Snap | snap 包 | Snap Store |

## 版本号管理

版本号由 pre-commit hook 自动递增，无需手动更新。

如需手动更新：
```bash
npm run version:bump
```

## 回滚版本

```bash
# 删除本地和远程 tag
git tag -d desktop-v0.1.7
git push origin :refs/tags/desktop-v0.1.7

# 重新创建
git tag desktop-v0.1.7
git push origin desktop-v0.1.7
```

## 发布检查清单

发布前：
- [ ] 所有测试通过
- [ ] 本地测试通过
- [ ] CHANGELOG 已更新

发布后：
- [ ] GitHub Release 创建成功
- [ ] 安装包可下载
- [ ] 各平台可安装

## 详细文档

- `docs/release/RELEASE_GUIDE.md` - 完整发布指南
- `docs/release/DISTRIBUTION_STRATEGY.md` - 分发策略
