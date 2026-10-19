# Org Notes Snap 快速指南

这是独立的 **Org Notes**，Snap 名称和启动命令为 `org-notes`，发布者为 Jeasonchen（`jeasoncc`），Snap ID 为 `Bjbd2JnV9QgH8kKAPg2QT0WxvESdCXTu`。当前配方版本为 `0.1.607`，仅支持 `amd64`，使用 `core24` 和 `strict`；Snap 专用 Tauri identifier 为 `com.lotus.orgnotes`。最新麦穗图标来源是 [snap/gui/org-notes.png](../snap/gui/org-notes.png)。

## 用户：安装 edge 测试版

当前已公开 **0.1.607 / `latest/edge` / revision `1`**，没有发布 stable。安装前仍应检查 [Org Notes 商店页](https://snapcraft.io/org-notes)的实际版本与频道；维护者核对 Store API 中的 Snap ID、发布者和架构。验收记录见[独立版渠道说明](publishing-platforms-guide.md#org-notes-snap-独立版)。

在已启用 snapd 的 amd64 Linux 上执行：

```bash
sudo snap install org-notes --edge
org-notes
```

这是测试频道，不是稳定版安装指令。不要省略 `--edge`，也不要改装旧应用来代替 Org Notes。

- 将外部 `.org` 文件放在普通、非隐藏的用户文档目录中，定期显式保存并独立备份。Snap 私有数据与外部 Org 文件分离，未保存内容不保证在重启后保留。
- 新应用不会覆盖或自动升级旧 `novel-editor-app`、`xiaomiquan` 或 `grain`，也不会自动导入旧作品。先在旧应用中导出、备份，再自行选择需要的 Org 文件；旧名称保持不变。
- 移动存储访问是可选授权，仅在确实需要时执行 `sudo snap connect org-notes:removable-media`。
- 网页编辑控件的屏幕阅读器支持目前有限，普通键鼠编辑与原生文件夹选择可用。不要以 devmode/classic、禁用沙箱或 portal、放宽 DBus 权限解决问题。详见[安全故障排除](snap-troubleshooting.md)。

## 维护者：使用现有工作流

发布实现只有 [Publish Org Notes Snap](../.github/workflows/snap-publish.yml)，详细约束见[发布指南](snap-store-guide.md)与[独立版渠道说明](publishing-platforms-guide.md#org-notes-snap-独立版)。无需复制 YAML 或另配 Snap Store GitHub 自动构建。

1. 核对根版本、桌面 Tauri 版本及 [Snap 配方](../snap/snapcraft.yaml)一致。匹配版本的 `snap-v*.*.*` 标签请求 edge；手动工作流也应选择 edge。普通分支推送不触发此发布流程，不移动旧标签。
2. 工作流构建真实 amd64 包并记录 SHA-256；**构建成功不等于原生测试成功**。
3. 对同一包运行 strict 原生 GUI 验收：真实 GTK 文件夹选择、Unicode 编辑和显式保存、精确物理文件字节、Unicode/CRLF、完整停止进程后的重启重开。仅限显式设置 `ORG_NOTES_DISPOSABLE_HOST=1` 的可销毁 Ubuntu 24.04 amd64 主机；不要在日常机器运行。测试隔离用户和资源，拒绝已有安装/状态，并清理自有资源、保留证据。
4. 原生验收通过且包哈希不变，才允许上传并请求 edge。由维护者安全配置 Actions secret `SNAPCRAFT_TOKEN`，仅在上传步骤注入；不要展示/导出明文值，也不要将凭据或发布者日志放入公开附件。
5. 上传后单独核对 Store 审核/处理结果及**公开 edge 的实际版本**。公开 edge 并不授权 stable；stable 推广需要另行明确授权，并使用同一已验收 Store revision。

