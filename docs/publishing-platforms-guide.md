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

桌面标签不自动派发外部渠道，也没有全渠道发布编排器。Snap 使用下述独立流程；其他手动流程不作为已上架证明：

- AUR `grain` / `grain-bin` 与 Scoop Extras `grain` 属于 grain-lang，不是本编辑器，不能沿用这些包名。
- Flatpak 与 Gentoo 流程可以只生成 Actions 附件；Flathub 或独立 overlay 发布是另一条链路。
- 部分渠道的实际上传步骤受与手动触发不相符的事件条件限制。不能把工作流绿灯解释成上传成功。
- Winget 提交还需要有效的授权凭据与上游审核；缺少凭据时可能只打印手动说明。
- Snap 与 Web 是独立标签，不在仅 GitHub 安装包的发布中运行。

渠道恢复发布之前，必须解决包名与维护权限，核对目标仓库/项目、凭据、真实上传行为和审核结果，再验证具体版本的实际可用性。[Flatpak/Winget 说明](flatpak-winget-publishing.md)列出相应工作流的边界。

## Org Notes Snap 独立版

新 Org 应用使用独立身份，不覆盖旧 `novel-editor-app`、`xiaomiquan`，也不使用已保留的 `grain` 名称。

| 字段 | 已注册身份 |
| --- | --- |
| 显示名称 | Org Notes |
| Snap 名称 / 命令 | `org-notes` |
| Snap ID | `Bjbd2JnV9QgH8kKAPg2QT0WxvESdCXTu` |
| 发布账号 | Jeasonchen（`jeasoncc`） |
| 架构 / 基础系统 / confinement | `amd64` / `core24` / `strict` |
| Snap 专用 Tauri identifier | `com.lotus.orgnotes` |

配方为 `snap/snapcraft.yaml`，原生图标、桌面图标和商店图标使用 `snap/gui/org-notes.png`。`snap/tauri.conf.json` 只覆盖 Snap 产品身份，不修改 Windows 或普通 Linux 安装包的身份。

`snap-v*.*.*` 触发 **Publish Org Notes Snap**，默认请求 `edge`；也可手动选择频道。构建前核对根版本、Tauri 版本、配方版本和标签，使用固定版本并校验哈希的 Bun/Node/Rust 工具链，在 Ubuntu 24.04 的 GNOME/core24 环境直接编译真实二进制，不从旧 DEB 提取程序。

上传前必须对**同一个安装包**执行 `scripts/test-linux-snap.mjs`：严格 AppArmor/seccomp、真实原生目录选择、已有目录中文编辑与显式保存、Unicode/CRLF 字节以及完整进程停止后的重启重开。只允许可销毁的 Ubuntu 24.04 amd64 主机；独立临时用户、用户 systemd 会话、X11 和桌面 portal 均需真实运行。保留包哈希、截图、字节样本、进程与清理证据；失败时禁止上传。

网页界面通过真实截图 OCR 定位与键鼠操作，GTK 原生目录选择器通过 AT-SPI 操作，最终验证真实磁盘字节，不注入 DOM 或控制器。OCR 仅识别操作目标和可见输入；完整 Unicode 与换行以物理文件比较为准。

已观测到 Snapd 2.77.1 与 GNOME runtime 中 WebKitGTK 2.52.6 的无障碍兼容限制：`bus="accessibility"` 上的 `org.freedesktop.DBus.RequestName` 被严格 AppArmor 策略拒绝，网页可见但其辅助功能子树未导出。不能通过关闭沙箱、手改测试机策略或声称界面完全无障碍来绕过；商店说明需披露此限制，原生编辑验收与辅助功能支持分别报告。

GitHub secret `SNAPCRAFT_TOKEN` 必须具有 `org-notes` 的上传和频道发布权限，仅注入上传步骤，不能写入日志或公开附件。注册名称、`grade: stable`、上传命令完成和 Actions 绿灯都不代表 `latest/stable` 已公开。先核对 `edge` 的实际版本，再将已验收的同一商店 revision 推广到 `stable`，不要移动已有 Git 标签。

公开状态以 [Org Notes 商店页](https://snapcraft.io/org-notes) 及 Store API 中匹配上述 Snap ID、发布者、架构和目标版本的频道记录为准。`install-verify.yml` 的 Snap job 只核验这些公开元数据，不冒充原生安装验收。


## 更新与平台能力

本仓库不生成 Tauri 签名更新清单；GitHub 安装包使用手动更新，[自动更新说明](auto-update-guide.md)描述启用该能力所需的完整契约。Snap 的频道更新与校验由 snapd / Snap Store 单独处理，不依赖 `latest.json`。

某平台有安装包不等于所有 Org 文件系统操作已经在该平台等价支持。能力与数据恢复规则以[桌面端指南](../apps/desktop/README.md#file-mutation-rules)为准。
