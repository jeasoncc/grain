# 🔧 脚本工具说明

## 核心脚本

### create-tag.sh

创建并推送 Git 标签。`desktop-v*.*.*` 只发布 GitHub Release 中的 Windows、macOS 和 Linux 安装包，不自动发布到外部包管理器，也不生成自动更新清单。

```bash
# GitHub 安装包发布
bun run tag:desktop

# 独立发布，使用前确认对应平台的包名和权限
bun run tag:snap
bun run tag:web

# 查看帮助，不创建标签
bun run tag:help
```

`tag:linux` 只组合 desktop 与 snap；`tag:all` 只组合 desktop、snap、web，不代表所有渠道已上架。外部包管理器只保留手动 `workflow_dispatch`，需要单独核对包名归属、凭据、提交与审核结果。

完整边界与验收步骤见[发布工作流](../docs/automated-release-workflow.md)。

### bump-version.sh

自动递增版本号的脚本。

**功能**：
- 从根目录 `package.json` 读取当前版本
- 自动递增 patch 版本（0.1.0 → 0.1.1）
- 同步更新所有相关文件的版本号

**使用**：
```bash
npm run version:bump
# 或
./scripts/bump-version.sh
```

**更新的文件**：
- `package.json` (根目录)
- `apps/desktop/package.json`
- `apps/web/package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `aur/PKGBUILD`、`aur/PKGBUILD-binary`
- `snap/snapcraft.yaml`、`flatpak/com.lotus.Grain.yml`
- `winget-manifests/Jeason.Grain*.yaml`

更新版本后用 `bun install --lockfile-only --ignore-scripts` 更新 `bun.lock`，并通过 Tauri 构建同步原生 `Cargo.lock`。版本同步不等于渠道发布。

### update-icons.sh

更新应用图标的脚本。

**使用**：
```bash
npm run icons:update
```

### check-download-stats.sh

检查各平台下载统计。

**使用**：
```bash
npm run stats:check
```

### dev.sh

本地开发启动脚本。

## 工具目录

### snapcraft-login/

用于获取 Snap Store 登录凭证的 Docker 工具。详见 `snapcraft-login/README.md`。
