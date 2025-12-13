# 🔧 脚本工具说明

## 核心脚本

### create-tag.sh

创建 Git 标签以触发 CI/CD 发布流程。

**使用**：
```bash
# 智能 Linux 发布（推荐）
npm run tag:linux

# 单独发布 desktop
npm run tag:desktop

# 单独发布 snap
npm run tag:linux:snap

# 查看帮助
./scripts/create-tag.sh --help
```

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
- `aur/PKGBUILD`
- `aur/PKGBUILD-bin`

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
