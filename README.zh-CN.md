# Grain

**以本地 Org 文件为核心的笔记、写作与任务桌面工作台。**

Grain 是一个基于 Tauri 的桌面应用，直接管理本地目录中的 `.org` 文件，将文本编辑、Agenda、Capture、笔记链接与多窗口工作流整合在同一个 workspace 中。保存后的文档仍是普通文件，可以在 Grain 之外阅读和编辑；SQLite 只提供可重建的索引，不承载正文。

[English](./README.md) · [下载发行版](https://github.com/jeasoncc/grain/releases) · [桌面端指南](./apps/desktop/README.md) · [文档目录](./docs/README.md)

> 项目仍在持续开发。本文描述当前基于 Org 的源码，较早的发行版可能仍使用旧 SQLite/Lexical 应用。**当前原生 Org 保存、移动与删除以 Linux 为支持目标。** macOS 和 Windows 尚未具备等价的文件系统支持；不支持的操作会被拒绝，不会退回不安全的实现。

## 可以用它做什么

| 工作流 | 功能 |
| --- | --- |
| 写作与整理 | 用 CodeMirror 6 编辑 Org 原文；标题与列表操作、折叠、TODO 状态、复选框、标签、属性与时间戳；子树 Refile 与 Archive |
| 安排任务 | 计划日期与截止日期、可配置 TODO 流程、命名 Agenda 视图，以及 Sparse Tree 稀疏树过滤 |
| 快速记录 | 支持文件、标题或 datetree 日期树目标的 TODO/笔记 Capture 模板；每次新建独立且带 ID 的日记条目 |
| 连接笔记 | `file:`、`id:`、`CUSTOM_ID` 跳转与反向链接；Org-roam 节点查找、记录与链接插入；Org-remark 高亮和边注 |
| 多视图工作 | 模糊 Quick Open、标签页、buffer 切换、分栏编辑、独立原生窗口，以及 Outline / Properties / Backlinks 检查面板 |
| 使用 Org 工具 | 任务计时与报告、受支持的 Org 表格操作、HTML/Markdown 导出、可配置快捷键、Which-Key 提示与可选 Vim 编辑 |

同一笔记的多个视图共享正文和撤销历史，选区、折叠与滚动位置各自独立。切换笔记不会丢弃未保存修改。自动保存在 `config.json` 的 `saving` 中配置，也可以手动保存当前笔记或全部修改。

Grain 实现的是一组受支持的 Org 工作流，不是 Emacs 运行时，也不承诺完整替代 GNU Org mode 及其扩展。

## 开始使用

安装包见 [GitHub Releases](https://github.com/jeasoncc/grain/releases)。选择对应操作系统和架构的文件，并先核对发行版本：旧安装包不一定包含当前 Org workspace。要运行本文描述的源码，请按下方的[本地开发](#本地开发)步骤启动。

在原生桌面应用中：

1. 点击 **Open Documents/Grain**，创建或打开系统 Documents 目录下的默认 workspace；也可以用 **Choose another…** 授权一个已有本地目录。
2. 从文件树打开 `.org` 文件，或点击 **New Org document**，在底部 minibuffer 输入 `inbox.org` 这样的相对路径。
3. 通过 **Execute command** 查找 **Open agenda**、**Quick capture**、**New diary entry**、**Org-roam: find node** 等操作。

可以先创建一个简单的 `inbox.org`：

```org
#+title: Inbox
#+TODO: TODO NEXT | DONE

* TODO 起草下一章 :writing:
- [ ] 整理素材
- [ ] 完成初稿

* 笔记
正文保持为普通文本。
```

### Linux 默认快捷键

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl-O` | 快速打开文件 |
| `Alt-X`、`Ctrl-P` 或 `Ctrl-K` | 执行命令 |
| `Ctrl-S` | 保存当前笔记 |
| `Ctrl-Shift-S` | 保存所有已修改 buffer |
| `Ctrl-Shift-B` | 切换已打开的 buffer |
| 标题上的 `Tab` / `Shift-Tab` | 折叠子树 / 切换全文折叠状态 |
| `Ctrl-C Ctrl-T` | 切换标题的 TODO 状态 |
| `Ctrl-C Ctrl-O` | 跟随光标处的 Org 链接 |

`Ctrl-C Ctrl-T` 表示先按 `Ctrl-C`，再按 `Ctrl-T`。作用域快捷键和可选 Vim 模式在 `config.json` 的 `keymaps` 中配置。完整按键说明见[桌面端编辑指南](./apps/desktop/README.md#org-editing-keys)。

[文件树](./apps/desktop/README.md#file-tree) 使用方向键导航；行获得焦点时支持 `F2` 重命名、`Delete` 确认删除、`F5` 刷新和 `Ctrl/Cmd-F` 筛选。右键 / **…** 菜单标明目标，新建和重命名输入框只预选文件名主体，保留 `.org` 后缀。文件树不再内置 Vim/Treemacs 键位；正文的可选 Vim 模式不变。

## 文件配置

Grain 不提供图形化偏好设置页或主题选择器。在 **Execute command** 中执行 **Open configuration file**，将 `config.json` 交给系统默认应用打开；保存文件后执行 **Reload configuration**。

配置位于原生应用配置目录。Linux 下是 `$XDG_CONFIG_HOME/com.lotus.grain/config.json`；未设置 `XDG_CONFIG_HOME` 时为 `~/.config/com.lotus.grain/config.json`。首次创建文件时迁移旧偏好；Grain 不会回写已有文件。

版本为 1 的 JSON 文档统一管理外观、字体、保存、字数统计、Capture、快捷键、Org 行为、Agenda 视图、工具位置和图表服务。缺失字段使用默认值；未知字段或无效值会拒绝整份重载，保留原有视觉偏好、Source 与 Undo。主题使用内置的 811 套 [iTerm2-Color-Schemes](https://github.com/mbadolato/iTerm2-Color-Schemes) 配色的精确名称。

参见[配置示例与安全规则](./apps/desktop/README.md#file-configuration)和[主题指南](./docs/desktop/THEMES_GUIDE.md)。

## 文件与数据归属

默认 workspace 位于系统 Documents 目录下的 `Grain`，也可以使用另一个明确授权的目录。

```text
Documents/Grain/            已保存的用户内容
├── inbox.org
└── projects/
    └── book.org

应用数据目录/
├── grain-org-index.db     Org 派生索引，可从 workspace 文件重建
└── grain.db               可能存在的历史数据库，不是可随意删除的缓存
```

编辑期间，共享的内存 buffer 持有工作正文与撤销历史。Agenda 和反向链接读取包含未保存修改的实时正文，不会用较旧的磁盘或索引快照覆盖它。最后确认的磁盘 revision 单独记录，作为保存基线。

### 文件安全与当前限制

- 本地文件访问通过 Tauri/Rust 完成，限制在用户授权的目录内；浏览器预览没有这项权限。
- 路径会检查目录穿越与符号链接越界。保存、移动和删除检查预期文件 revision；遇到过期或不明确的状态时需要核对，不会静默替换。
- 外部文件监听与轮询保护未保存内容。跨文件 Refile/Archive 先复制并验证目标，再移除来源。
- 保存或删除可能保留 `.grain-*.tmp` 文件系统恢复产物，可通过 **Workspace tools → Recovery files…** 查看路径。它们可被外部写入修改，**不是不可变备份**，不会自动恢复或清理；不要直接批量删除。请另外备份 workspace。
- 普通笔记的未保存 buffer **尚不支持通用重启恢复**。Capture 草稿恢复是独立的显式选项，会将明文草稿保存在本地存储中，不会自动写入 Org 文件。
- 原生文件操作依赖受支持的 Linux 文件系统原语。不支持的平台或文件系统条件会直接拒绝操作；存在某平台的安装包不等于当前 Org 文件系统已在该平台具备等价支持。

具体规则与恢复边界见[桌面端指南](./apps/desktop/README.md#file-mutation-rules)。

### 旧 SQLite 数据

历史 `grain.db` 可能仍保存尚未迁移作品的唯一副本，**绝不能把它当作 Org 派生索引删除**。普通 Org 启动不会打开这个历史数据库。

旧 `/legacy` 编辑器与桌面 Lexical 正文写入路径已经移除。历史数据通过 `/history` 只读查看，查看与迁移工具都需要以 `GRAIN_TAURI_LEGACY_MODE=1` 明确启动原生恢复环境。仅操作经过明确授权的隔离数据库副本。使用恢复工具前，请阅读 [SQLite 启动模式说明](./apps/desktop/README.md#sqlite-startup-modes)。

## 本地开发

### 环境要求

- **Bun ≥ 1.4.2**；仓库包管理器固定为 `bun@1.4.2`。
- **Node.js** 满足 `^22.22.2 || ^24.15.0 || >=26.0.0`。
- **Rust ≥ 1.94.0** 与 Cargo。
- [Tauri 2 系统依赖](https://v2.tauri.app/start/prerequisites/)；Linux 需要 WebKitGTK 4.1 开发库。

检出仓库后，在仓库根目录安装 JavaScript 依赖，再启动桌面应用：

```bash
bun install --frozen-lockfile
cd apps/desktop
bun run tauri dev
```

JavaScript workspace 共用根目录的 `bun.lock`，使用隔离依赖链接。不要单独安装一套桌面端依赖。独立实验 `experiments/doom-runtime` 保留自己的 npm 锁文件。

Tauri 会启动 `http://localhost:1420` 上的 Vite 服务，供 WebView 使用。根目录的 **`bun run dev` 只启动桌面 Vite 服务**，不启动原生应用或 API 服务；**`bun run dev:all`** 才会启动更大的 monorepo 开发栈。这两种浏览器预览都不能获得原生 Org 文件权限；本地桌面 workspace 不需要另起 HTTP API 服务。

### 检查与构建

以下命令在 `apps/desktop` 中运行：

| 命令 | 用途 |
| --- | --- |
| `bun run type:check` | 检查 TypeScript，不生成文件 |
| `bun run test` | 运行桌面端 Vitest 测试 |
| `bun run build` | 检查 TypeScript 并构建生产前端 |
| `bun run tauri build` | 构建原生安装包，同时执行前端构建 |

共享 Rust 库测试在仓库根目录运行：

```bash
cargo test --manifest-path packages/rust-core/Cargo.toml --lib
```

Org 定向验证、原生架构与打包说明见 [Grain Desktop](./apps/desktop/README.md)。

## 仓库结构

| 路径 | 职责 |
| --- | --- |
| `apps/desktop/` | React/TypeScript 桌面 UI 与 Tauri shell |
| `apps/desktop/src/flows/` | 业务流程，以及编辑器/workspace 状态归属 |
| `apps/desktop/src/pipes/org/` | 纯 Org 解析与文本变换 |
| `apps/desktop/src/io/` | 原生文件系统、API 与事件边界 |
| `packages/rust-core/` | 目录授权文件系统、索引、迁移与 Tauri commands |
| `packages/editor-*/` | 编辑器包；存在某个包不代表桌面端正在使用它 |
| `apps/web/`、`apps/admin/`、`apps/api/`、`apps/api-rust/` | 其他 monorepo 应用，与本地 Org 桌面主路径分开 |
| `docs/` | 开发、架构、部署与发布文档 |

新增桌面文档功能应进入 Org workspace：保留 Org 原文，将文件访问限制在原生 IO 边界内，并保证 SQLite 索引可重建。独立的 Lexical 编辑器包不是桌面端依赖。

## 文档与许可证

从[桌面端指南](./apps/desktop/README.md)和[文档目录](./docs/README.md)开始。部分旧文档描述原 Novel Editor / SQLite/Lexical 产品，不应作为当前 Org workspace 的功能约定。

Grain 使用 [MIT 许可证](./LICENSE)。
