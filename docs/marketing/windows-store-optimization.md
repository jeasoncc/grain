# Org 新应用的 Microsoft Store 产品资料

这是独立 Org 产品的提交资料，不是已上架声明。维护者已决定保留旧「小麦写作 / Wheat Editor」`9NV7M2PW25B3`；不要替换旧条目，不复用旧包身份或旧富文本截图。

**Grain Org** 已在 Partner Center 实际保留，Store ID `9PF3WZLSWZHX`；发布状态以真实门户为准。分类为 **Productivity / 生产力**。应用界面当前主要为英文，支持 UTF-8 中文等正文；中文商店文案不表示已有完整中文界面。不得填写未经验证的安装量、排名、用户数、认证徽章或发行状态。

## zh-CN 商店文案

### 简短说明

直接编辑本地 Org 文件的开源笔记、写作与任务工作台。

### 详细说明

Grain Org 将笔记、写作和任务管理放在一个本地 Org workspace 中。已保存的正文是用户目录里的普通 .org 文件，不是只能在应用内读取的数据库文档。

从文件树打开或新建笔记，用 Org 原文编写标题、列表、TODO、复选框、标签、属性和时间戳。通过快速打开、标签页、分栏与多窗口在笔记间工作；同一 buffer 的多个视图共享正文和撤销历史。

Agenda 汇总任务和计划；Capture 模板帮助记录笔记和待办。使用 file:、id: 和 CUSTOM_ID 链接连接正文，并查看反向链接。可将支持的 Org 内容导出为 HTML 或 Markdown。

应用通过原生文件能力访问明确授权的本地目录。保存核对磁盘 revision，拒绝过期写入和新建时的覆盖碰撞；遇到不明确的文件状态会要求核对，而不是静默替换。SQLite 仅作为可重建的 Org 派生索引。

重要边界：
- 需要 Microsoft Edge WebView2 Evergreen Runtime；MSIX 不内置或安装它。部分 Windows 10 机器须先从微软安装运行时。
- 界面当前主要为英文，中文商店说明不代表已有完整中文界面。
- Windows 使用受支持的本地文件系统原语；reparse/junction/符号链接和 EFS 加密对象不作为普通 workspace 内容，避免替换或派生副本丢失加密。Windows 文件监听、GNU 专用功能及历史库恢复/迁移有独立限制。
- 应用没有自动把旧 IndexedDB 或 grain.db 作品转换为 Org 的能力。旧产品独立保留；先备份并使用旧版导出，不删除历史数据库。
- 文件操作可能保留含旧正文的 .grain-*.tmp 原件及事务证据。它们可被外部修改，不是不可变备份，不会自动安全擦除或清理。
- 普通未保存 buffer 没有通用重启恢复。请保存并独立备份作品。
- 正文没有自动云同步。用户配置的外部图表服务、打开的网页和运行时/更新分发可能联网，遵循对应服务的政策。

Grain Org 实现受支持的 Org 工作流，不是完整 Emacs 或 GNU Org mode 替代。源代码使用 MIT 许可证公开。

### 功能条目

- 本地普通 Org 文件与目录授权，不以数据库作为唯一正文。
- Org 原文编辑、标题与列表、TODO、复选框、标签和时间戳。
- 文件树、快速打开、标签页、分栏和共享 buffer。
- Agenda、Capture 模板、笔记链接与反向链接。
- 支持的 HTML / Markdown 导出与 JSON 文件配置。

### 搜索词

Org mode；本地笔记；写作；任务管理；开源；大纲；知识管理。

不要把“Markdown 编辑器”“富文本小说编辑器”“人物/世界观管理”“加密备份”“无缝迁移”写成当前功能。

## en-US Store copy

### Short description

An open-source workspace for notes, writing, and tasks in local Org files.

### Description

Grain Org brings notes, writing, and task management into a local Org workspace. Saved content remains ordinary .org files in a directory you choose, rather than documents available only inside an application database.

Open and create notes from the file tree. Edit Org source with headings, lists, TODO states, checkboxes, tags, properties, and timestamps. Navigate with Quick Open, tabs, splits, and multiple windows; views of the same buffer share source and undo history.

Use Agenda for tasks and planning, Capture templates for notes and TODOs, and file:, id:, or CUSTOM_ID links with backlinks to connect your writing. Export supported Org content as HTML or Markdown.

Native file access is scoped to explicitly approved directories. Saves check the disk revision and reject stale writes or create collisions instead of silently overwriting another file. SQLite is a rebuildable Org index, not the sole store of document bodies.

Important requirements and limits:
- Microsoft Edge WebView2 Evergreen Runtime is required and is not bundled or installed by this MSIX. Some Windows 10 devices need the Microsoft Runtime installed first.
- Native operations require supported local filesystem conditions. Reparse points, junctions, symlinks, and EFS-encrypted objects are not ordinary workspace content; replacement and derived copies must not lose encryption. Windows filesystem watching, GNU-specific features, and historical database recovery/migration have separate limitations.
- Historical IndexedDB and grain.db documents are not automatically migrated. The previous Store product remains separate. Back up and export using the older version; do not delete historical databases as if they were disposable indexes.
- File operations can retain .grain-*.tmp originals and transaction evidence containing old text. They can be modified externally, are not immutable backups, and are not automatically erased or cleaned up.
- Ordinary unsaved buffers do not have general restart recovery. Save your work and keep independent backups.
- Document bodies are not automatically cloud-synced. User-configured external rendering services, opened websites, and runtime/update distribution can access the network under their respective policies.

Grain Org implements a supported subset of Org workflows, not a full Emacs or GNU Org mode replacement. Source code is available under the MIT license.

### Features

- Ordinary local Org files with explicitly approved workspace access.
- Org source editing, headings, lists, TODOs, checkboxes, tags, and timestamps.
- File tree, Quick Open, tabs, splits, and shared buffers.
- Agenda, Capture templates, note links, and backlinks.
- Supported HTML/Markdown export and JSON file configuration.

### Search terms

Org mode; local notes; writing; tasks; open source; outliner; knowledge management.

## 0.1.606 候选发行说明

以下只用于完成 Windows 门禁后的正式身份候选，未通过前不能当作已经发行：

**中文**：独立的 Org 文件工作台。新增 Windows 原生文件写入与目录/文件安全边界，核对过期 revision、无覆盖创建、文件身份及访问权限；支持原生 Windows 日历规则。旧数据库作品不自动迁移，旧商店产品不受本产品更新影响。需要 WebView2 Evergreen，恢复原件不会自动清理。

**English**: A separate workspace for local Org files. Adds native Windows file publication with revision, no-clobber, file-identity, and access-control checks, plus native Windows calendar rules. Historical database documents are not automatically migrated; the previous Store product is not updated by this app. WebView2 Evergreen is required. Retained recovery originals are not automatically cleaned up.

## 截图与图标

只上传真正 Windows 安装版的当前 UI，不用 Linux 截图伪装 Windows，不使用旧 Lexical 截图、合成 UI、下载按钮占位图或假认证报告。

[微软截图要求](https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/screenshots-and-images)：Desktop PNG 至少 **1366 × 768**，每张不超过 **50 MB**。至少一张截图；可提供最多 10 张 Desktop 截图。界面内容须真实，不叠加额外营销文案或认证标志。每种商店语言分别上传并填写不超过 200 字符的说明。

Windows readiness artifact 的 `exercise-after.png` / `reopen-after.png` 是真实应用 WebView2 证据，桌面截图用于诊断实际窗口。Smoke 直接调整真实原生窗口并验证 PNG 至少 1366 × 768，将 client area 与原始 PNG 尺寸分别记录在 `*-process.json` / `*-viewport.json`；不模拟浏览器 viewport、不放大图片。使用前必须亲自查看、确认正式身份包的 smoke 成功且没有错误面板/私人数据。历史 run `38885398218` 的 1028 × 749 截图不满足 Store 要求，不可上传。

建议的真实画面及说明：

| 画面 | 中文说明 | English caption |
| --- | --- | --- |
| 文件树与已保存正文 | 在本地目录中编辑普通 Org 文件。 | Edit ordinary Org files in a local workspace. |
| Agenda（实际配置并加载） | 使用计划日期与 TODO 状态整理任务。 | Organize tasks with planning dates and TODO states. |
| 同一笔记的实际分栏 | 多个视图共享同一份正文与撤销历史。 | Multiple views share source and undo history. |
| 实际 Capture 模板 | 用模板记录笔记与待办。 | Capture notes and TODOs with templates. |

只上传已实际打开并验证的画面；不为凑数量制作未运行功能的假图。包内图标来自 `apps/desktop/src-tauri/icons/`；自定义 Store tile 使用实际应用图标并按门户要求导出，不能冒用 MSIX Packaging Tool 的图标。

## 链接与审核备注

- 隐私政策：<https://github.com/jeasoncc/grain#privacy-policy>
- 支持：<https://github.com/jeasoncc/grain/issues>
- 开源代码和许可证：<https://github.com/jeasoncc/grain>
- 产品官网字段可用项目主页；不要填写未经确认归属的域名。

审核说明应包含：无需账号编辑本地文件；首次从 **Open Documents/Grain** 开始；创建 Org 文件、输入正文、`Ctrl-S` 保存、关闭重开验证；WebView2 前置条件；`runFullTrust` 用于用户授权目录中的原生文件句柄操作和系统应用打开；没有自动迁移旧数据库；保存可能保留未加密恢复原件。

年龄分级、隐私/数据声明、市场、定价、发布选项按实际产品和维护者决定填写。没有真实 submission ID、审核状态及可安装的新产品链接时，不得把这份资料称为“已上架”。
