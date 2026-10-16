# Grain 发布平台与验收边界

## 当前发布入口

`desktop-v*.*.*` 仅触发 Windows、macOS 和 Linux 的 GitHub Release 安装包构建。发布命令是 `bun run tag:desktop`，不是外部商店的全渠道发布。

- [发布步骤与完整验收](automated-release-workflow.md)
- [平台安装包说明](platform-specific-publishing.md)
- [发布命令速查表](publishing-cheatsheet.md)
- [Linux 安装指南](linux-installation-guide.md)

## 不同结果不能混为一谈

| 结果 | 能证明什么 | 不能证明什么 |
| --- | --- | --- |
| 构建任务成功 | 对应目标完成该任务配置的构建 | 应用已在目标系统完成原生功能实测 |
| Actions 附件 | 文件已保存在该次运行中 | 文件已发布到 GitHub Release 或外部商店 |
| GitHub Release 安装包 | 对应版本文件可从 Release 下载 | 其他架构全部成功、商店已上架或自动更新可用 |
| 渠道清单或提交 PR | 元数据已生成或提交审核 | 上游已合并、审核通过或目标版本已可安装 |
| 商店/包管理器可安装 | 匹配本应用身份与目标版本的包已分发 | 仅凭同名软件搜索结果不能建立该结论 |

检查具体版本时报告实际 Actions、附件与安装结果，不用一张“已支持全部平台”的静态列表替代证据。

## 外部渠道的现状

桌面发布不再自动派发外部渠道，也没有外部渠道发布编排器。已有工作流只保留手动入口，不作为已上架证明：

- AUR `grain` / `grain-bin` 与 Scoop Extras `grain` 属于 grain-lang，不是本编辑器，不能沿用这些包名。
- Flatpak 与 Gentoo 流程可以只生成 Actions 附件；Flathub 或独立 overlay 发布是另一条链路。
- 部分渠道的实际上传步骤受与手动触发不相符的事件条件限制。不能把工作流绿灯解释成上传成功。
- Winget 提交还需要有效的授权凭据与上游审核；缺少凭据时可能只打印手动说明。
- Snap 与 Web 是独立标签，不在仅 GitHub 安装包的发布中运行。

渠道恢复发布之前，必须解决包名与维护权限，核对目标仓库/项目、凭据、真实上传行为和审核结果，再验证具体版本的实际可用性。[Flatpak/Winget 说明](flatpak-winget-publishing.md)列出相应工作流的边界。

## 更新与平台能力

当前发布不生成签名更新清单，使用 GitHub 安装包手动更新。[自动更新说明](auto-update-guide.md)描述启用该能力所需的完整契约。

某平台有安装包不等于所有 Org 文件系统操作已经在该平台等价支持。能力与数据恢复规则以[桌面端指南](../apps/desktop/README.md#file-mutation-rules)为准。
