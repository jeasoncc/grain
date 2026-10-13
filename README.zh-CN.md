<div align="center">

# Grain

**真正以本地 Org 文件为核心的桌面客户端**

作品保存在标准 `.org` 文件中。Grain 提供专注编辑、Agenda、Capture、链接与安全的桌面文件操作，但不会把数据库变成正文的唯一来源。

[English](./README.md) · [桌面端开发说明](./apps/desktop/README.md) · [文档目录](./docs/README.md)

</div>

---

## 核心原则

> **对于新的 Org workspace，Org 文件是唯一事实来源，SQLite 索引只是可清空重建的派生状态。**

默认桌面界面直接打开真实本地目录并编辑其中的 `.org` 文件。新的 Org 索引、缓存和 UI 状态都可重建，不能成为 Org 正文的权威存储。

文件打开期间，canonical 内存 buffer 是工作正文及撤销历史的唯一持有者；窗口只是无独立历史的投影。Agenda、Backlinks 和链接解析优先消费 live source，包含保存失败和 parked buffer 的未保存改动。已确认磁盘 revision 只作为 CAS 基线，不会覆盖更新的输入。

旧 SQLite/Lexical 应用留下的历史 `grain.db` 是另一回事：其中可能仍保存尚未迁移作品的唯一副本，**绝不能将它视为可清空的派生状态**。旧应用目前只保留为明确隔离的迁移兼容界面，待经授权的历史数据库副本通过迁移与恢复验收后删除。

## 已实现功能

- 使用 CodeMirror 6 直接编辑原始 Org 文本
- Obsidian 风格 Ribbon、可调整面板、文档标签、前进/后退和状态栏
- 模糊 Quick Open（`Mod-O`）与 Org 原生命令面板（`Mod-P` 或 `Mod-K`）
- 带 revision 冲突保护的自动保存，同时保留 `Mod-S`
- workspace 授权后恢复标签、活动文档、面板可见性和文件树折叠状态
- 可选的 Outline、Properties 与 Backlinks 检查面板
- 真实文件和空目录组成的递归 workspace 树
- 安全的新建、读取、revision 写入、移动、重命名和删除
- Org 风格折叠、标题/列表编辑、可配置 TODO 流程、Tags、Planning 日期、Properties、时间戳、subtree move、Refile 和 Archive
- Agenda 提取、稀疏 Outline 过滤与 TODO Capture
- `file:`、`id:`、`CUSTOM_ID` 链接跳转
- Backlinks 与精确来源定位
- `diary/YYYY-MM-DD.org` 日记文件
- 系统 Documents 目录下的默认 `Grain` workspace
- 外部文件监听、轮询 fallback、dirty buffer 和冲突提示
- 可从 Org 文件重建的文档、标题、链接和 Agenda 索引
- 带 raw backup、manifest、hash、恢复 SQL 和 recovery drill 的旧数据迁移

## 存储模型

```text
Documents/Grain/             用户作品，唯一事实来源
├── inbox.org
├── projects/
└── diary/YYYY-MM-DD.org

应用数据目录/                 应用状态
├── grain-org-index.db       可从 Org workspace 重建；普通桌面启动使用
└── grain.db                 历史数据库；明确迁移与验证前可能仍是权威数据
```

清空 SQLite Org 派生索引不能损坏任何 Org 文件；应用必须能够通过重新扫描 workspace 恢复索引。不要因为新的 Org 索引可丢弃，就删除尚未验证迁移的历史 `grain.db`。

## 文件安全

本地文件访问由 Tauri/Rust 完成，不依赖普通网页文件 API。

- 用户批准目录后，应用保留 capability-scoped directory handle。
- 拒绝路径穿越、绝对路径、反斜杠和非法文档目标。
- 拒绝 symlink 越界，扫描器不会跟随 symlink 目录。
- 普通写入必须提供 `expectedRevision`，过期内容会产生冲突。
- 普通保存保留持久化、绑定文件身份的发布 journal；重新授权目录时先恢复再扫描。外来同名文件、身份不明产物和歧义状态保留并拒绝处理，不擅自覆盖或清除。
- 支持的平台使用 staging 与原子 no-clobber 发布迁移结果。
- Refile/Archive 采用 copy-first，部分失败时优先保留可恢复副本。
- 默认 workspace 只在用户明确点击后创建；重启恢复不会静默重建被用户删除的目录。

## CodeMirror 与 Lexical

| 界面 | 编辑器 | 定位 |
|---|---|---|
| 默认 `/`、`/org` | CodeMirror 6，直接持有 Org 原文 | 主路径 |
| 显式 `/legacy` | Lexical，读取旧 SQLite 正文 | 迁移兼容 |

`/legacy` 的业务 provider、迁移选择器及编辑器样式仅在原生启动时固定的 `legacy` 模式授权后加载。需明确使用 `GRAIN_TAURI_LEGACY_MODE=1` 启动历史恢复环境；普通浏览器、无效模式及查询失败均不能授权。Activity Bar 保持 Org 主路径。只有历史数据库副本完成迁移与恢复验收后，才会移除最后的 Lexical 与 SQLite 正文写入代码。

## 项目结构

```text
apps/desktop/                 Tauri 桌面端
apps/desktop/src/flows/       业务流程
apps/desktop/src/io/          Tauri/API/event 边界
apps/desktop/src/pipes/org/   纯 Org 文本转换
apps/desktop/src/views/       React 界面
packages/rust-core/           capability 文件系统、数据库与 Tauri commands
packages/editor-codemirror/   CodeMirror 编辑器包
packages/editor-lexical/      旧系统兼容编辑器包
```

## 本地开发

### 环境要求

- Bun 1.4.2（仓库包管理器与 CI 固定版本）
- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`（CI 使用 24.21.0；本地验证使用 26.10.0）
- Rust >= 1.94.0（验证使用 1.94.1）
- Tauri 2 系统依赖
- Linux 需要 WebKitGTK 4.1 开发包

### 安装与启动

```bash
bun install --frozen-lockfile
cd apps/desktop
bun run tauri dev
```

JavaScript workspace 统一从仓库根目录安装，仅使用根 `bun.lock`。
隔离链接使不同 workspace 的不兼容 peer 版本不会相互覆盖。
独立实验 `experiments/doom-runtime` 保留自己的 npm 锁文件。

开发时 Vite 在 `http://localhost:1420` 为 Tauri WebView 提供页面。该地址不是面向普通浏览器的本地文件访问方案。

仓库根目录的 `bun run dev` 仅启动 desktop Vite，不再默认启动历史 Warp API；`bun run dev:all` 显式启动较大的 monorepo 开发栈。浏览器预览不能获取原生文件权限。

### 核心验证

```bash
cd apps/desktop
bun run type:check
bunx vitest run \
  src/hooks/use-org-workspace.test.ts \
  src/io/file/org-file.repository.test.ts \
  src/flows/org-workspace/org-workspace.flow.test.ts

cd ../..
cargo test --manifest-path packages/rust-core/Cargo.toml --offline --lib
```

### 构建

```bash
cd apps/desktop
bun run build
bun run tauri build
```

## 当前迁移状态

文件权威的 Org 主路径、编辑器、Agenda、链接、派生索引、迁移产物和合成恢复演练已经完成。删除旧系统前仍需：

1. 在用户明确授权的真实历史 `grain.db` 副本上完成 migration/recovery 演练。
2. 验收通过后把 `/legacy` 改为只读。
3. 删除剩余 Lexical 和 SQLite 正文写入路径。
4. 为 Windows 实现等价 ACL、文件身份检查及原子发布保证。
5. 继续清理只覆盖旧界面的陈旧测试。

未经明确授权，不应读取或修改任何真实历史数据库。

## 许可证

MIT，参见 [LICENSE](./LICENSE)。
