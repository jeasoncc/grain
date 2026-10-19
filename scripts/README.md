# 🔧 脚本工具说明

## 核心脚本

### create-tag.sh

创建并推送 Git 标签。`desktop-v*.*.*` 只发布 GitHub Release 中的 Windows、macOS 和 Linux 安装包，不自动发布到外部包管理器，也不生成自动更新清单。

```bash
# GitHub 安装包发布
bun run tag:desktop

# 独立发布：Snap 为 Org Notes，默认请求 edge；Web 单独部署
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

### test-linux-snap.mjs / linux-snap-accessibility.py

仅用于**可销毁、具备真实 systemd 用户会话的 Ubuntu 24.04 amd64 主机**，不用于日常电脑。需要 snapd、严格 AppArmor/seccomp、sudo、X11/Openbox、AT-SPI、GTK desktop portal、ImageMagick、Tesseract 和字体，依赖列表见 [Snap 工作流](../.github/workflows/snap-publish.yml)。拒绝已有的 `org-notes` 安装及残留状态，不会卸载用户原有的包。

```bash
ORG_NOTES_DISPOSABLE_HOST=1 node scripts/test-linux-snap.mjs \
  "$PWD/artifacts/packages/org-notes_0.1.606_amd64.snap" \
  "$PWD/artifacts/snap-readiness/local"
```

脚本安装给定包，不使用 devmode/classic；核对 snapd 的实际包哈希、运行程序的精确 AppArmor label 和 seccomp 状态。独立临时用户中通过 AT-SPI 操作真实 GTK 目录选择器，通过实际屏幕 OCR 与键鼠输入操作网页编辑器并显式保存，再验证默认工作区 Unicode/CRLF 字节和全进程停止后重开。使用用户自身的 systemd/bus、独立 Xvfb 和真实 GTK portal，不替换文件 IO、不注入 DOM 或控制器；不把光学操作成功冒充完整辅助功能支持。

结束时保留日志、截图、字节和进程证据，只清理本次创建的包、用户与资源；清理失败同样失败。该门禁不证明商店审核或公开频道可安装，完整边界见 [Org Notes Snap](../docs/publishing-platforms-guide.md#org-notes-snap-独立版)。

### build-msix.ps1

直接打包真实的 x64 Tauri EXE，不经 MSI/NSIS 或 cargo-packager。输入为桌面 release EXE，输出到 `artifacts/windows-msix/`，包含 MSIX、公开 `.cer`、Manifest、哈希/身份元数据和工具日志。短期测试私钥不可导出，完成后删除；这不是 Store 认证或普通用户旁加载签名。

仅在一次性 Windows 构建环境，从仓库根运行：

```powershell
./scripts/build-msix.ps1
```

脚本固定使用 Partner Center 为独立 **Grain Org** 分配的 `Jeason.GrainOrg` / `9PF3WZLSWZHX`，不需要额外 repository variables 或商店账号凭据。输出 `grain_<版本>_x64.msix`、`purpose=store-candidate`；只能在同一个包通过安装后验证后上传，不能把自签名当作认证。历史 `_readiness` 测试身份不再生成，也不能提交 Store。

### test-windows-msix.ps1 / windows-msix-smoke.mjs

仅用于可销毁的交互式管理员 Windows 环境，不用于日常电脑。Windows PowerShell 验证实际包与 WebView2、临时信任本次代码签名叶证书并安装/激活 MSIX；Node/Playwright 连接真实应用的 WebView2，验证原生权限与无覆盖写入、文件树打开、编辑器 Unicode 输入/Ctrl+S、CRLF 磁盘字节和全进程重启后的重新打开。

```powershell
powershell.exe -NoProfile -File ./scripts/test-windows-msix.ps1
```

运行时缺少时单独部署经过 Microsoft 签名验证的 Evergreen；MSIX 不内置运行时。脚本保留真实日志、截图与报告，执行可用的 WACK，并在结束时还原调试覆盖、移除本次包与 `TrustedPeople` 叶证书；不添加根 CA。清理失败也会失败。Windows 原生 IME composition 和 Microsoft Store 审核不在该 smoke 的证明范围内。

详见 [MSIX 自动化](../docs/msix-automation-guide.md)、[打包信任边界](../docs/msix-packaging-guide.md)及[商店提交](../docs/microsoft-store-guide.md)。

### windows-store-gallery.mjs（可选商店截图）

在 **Windows Native Readiness** 的 `workflow_dispatch` 中选择 `store_gallery=true`，或使用：

```sh
gh workflow run windows-readiness.yml --ref main -f store_gallery=true
```

也可在会触发此工作流的 `main` 提交消息中加入 `[store-gallery]`，显式开启本次图库采集；普通 push 仍不生成图库。

仅在同一次 run 的安装、安全检查和全进程重启证明通过后，额外启动真实 MSIX 窗口，创建虚构的中英双语 Org 笔记，通过实际 UI 捕获六个不同场景：写作与提纲、分栏参考资料、Agenda、Capture、Quick Open、链接笔记与反向链接。脚本使用原生 workspace 文件命令创建并读回样例，拒绝包含其他笔记的非一次性 profile，不替换 bridge、应用状态或渲染 HTML。

已有 `windows-readiness-<run_id>-<run_attempt>` artifact 自动包含 `store-gallery/01-*.png` 至 `06-*.png`、`manifest.json` 和日志。Manifest 逐张记录场景、中英说明、SHA-256、真实 PNG/viewport 像素尺寸、安装包身份/版本/哈希及原生窗口来源，不保存 capability token。必须六场景全部就绪且原始 PNG 至少 1366 × 768、每张不超过 50 MB；失败场景不静默跳过，部分产物标记 `failed`，不能当作完整商店图库。

已有构建流程仍会生成供安装与截图证明使用的 CI 包，但图库操作不上传或替换 Store 安装包。此 listing 更新固定现有应用 `0.1.606` / MSIX `1.1.606.0` 和新产品 `9PF3WZLSWZHX`；不得把自签名 CI 包当作本次元数据更新的新提交包。生产图标、身份及旧商店产品保持不变。WACK、日志上传和清理行为不变。

本地仅限可销毁的交互式管理员 Windows 环境，使用 `powershell.exe -NoProfile -File ./scripts/test-windows-msix.ps1 -StoreGallery`；不要直接运行图库脚本绕过安装与重启门禁。样例留在一次性 runner profile，图片留在 readiness 输出目录；上传前必须人工检查实际 Windows 产物，脚本实现本身不证明已获得合格截图。

## 工具目录

### snapcraft-login/

用于获取 Snap Store 登录凭证的 Docker 工具。详见 `snapcraft-login/README.md`。
