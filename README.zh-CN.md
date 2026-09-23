<div align="center">

# Grain

**真正以本地 Org 文件为核心的桌面客户端**

作品保存在标准 `.org` 文件中。Grain 提供专注编辑、Agenda、Capture、链接与安全的桌面文件操作，但不会把数据库变成正文的唯一来源。

[English](./README.md) · [桌面端开发说明](./apps/desktop/README.md) · [文档目录](./docs/README.md)

</div>

---

## 核心原则

> **Org 文件是唯一事实来源，SQLite 只是可以清空重建的派生状态。**

默认桌面界面直接打开真实本地目录并编辑其中的 `.org` 文件。SQLite 可以保存索引、缓存和 UI 状态，但不能成为 Org 正文的权威存储。

旧 SQLite/Lexical 应用目前只保留为明确隔离的迁移兼容界面，待真实历史数据库副本通过迁移与恢复验收后删除。

## 已实现功能

- 使用 CodeMirror 6 直接编辑原始 Org 文本
- 真实文件和空目录组成的递归 workspace 树
- 安全的新建、读取、revision 写入、移动、重命名和删除
- TODO、标题层级、checkbox、subtree move、Refile 和 Archive
- Agenda 提取与 TODO Capture
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

应用数据目录/                 非权威应用状态
└── grain.db                 派生索引、缓存、UI 状态及临时 legacy 数据
```

清空 SQLite Org 索引不能损坏任何 Org 文件；应用必须能够通过重新扫描 workspace 恢复索引。

## 文件安全

本地文件访问由 Tauri/Rust 完成，不依赖普通网页文件 API。

- 用户批准目录后，应用保留 capability-scoped directory handle。
- 拒绝路径穿越、绝对路径、反斜杠和非法文档目标。
- 拒绝 symlink 越界，扫描器不会跟随 symlink 目录。
- 普通写入必须提供 `expectedRevision`，过期内容会产生冲突。
- 支持的平台使用 staging 与原子 no-clobber 发布迁移结果。
- Refile/Archive 采用 copy-first，部分失败时优先保留可恢复副本。
- 默认 workspace 只在用户明确点击后创建；重启恢复不会静默重建被用户删除的目录。

## CodeMirror 与 Lexical

| 界面 | 编辑器 | 定位 |
|---|---|---|
| 默认 `/`、`/org` | CodeMirror 6，直接持有 Org 原文 | 主路径 |
| 显式 `/legacy` | Lexical，读取旧 SQLite 正文 | 迁移兼容 |

`/legacy` 使用 lazy route，不再作为 Activity Bar 的同级主产品入口。只有历史数据库副本完成迁移与恢复验收后，才会移除最后的 Lexical 与 SQLite 正文写入代码。

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

- Bun 1.1+
- Node.js 20+
- Rust stable
- Tauri 2 系统依赖
- Linux 需要 WebKitGTK 4.1 开发包

### 安装与启动

```bash
bun install
cd apps/desktop
bun run tauri dev
```

开发时 Vite 在 `http://localhost:1420` 为 Tauri WebView 提供页面。该地址不是面向普通浏览器的本地文件访问方案。

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
