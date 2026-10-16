# MSIX 自动化

本仓库只有 GitHub 安装包自动发布。Microsoft Store 需要独立的 Partner Center 提交、权限和认证，工作流成功不代表上架。

## 工作流与职责

| 工作流 | 触发 | 结果 |
| --- | --- | --- |
| `.github/workflows/windows-readiness.yml` | `main` 上相关桌面、Rust、依赖或打包文件变动；也可手动运行 | 真正 Windows 上的原生回归、生产前端/EXE 构建、MSIX 安装与运行证明 |
| `.github/workflows/release-desktop.yml` | `desktop-v*` 标签或其手动入口 | 跨平台 GitHub 安装包；独立 MSIX job 在上传前安装验证同一个包 |

没有 `build-msix.yml`、cargo-packager/MSI 捕获步骤或自动 Partner Center API 提交。

## Windows Native Readiness

工作流使用 `windows-latest`，checkout 不保留 Git 凭据，仓库权限仅 `contents: read`。依次执行：

1. 安装锁定的 Bun/Node 与 Rust 依赖。
2. 实际运行四组 Windows 测试：
   - `org_filesystem::windows`
   - `org_filesystem::export::windows_platform::tests`
   - `org_clock_context::platform::tests`
   - `tauri::commands::org_document_commands::tests`
3. 任一组失败或没有选中测试，门禁失败。仍收集其他组结果，不能因为一个失败隐藏后面的诊断。
4. 只有原生组通过，才构建真实前端与 `grain.exe`，运行 `scripts/build-msix.ps1 -ReadinessOnly`。测试身份为 `Grain.WindowsReadiness`，不使用旧商店产品，不是可提交的 Store 身份。
5. Windows PowerShell 运行 `scripts/test-windows-msix.ps1`，安装实际 MSIX、验证包身份与可见窗口、连接其真实 WebView2。`scripts/windows-msix-smoke.mjs` 检查权限拒绝、创建碰撞、过期 revision、Unicode/CRLF 原生保存、文件树打开、编辑器输入与 Ctrl+S，以及全进程重启后再打开。
6. 如有 WACK，实际运行并保留报告；缺少工具或未认证的环境必须明确标记，不能据此声称获得 Store 认证。
7. 不论成功失败，都尝试上传已有包、完整原生日志、截图和报告；保留期 14 天。

运行时不存在时，smoke 会在验证 Microsoft 签名后单独配置 WebView2 Evergreen。MSIX 本身不包含这个引导程序。

## 产物

Readiness run：

- `windows-msix-<run_id>-<run_attempt>`：实际 `_readiness.msix`、公开测试证书、Manifest、`package-info.json`、MakeAppx/SignTool 日志；`purpose=readiness-only`，不能提交 Store。
- `windows-readiness-<run_id>-<run_attempt>`：各测试日志、构建日志、`installed-package.json`、原生/编辑器结果、全进程重启结果、WebView2/窗口截图和最终 readiness 报告；具体文件仅在对应阶段执行后存在。

Release MSIX job：

- `msix-package`：同一 job 构建的候选包与公开元数据。
- `msix-readiness-<run_id>-<run_attempt>`：该正式候选包的安装后证明。
- 仅安装 smoke 成功后，才把 `.msix` 上传到对应 GitHub Release。失败 artifact 可用于诊断，不能当作可发布包。

Release 使用独立 Org 产品的真实身份，要求先配置 `GRAIN_STORE_PRODUCT_ID`、`GRAIN_STORE_IDENTITY`、`GRAIN_STORE_PUBLISHER` repository variables。缺少配置或试图使用保留的旧产品 `9NV7M2PW25B3` 会失败，不会退回测试身份或旧应用。

下载后核对包 SHA-256 与 `package-info.json`，并核对报告里真正安装和运行的版本/身份。只看绿色下载按钮、文件大小或自签名成功不足以通过门禁。

## 证明边界

已执行的原生断点/恢复检查属于进程中断与保留证据模型，不是物理断电或 POSIX 目录 fsync 等价性证明。Windows 不提供当前实现可宣称的 Linux 完整语义对等。

可见编辑器 smoke 不测试 Windows 原生 IME composition，不覆盖所有 Windows 版本、文件系统、离线干净机器或第三方安全软件环境。保存测试使用真实磁盘字节和真实应用，不使用浏览器替身、mock 文件系统或伪造认证结果。

WACK 成功也只是该环境的工具结果；商店发布必须有 Partner Center 的真实提交 ID 和状态。没有认证工具或商店权限时，报告该缺口，不吞掉错误或填写假的通过结果。

## 排错

先看失败阶段对应的完整 artifact 日志，再看 Actions 注释中的摘要。不要重跑旧失败来确认已知错误；修正根因后运行新的候选。

- Native 失败：保留预期的拒绝路径、ACL/身份检查和无覆盖语义，不为绿色 CI 绕开安全边界。
- Build 失败：检查实际 Rust/TypeScript/SDK 错误，不能用已有旧 EXE 代替构建。
- Install/launch 失败：检查签名、身份、WebView2 和 Appx 事件；保留截图及日志。
- WACK 失败：查看原始 XML 和工具日志，不能把非零退出或未知报告当作通过。
- Cleanup 失败：检查本次包、叶证书与调试覆盖是否还存在，不能留下一台被修改信任设置的普通用户电脑。

详细信任边界见 [MSIX 打包指南](./msix-packaging-guide.md)，提交步骤见 [Microsoft Store 指南](./microsoft-store-guide.md)。
