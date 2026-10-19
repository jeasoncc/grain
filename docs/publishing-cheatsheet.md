# 发布命令速查表

从仓库根目录执行。当前[桌面发布](automated-release-workflow.md)仅提供 GitHub Release 安装包。

## GitHub 安装包

```bash
bun run version:bump
bun install --lockfile-only --ignore-scripts
(cd apps/desktop && bun run test && bun run tauri build --debug --no-bundle)
```

提交并上传全部发布改动后：

```bash
bun run tag:desktop
```

此命令创建并推送根版本对应的 `desktop-v` 标签。不要覆盖旧标签。核对 Actions 中五个 Tauri 目标与 MSIX 任务，以及对应 Release 的实际附件，不能只看 Release 页面是否存在。

## 独立命令

```bash
bun run tag:help
bun run tag:snap
bun run tag:web
```

`tag:help` 不创建标签。`tag:snap` 为独立的 **Org Notes / `org-notes`** 创建根版本对应的 `snap-v` 标签，默认请求 `edge`。根版本、Tauri 和 Snap 配方必须一致；`SNAPCRAFT_TOKEN` 缺失或同包严格沙箱原生验收失败时不得上传。已有目录选择、中文保存、Unicode/CRLF 与完整重启证据及稳定频道推广规则见 [Snap 发布边界](publishing-platforms-guide.md#org-notes-snap-独立版)。Web 仍为另一条独立流程。

`tag:linux` 只组合 desktop + snap；`tag:all` 只组合 desktop + snap + web，不是外部包管理器的全渠道上架命令。只发 GitHub 安装包时不要使用这两个组合。

## 手动渠道

AUR、Flatpak、PPA、COPR、OBS、Gentoo、Winget、Scoop、Chocolatey 和 Homebrew 只保留手动 `workflow_dispatch`，不接受独立渠道 tag 发布。运行前检查包名归属、维护权限、工作流实际上传步骤和上游审核；生成 Actions 附件或 PR 不等于上架。

AUR `grain` / `grain-bin` 和 Scoop Extras `grain` 属于 grain-lang，不得用作本编辑器的发布或安装身份。

当前桌面发布不生成 `latest.json`。用户更新以 GitHub Release 安装包为准，不能宣传签名自动更新已可用。
