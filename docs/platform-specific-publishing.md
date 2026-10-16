# 平台安装包发布指南

当前发布范围为 [GitHub Release 安装包](automated-release-workflow.md)，从仓库根目录在版本、构建、提交与上传完成后运行：

```bash
bun run tag:desktop
```

## Windows

- `windows-latest` 生成 x64 MSI 与 NSIS EXE。
- 独立 MSIX 任务生成 x64 MSIX。
- 发布成功需确认相应任务与附件，MSIX 文件存在不代表已进入 Microsoft Store，也不代表目标系统已经信任其签名。
- 不自动提交 Winget、Scoop 或 Chocolatey。

## macOS

- 两个矩阵任务分别生成 Apple Silicon `aarch64` 与 Intel `x64` DMG。
- 选择与目标机器匹配的实际附件。构建成功不证明公证、签名或目标机器上的安装体验已验证。
- 不自动提交 Homebrew。

## Linux

- x86_64 与 ARM64 各生成 DEB、RPM、AppImage。
- 文件名与安装命令见 [Linux 安装指南](linux-installation-guide.md)。
- 不自动提交 AUR、Flathub、PPA、COPR、OBS 或 Gentoo。
- 安装包架构支持与 Org 文件系统安全能力是不同边界，详见[桌面端指南](../apps/desktop/README.md#file-mutation-rules)。

## 独立发布与手动渠道

`tag:snap` 和 `tag:web` 使用各自独立标签。`tag:linux` 仅组合 desktop + snap，`tag:all` 仅组合 desktop + snap + web；不代表全部商店发布。仅发布 GitHub 安装包时不要使用组合命令。

其他渠道只保留手动 `workflow_dispatch`。必须先确认身份与包名、维护权限、凭据及实际上传步骤，再验证目标版本是否经过审核、进入源并可下载。AUR `grain` / `grain-bin` 与 Scoop Extras `grain` 是 grain-lang，不得用作本编辑器的分发身份。

发布标签不可覆盖或移动。失败任务应根据实际日志修复，使用新的补丁版本；不要通过重打旧标签或关闭校验伪造发布成功。

完整发布步骤与验收见[发布工作流](automated-release-workflow.md)，命令入口见[速查表](publishing-cheatsheet.md)。当前不生成 `latest.json`，更新使用手动下载的 GitHub 安装包。
