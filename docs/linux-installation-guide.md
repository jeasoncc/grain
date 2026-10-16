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

## 外部包管理器不是当前安装入口

本次桌面发布不会自动上架 AUR、Snap、Flathub、PPA、COPR 或 OBS。

AUR 上的 `grain` / `grain-bin` 属于 **grain-lang 语言项目**，不是这个编辑器。不要用 `yay -S grain`、`paru -S grain-bin` 等命令安装本项目，也不要把旧 `novel-editor` 渠道名称或示例 PPA 当作已验证的分发地址。

已有手动发布工作流和 Actions 附件不证明商店可安装。当前以 GitHub Release 的实际安装包为准，更新时手动下载新版本；发布流程不生成签名自动更新清单。

## 文件与恢复边界

Grain 使用用户工作区中的原始 Org 文件。安装包存在不代表各平台的 Org 文件系统能力完全等价，安全文件操作、未保存内容和恢复产物的规则见[桌面端指南](../apps/desktop/README.md#file-mutation-rules)。升级前请单独备份工作区与配置。

发布过程与验收标准见[发布工作流](automated-release-workflow.md)；问题请提交到 [GitHub Issues](https://github.com/jeasoncc/grain/issues)。
