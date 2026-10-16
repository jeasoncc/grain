# MSIX 快速验证

仅在**可销毁的 Windows x64 交互式管理员环境**操作。不要用个人账号的日常工作机器测试临时证书，也不要覆盖已安装的商店版或真实作品。

## 环境

- Bun 1.4.2，以及满足根 `package.json` 要求的 Node.js。
- Rust 1.94 或更新版本、MSVC C++ 构建工具。
- Windows SDK，含 x64 MakeAppx 和 SignTool。
- 原生 Windows PowerShell（`powershell.exe`，不是隐式 PS7 Appx 兼容会话）。
- Microsoft Edge WebView2 Evergreen Runtime。验证脚本可在缺少时单独下载经过 Microsoft 签名验证的官方引导程序；这不是 MSIX 的自带部署能力。

参见 [Tauri 系统依赖](https://v2.tauri.app/start/prerequisites/) 与 [WebView2 分发](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution)。

## 构建真实 EXE

在仓库根目录安装依赖：

```powershell
bun install --frozen-lockfile
```

在 `apps/desktop` 目录构建，无需先生成 MSI/NSIS：

```powershell
bun run tauri build --no-bundle
```

任意命令失败都必须停止，不能拿上一次留下的 EXE 继续验证。

## 原生回归

回到仓库根目录，逐条检查退出码及实际执行的测试数：

```powershell
cargo test --manifest-path packages/rust-core/Cargo.toml --lib org_filesystem::windows -- --nocapture --include-ignored
cargo test --manifest-path packages/rust-core/Cargo.toml --lib org_filesystem::export::windows_platform::tests -- --nocapture
cargo test --manifest-path packages/rust-core/Cargo.toml --lib org_clock_context::platform::tests -- --nocapture
cargo test --manifest-path packages/rust-core/Cargo.toml --lib tauri::commands::org_document_commands::tests -- --nocapture
```

测试失败或零测试均未通过门禁。第一条命令显式执行默认忽略的 EFS 边界测试，只能在启用 EFS 的一次性 NTFS / 用户环境运行；它使用真正的加密文件和目录，环境缺少能力会失败，不算通过。推荐使用 Windows Native Readiness 工作流，它会保留每组日志并在失败时阻止后续打包发布。

## 打包与安装后验证

仍在仓库根目录：

```powershell
./scripts/build-msix.ps1
powershell.exe -NoProfile -File ./scripts/test-windows-msix.ps1
```

构建脚本读取真实桌面版本，例如 `0.1.606` 输出 `grain_0.1.606_x64.msix`，Store Manifest 版本为 `1.1.606.0`。Store 包的 major 始终为应用 major 加一，满足首段非零并保持后续升级顺序；应用自身版本不变，见[版本规则](./msix-packaging-guide.md#身份与版本)。脚本使用 Partner Center 已分配的 `Jeason.GrainOrg` / `9PF3WZLSWZHX`，检查 x64 PE 类型并生成短期测试签名；不需要 cargo-packager、MSIX Packaging Tool、PFX 或密码。

公开的新产品身份已经固定在打包脚本，无需额外设置 repository variables。元数据 `purpose=store-candidate` 不表示已通过安装门禁或 Store 认证；只能提交完整验证成功的同一个包。历史测试身份包不能上传，见[商店指南](./microsoft-store-guide.md)。

安装脚本会验证实际包和运行时、加入本次叶证书的临时 `LocalMachine\TrustedPeople` 信任、安装并启动真正 MSIX、通过真实 WebView2 操作原生接口及可见编辑器、保存 Unicode/CRLF 内容、完全停止应用并重启验证。它只对本次应用配置 loopback 调试，并在退出时卸载本次包、移除信任和还原覆盖；清理失败不能算通过。

这会在一次性账号的 Documents/Grain 写入唯一命名的测试笔记和恢复产物，不清理用户作品。只有可销毁环境适合此流程。

## 核对证据

- `artifacts/windows-msix/package-info.json`：应用 `appVersion`、实际包 `version`、架构、身份、包/EXE SHA-256、运行时要求。
- `artifacts/windows-msix/AppxManifest.xml`：明确的 x64 身份和 `runFullTrust`。
- `artifacts/windows-readiness/installed-package.json`：实际安装位置和包身份。
- `exercise-result.json`、`reopen-result.json`、真实窗口/WebView2 截图及对应日志。
- 最终 readiness JSON：检查整体状态、WACK 情况和清理结果，不能只看某一步的“passed”。

具体 JSON 报告名称及流程以 [验证脚本](../scripts/test-windows-msix.ps1) 为准。WACK 未安装时只能报告未验证；需要在适用的认证环境运行 WACK，最终仍需通过 Partner Center 审核。

## 发布边界

- `.cer` 只有公钥，临时私钥不会导出到 artifact。不要教普通用户信任 CI 证书或新的根 CA。
- GitHub 测试 MSIX 不是已由 Store 签名的安装包。
- `desktop-v*` 标签不自动提交商店；正式 Release 的 MSIX job 也必须安装验证它将上传的同一个包。
- 0.1.605 的 Windows Org 写入不可用，不得当作商店候选。
- Org 版使用独立新产品，不覆盖旧条目；旧 IndexedDB/`grain.db` 不自动迁移，须先备份并使用旧版导出。

下一步见 [Microsoft Store 提交指南](./microsoft-store-guide.md)，完整实现与信任边界见 [MSIX 打包指南](./msix-packaging-guide.md)。
