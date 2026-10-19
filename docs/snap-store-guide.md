# Org Notes Snap Store 发布指南

本指南只适用于独立的 **Org Notes** Snap。发布流程以 [Publish Org Notes Snap 工作流](../.github/workflows/snap-publish.yml)和[独立版渠道说明](publishing-platforms-guide.md#org-notes-snap-独立版)为准，不使用 Snap Store 连接 GitHub 后自动构建的另一套流程。

## 发布身份与范围

| 项目 | 当前配置 |
| --- | --- |
| 显示名称 / Snap 名称及命令 | Org Notes / `org-notes` |
| 发布者 | Jeasonchen（`jeasoncc`） |
| Snap ID | `Bjbd2JnV9QgH8kKAPg2QT0WxvESdCXTu` |
| 源码配方版本 | `0.1.606`（不等于已公开版本） |
| 架构 / 基础系统 / confinement | `amd64` / `core24` / `strict` |
| Snap 专用 Tauri identifier | `com.lotus.orgnotes` |

配方为 [snap/snapcraft.yaml](../snap/snapcraft.yaml)，原生编译入口为 [snap/local/build.sh](../snap/local/build.sh)，Snap 身份覆盖为 [snap/tauri.conf.json](../snap/tauri.conf.json)。最新麦穗图标统一取自 [snap/gui/org-notes.png](../snap/gui/org-notes.png)，供原生窗口、桌面和商店使用；不要从旧应用复制图标。

只批准本次 **edge** 发布。手动工作流虽然提供其他频道选项，但这不构成 `stable` 发布授权；配方中的 `grade: stable` 也不表示 stable 频道存在。

## 发布步骤与证据边界

1. **核对源码和触发方式。** 根 `package.json`、桌面 Tauri 配置和 Snap 配方版本必须一致。`snap-v*.*.*` 标签必须匹配源码版本，触发工作流并请求 `edge`；手动运行选择 `edge`。普通分支推送不是此工作流的发布触发器，不要移动已有标签。
2. **构建真实包。** 工作流在 Ubuntu 24.04 amd64 上通过 Snapcraft 和固定、校验哈希的工具链直接编译，产出单一 `org-notes_<版本>_amd64.snap` 并记录 SHA-256。包构建成功只是构建证据，不代表安装验收或上架。
3. **同包原生 strict 验收。** 上传前必须运行 [scripts/test-linux-snap.mjs](../scripts/test-linux-snap.mjs)。测试覆盖真实 GTK 文件夹选择（含空格路径）、可见 Unicode 输入、显式 Ctrl+S、物理文件精确字节、默认工作区 Unicode/CRLF，以及完整停止原生/WebKit 进程后重启重开。必须保持 AppArmor enforce 和 seccomp；GTK 选择器通过 AT-SPI 操作，网页控件通过截图 OCR 和真实键鼠操作，不声称网页 AT-SPI 已可用。
4. **验证哈希后上传。** 仅在同包原生验收成功、包哈希未改变时执行上传并请求 edge。GitHub Actions secret `SNAPCRAFT_TOKEN` 需具备 `org-notes` 上传和频道发布权限，只注入上传步骤。不要展示、导出明文凭据，或把凭据、发布者日志复制到公开附件。
5. **检查审核和公开 edge。** 上传命令完成仍需核对 Store 处理/审核结果，再查看 [Org Notes 商店页](https://snapcraft.io/org-notes)及 Store API 的频道记录，确认 Snap ID、发布者、`amd64`、目标版本和 edge 一致。Actions 绿灯、名称已注册或成功上传均不是公开可安装证明。
6. **stable 单独授权。** 只有取得新的明确授权并核对公开 edge 后，才能考虑将已验收的同一 Store revision 推广到 stable；本指南不授权或提供本次 stable 操作。

原生测试只允许在可销毁的 Ubuntu 24.04 amd64 主机运行，并显式设置 `ORG_NOTES_DISPOSABLE_HOST=1`。测试拒绝已有安装/状态，使用独立临时用户和资源，清理自有资源并保留验收证据；不要在日常工作机器上运行。完整命令与依赖以现有工作流为准，不在此复制 YAML 或提供绕过验收的上传路径。

本地 Ubuntu 24.04 amd64 的上述原生验收已经通过，但不能由此推断 CI、上传或公开发布成功。[本次 CI 运行](https://github.com/jeasoncc/grain/actions/runs/39236148693)的最终结果与公开频道仍需分别核对。

## 安装与独立数据

仅当商店已公开目标 amd64 edge 版本后，用户才可执行：

```bash
sudo snap install org-notes --edge
org-notes
```

不要省略 `--edge` 来暗示存在 stable。安装前后的安全说明见[快速指南](snap-quick-start.md)和[Snap 故障排除](snap-troubleshooting.md)。

这是独立应用，不覆盖或自动升级旧 `novel-editor-app`、`xiaomiquan` 或 `grain`，也不会自动导入旧作品。先用旧应用导出并独立备份；旧名称保持不变。Org 文件应存放在用户普通、非隐藏的文档目录中；Snap 私有数据与这些外部文件分离，不能代替独立备份。

当前 Snap runtime 对网页编辑控件的屏幕阅读器支持有限；普通键鼠编辑和原生目录选择可用。已观测到 snapd 2.77.1 / WebKitGTK 2.52.6 的 accessibility-bus AppArmor 拒绝，尚无已确认的狭窄应用侧修复。不要使用 devmode/classic、关闭沙箱或 portal、放宽 DBus 权限等方式绕过。
