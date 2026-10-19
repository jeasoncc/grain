# GitHub 安装包发布工作流

## 发布边界

`desktop-v*.*.*` 标签触发 `.github/workflows/release-desktop.yml`，仅构建并上传 GitHub Release 安装包。推送 `main` 本身不会触发桌面发布。

| 目标 | GitHub Release 安装包 |
| --- | --- |
| Windows x64 | MSI、NSIS EXE；MSIX 另需独立 Org 商店身份配置及安装验证 |
| macOS Apple Silicon | aarch64 DMG |
| macOS Intel | x64 DMG |
| Linux x86_64 | DEB、RPM、AppImage |
| Linux ARM64 | DEB、RPM、AppImage |

安装包存在不等于对应操作系统上的 Org 文件系统能力已经等价支持。文件操作与恢复边界以[桌面端指南](../apps/desktop/README.md#file-mutation-rules)为准。

`main` 上相关变动会先触发 [Windows Native Readiness](https://github.com/jeasoncc/grain/actions/workflows/windows-readiness.yml)，运行真实 Windows 文件、导出、日历与权限回归，再安装运行 **Grain Org** 的正式身份候选 MSIX。候选标记 `store-candidate`；它不创建 GitHub Release，也不自动提交 Store。

桌面发布不会再自动派发 AUR、Flatpak、PPA、COPR、OBS、Gentoo、Winget、Scoop、Chocolatey 或 Homebrew 工作流，也没有自动等待这些渠道的发布编排器。

## 创建发布

从仓库根目录操作，先确认 GitHub 推送身份可用：

```bash
bun run version:bump
bun install --lockfile-only --ignore-scripts
```

版本源是根目录 `package.json`。发布脚本同步桌面/Web 包、Tauri/Cargo 和已有渠道元数据；渠道元数据的版本变化不代表已经上架。通过 Tauri 构建同步原生 `Cargo.lock`：

```bash
(cd apps/desktop && bun run test && bun run tauri build --debug --no-bundle)
```

提交并上传所有本次发布改动后，运行：

```bash
bun run tag:desktop
```

该命令读取根版本、创建带注释的 `desktop-v` 标签并推送到 `origin`。不要覆盖、删除或移动已经发布的标签；修复应使用新的补丁版本。直接手动运行工作流只做所选 ref 的构建，发布仍使用明确的版本标签。

Windows 修复版本必须先通过实机门禁再创建正式标签。独立 **Grain Org** 产品 `9PF3WZLSWZHX` / `Jeason.GrainOrg` 已由 Partner Center 分配并固定在打包脚本中，不能更新保留的旧应用。当前待发布版本为 0.1.606，不能因版本已递增就宣称已经发布。

## 发布成功的验收

1. 在 [Release Desktop App](https://github.com/jeasoncc/grain/actions/workflows/release-desktop.yml) 中找到对应标签与提交，确认五个 Tauri 矩阵任务以及 MSIX 任务的实际结果。
2. 打开该标签的 [GitHub Release](https://github.com/jeasoncc/grain/releases)，核对版本、架构和上表中的安装包。其他任务可能先创建 Release；Release 页面存在本身不能证明全部打包成功。
3. 下载实际安装包，核对下载内容与发布的 SHA256。构建、附件上传、安装和原生功能实测是不同的验证层次，分别报告。
4. 查看失败任务的步骤及日志。日志过期时只能报告仍可见的任务结果，不能猜测具体编译错误。
5. MSIX job 会安装、启动、通过文件树打开与编辑器 Ctrl+S 保存、核对 Unicode/CRLF 磁盘字节、完全重启并重新打开**该 job 将上传的同一个包**。检查其 `msix-readiness-*` 证据及清理结果；失败时不上传该 MSIX。

## Microsoft Store

本标签流程不向 Partner Center 提交。测试证书、托管 Windows smoke 或 WACK 结果均不是商店审核结论。Org 版使用独立新产品，不能更新旧「小麦写作」`9NV7M2PW25B3`，也不能提交历史 CI 的 `Grain.WindowsReadiness` 测试身份。

新产品身份、公开隐私政策、真实 Windows 截图、WebView2 依赖和旧格式不自动迁移说明都准备完毕后，再按[Microsoft Store 指南](./microsoft-store-guide.md)提交，记录实际 submission ID 与审核/发布状态。


## 外部渠道

Snap 与 Web 使用独立标签，其他渠道保留手动入口，均不在本桌面发布流程中执行。运行前必须确认项目身份、包名维护权限、凭据、实际上传步骤及上游审核。

已核对的 AUR `grain` / `grain-bin` 与 Scoop Extras `grain` 属于 **grain-lang 语言项目**，不是本编辑器。不要使用这些名称发布本项目，也不要将这些包的可用性作为本编辑器发布成功的证据。

Flatpak/Gentoo 等工作流可能只生成 Actions 附件；一些渠道的发布步骤受不可达的事件条件限制。Actions 绿灯、准备好的清单或已创建的审核 PR，都不等于目标版本已经在商店可安装。

`tag:snap` 发布独立的 **Org Notes / `org-notes`**，默认请求 `edge`，经过同包严格沙箱原生验收后才可上传。身份、凭据、证据和推广规则见 [Snap 发布边界](publishing-platforms-guide.md#org-notes-snap-独立版)。`tag:linux` 只创建 desktop + snap，`tag:all` 只创建 desktop + snap + web；它们不是全部渠道上架命令。仅发布 GitHub 安装包时使用 `tag:desktop`。

## 自动更新

当前发布不生成 `latest.json`。旧清单的签名字段为空，不能作为有效的签名自动更新发布。请从对应 GitHub Release 手动下载安装包；签名更新的要求见[自动更新说明](auto-update-guide.md)。
