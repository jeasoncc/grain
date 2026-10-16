# Flatpak 和 Winget 手动工作流

桌面标签仅发布 GitHub 安装包，不自动触发这两个渠道。`tag:flatpak`、`tag:winget` 及其渠道标签不是当前支持的发布入口。先阅读[发布边界与验收](automated-release-workflow.md)。

## 共同前提

- 对应 `desktop-v` 版本已经有 GitHub Release；手动输入 `version` 时只填写不带前缀的版本号。
- 在 GitHub Actions 中选择对应工作流，通过 `workflow_dispatch` 单独运行。
- 手动运行所选 ref 必须与目标发布代码一致；输入版本号不会自动将 checkout 切到对应标签。
- 运行前核对渠道包名、维护权限和凭据。构建或准备清单不等于商店上架。

## Flatpak

`.github/workflows/flatpak-publish.yml` 检查桌面 Release，使用当前 checkout 构建 Flatpak，并上传 `flatpak-package` Actions 附件。

该流程没有向 Flathub 发布的步骤。需要另行完成符合 Flathub 要求的清单、应用审核及维护仓库，再确认远端 `com.lotus.Grain` 的实际版本。不能仅凭生成的 `.flatpak` 或工作流绿灯宣传 Flathub 已上架。

## Winget

`.github/workflows/winget-publish.yml` 使用同版本的 `grain_<version>_x64_zh-CN.msi` 并计算 SHA256。当前提交身份是 `Jeason.NovelEditor`。

配置并授权 `WINGET_GITHUB_TOKEN` 后，工作流才会尝试向 `microsoft/winget-pkgs` 提交更新。没有该凭据时可能成功退出并只打印手动说明；创建 PR 也仍需通过上游审核、合并与源传播。

发布验收必须包括目标版本的已合并清单、正确的 MSI URL/SHA256，以及 Winget 源中该身份与版本的实际可用性。仓库内旧的 `Jeason.Grain` 清单不能混作当前身份的完整提交。

## 安装入口

在上述渠道完整验收之前，以 [GitHub Release 安装包](https://github.com/jeasoncc/grain/releases) 为准。不要删除、移动或复用已有发布标签来制造渠道重新触发。
