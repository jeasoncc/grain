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

### build-msix.ps1

直接打包真实的 x64 Tauri EXE，不经 MSI/NSIS 或 cargo-packager。输入为桌面 release EXE，输出到 `artifacts/windows-msix/`，包含 MSIX、公开 `.cer`、Manifest、哈希/身份元数据和工具日志。短期测试私钥不可导出，完成后删除；这不是 Store 认证或普通用户旁加载签名。

仅在一次性 Windows 构建环境，从仓库根运行：

```powershell
./scripts/build-msix.ps1 -ReadinessOnly
```

该模式使用 `Grain.WindowsReadiness` 独立测试身份，包名带 `_readiness`，不能提交商店。正式模式不带此开关，必须提供独立 Org 产品的 `GRAIN_STORE_PRODUCT_ID`、`GRAIN_STORE_IDENTITY`、`GRAIN_STORE_PUBLISHER`（或对应 `-Store*` 参数）；缺少配置或沿用旧产品身份会失败。

### test-windows-msix.ps1 / windows-msix-smoke.mjs

仅用于可销毁的交互式管理员 Windows 环境，不用于日常电脑。Windows PowerShell 验证实际包与 WebView2、临时信任本次代码签名叶证书并安装/激活 MSIX；Node/Playwright 连接真实应用的 WebView2，验证原生权限与无覆盖写入、文件树打开、编辑器 Unicode 输入/Ctrl+S、CRLF 磁盘字节和全进程重启后的重新打开。

```powershell
powershell.exe -NoProfile -File ./scripts/test-windows-msix.ps1
```

运行时缺少时单独部署经过 Microsoft 签名验证的 Evergreen；MSIX 不内置运行时。脚本保留真实日志、截图与报告，执行可用的 WACK，并在结束时还原调试覆盖、移除本次包与 `TrustedPeople` 叶证书；不添加根 CA。清理失败也会失败。Windows 原生 IME composition 和 Microsoft Store 审核不在该 smoke 的证明范围内。

详见 [MSIX 自动化](../docs/msix-automation-guide.md)、[打包信任边界](../docs/msix-packaging-guide.md)及[商店提交](../docs/microsoft-store-guide.md)。

## 工具目录

### snapcraft-login/

用于获取 Snap Store 登录凭证的 Docker 工具。详见 `snapcraft-login/README.md`。
