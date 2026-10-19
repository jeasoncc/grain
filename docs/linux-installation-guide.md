# Linux 安装指南

当前发布入口是 [jeasoncc/grain 的 GitHub Releases](https://github.com/jeasoncc/grain/releases)。选择对应的 `desktop-v` 版本，确认其 Actions 结果和附件，再下载与机器架构匹配的安装包。

| 架构 | DEB | RPM | AppImage |
| --- | --- | --- | --- |
| x86_64 | 文件名含 `amd64` | 文件名含 `x86_64` | 文件名含 `amd64` |
| ARM64 | 文件名含 `arm64` | 文件名含 `aarch64` | 文件名含 `aarch64` |

## 安装包

以下命令应在只存放所选版本安装包的目录中执行，避免通配符选中旧版本或其他软件。

Ubuntu/Debian：

```bash
sudo apt install ./grain_*_amd64.deb
```

Fedora：

```bash
sudo dnf install ./grain-*.x86_64.rpm
```

openSUSE：

```bash
sudo zypper install ./grain-*.x86_64.rpm
```

AppImage，包括没有 DEB/RPM 包管理器的发行版：

```bash
chmod +x ./grain_*_amd64.AppImage
./grain_*_amd64.AppImage
```

以上为 x86_64 文件名；ARM64 使用表中对应架构的实际下载文件，不要混用安装包。先核对 Release 中的 SHA256，并确认不会覆盖已安装的同名软件。

DEB/RPM 的依赖由系统包管理器处理。AppImage 仍需满足主机运行依赖；遇到不支持的文件系统或发行版条件时，不应通过关闭安全检查来强行运行。

## Org Notes Snap 独立版

新 Snap 名称为 **`org-notes`**，显示名称 **Org Notes**，发布者为 **Jeasonchen / `jeasoncc`**，仅面向 `amd64`。这是独立条目，不会自动升级旧 `novel-editor-app` 或转换旧作品。

已公开 **0.1.607 / `latest/edge` / revision `1`**，尚未发布 stable。在已启用 snapd 的 amd64 Linux 上安装并启动：

```bash
sudo snap install org-notes --edge
org-notes
```

这是测试频道。Ubuntu 24.04 上已实测商店签名安装、原生目录选择、中文/CRLF 显式保存及完整重启；当前 Snap runtime 的网页编辑控件屏幕阅读器支持仍有限。安装前请在 [Snap Store](https://snapcraft.io/org-notes) 核对实际频道，完整身份、哈希和发布证据见 [Snap 发布边界](publishing-platforms-guide.md#org-notes-snap-独立版)。不要省略 `--edge` 来暗示存在 stable。

Snap 的文件访问受严格沙箱限制。只连接所需接口；访问可移动介质需要 `sudo snap connect org-notes:removable-media`，不应通过 `--devmode` 或 `--classic` 绕过权限。外部工具是否可用需另外验证，不能假设宿主机已安装的程序都可直接使用。

配置与派生数据位于 Snap 独立数据空间。请通过应用内 **Open configuration file** 查看实际配置位置，不要照搬普通 Linux 包的路径。将原始 Org 工作区放在你自己的非隐藏文档目录中，而不是 Snap 私有目录；Snap 卸载可以移除私有数据，也可能按 snapd 策略保留快照。始终另外备份笔记与旧作品。

## 其他外部包管理器

GitHub 桌面标签不会自动上架 AUR、Flathub、PPA、COPR 或 OBS。Snap 使用上节的独立身份、标签与验收流程。

AUR 上的 `grain` / `grain-bin` 属于 **grain-lang 语言项目**，不是这个编辑器。不要用 `yay -S grain`、`paru -S grain-bin` 等命令安装本项目，也不要把旧 `novel-editor` 渠道名称或示例 PPA 当作已验证的分发地址。

其他渠道的手动工作流和 Actions 附件不证明商店可安装。普通 Linux 安装包以 GitHub Release 的实际附件为准，更新时手动下载；独立 Snap 的频道更新由 snapd 处理。桌面发布流程不生成 Tauri 签名自动更新清单。

## 文件与恢复边界

Grain 使用用户工作区中的原始 Org 文件。安装包存在不代表各平台的 Org 文件系统能力完全等价，安全文件操作、未保存内容和恢复产物的规则见[桌面端指南](../apps/desktop/README.md#file-mutation-rules)。升级前请单独备份工作区与配置。

发布过程与验收标准见[发布工作流](automated-release-workflow.md)；问题请提交到 [GitHub Issues](https://github.com/jeasoncc/grain/issues)。
