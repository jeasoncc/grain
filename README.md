# Grain

**Local-first notes, writing, and tasks in plain Org files.**

Grain brings writing, linked notes, and task planning into one desktop workspace. Work directly with `.org` files in a local directory you choose—your saved documents stay readable and editable outside the app.

[简体中文](./README.zh-CN.md) · [Download](https://github.com/jeasoncc/grain/releases) · [Desktop guide](./apps/desktop/README.md) · [Documentation](./docs/README.md) · [Report an issue](https://github.com/jeasoncc/grain/issues)

![Grain's Linux desktop showing an Org note with headings, scheduled tasks, checklists, and linked notes beside the workspace file tree.](./docs/assets/grain-workspace.png)

*Linux desktop · Catppuccin Mocha theme · Sample workspace, not personal data.*

> **Development status:** This README describes the current Org-based source tree; older releases may use the former SQLite/Lexical application. **Linux and Windows have native Org saving, moving, and deletion backends; Windows verification uses NTFS.** macOS mutations remain unsupported and fail closed. Platform packaging does not establish equivalent filesystem or power-loss guarantees.

[Features](#what-you-can-do) · [Quick start](#get-started) · [Configuration](#file-configuration) · [Data and safety](#your-files-and-data) · [Development](#development)

## What you can do

| Workflow | Capabilities |
| --- | --- |
| Write and organize | Edit Org text with CodeMirror 6: headings, folding, lists, checkboxes, tags, properties, and timestamps |
| Plan your work | Schedule tasks, track deadlines, configure TODO workflows, and build named Agenda views |
| Capture ideas | Send notes and TODOs to a file, heading, or date tree; create separate diary entries with their own IDs |
| Connect notes | Follow `file:`, `id:`, and `CUSTOM_ID` links; explore backlinks and Org-roam nodes; annotate with Org-remark |
| Stay in context | Fuzzy Quick Open, tabs, buffer switching, split editors, detached windows, and Outline/Properties/Backlinks inspectors |
| Use Org tools | Refile and archive subtrees, clock tasks, work with supported Org tables, export HTML/Markdown, and use configurable keys or optional Vim editing |

Open the same note in multiple views: text and undo history are shared, while selections, folds, and scrolling stay independent. Switching notes preserves unsaved edits.

Grain implements a supported subset of Org workflows. It is not an Emacs runtime or a complete replacement for GNU Org mode and its extensions.

## Get started

Download a packaged build from [GitHub Releases](https://github.com/jeasoncc/grain/releases), matching your operating system and architecture. Check the release version: older builds may not include this Org workspace. To run the current source, follow [Development](#development).

In the native desktop app:

1. **Open a workspace.** Select **Open Documents/Grain** for the default directory, or **Choose another…** to approve an existing local directory.
2. **Open or create a note.** Pick a `.org` file in the file tree, or use **New Org document** and enter a relative path such as `inbox.org` in the bottom input bar.
3. **Find an action.** Press `Alt-X` for **Execute command**, then search for **Open agenda**, **Quick capture**, **New diary entry**, or **Org-roam: find node**.

A workspace can start with a small `inbox.org`:

```org
#+title: Inbox
#+TODO: TODO NEXT | DONE

* TODO Draft the next chapter :writing:
- [ ] Gather notes
- [ ] Write a first draft

* Notes
Keep the source as plain text.
```

### Default keys on Linux

| Key | Action |
| --- | --- |
| `Ctrl-O` | Quick Open |
| `Alt-X`, `Ctrl-P`, or `Ctrl-K` | Execute command |
| `Ctrl-S` | Save the current note |
| `Ctrl-Shift-S` | Save all dirty buffers |
| `Ctrl-Shift-B` | Switch an open buffer |
| `Tab` on a heading / `Shift-Tab` | Fold a subtree / cycle document folding |
| `Ctrl-C Ctrl-T` | Cycle the heading's TODO state |
| `Ctrl-C Ctrl-O` | Follow the Org link at the cursor |

`Ctrl-C Ctrl-T` is a sequence: press `Ctrl-C`, then `Ctrl-T`. Configure shortcuts and optional Vim mode in `config.json` → `keymaps`. See the desktop guide for [all editing keys](./apps/desktop/README.md#org-editing-keys) and [file-tree navigation and actions](./apps/desktop/README.md#file-tree).

## File configuration

Configure Grain through `config.json`, not a graphical preferences page. Run **Open configuration file** from **Execute command**, edit and save the file in your system editor, then run **Reload configuration**.

On Linux, the file is at `$XDG_CONFIG_HOME/com.lotus.grain/config.json`, or `~/.config/com.lotus.grain/config.json` when `XDG_CONFIG_HOME` is unset. It controls themes, fonts, autosave (`saving`), Capture, keymaps, Org behavior, Agenda views, tool placement, and diagram services. Missing fields use defaults; invalid reloads are rejected as a whole without discarding open text or undo history.

See the [configuration example and safety rules](./apps/desktop/README.md#file-configuration) and [theme guide](./docs/desktop/THEMES_GUIDE.md). Grain includes 811 offline [iTerm2-Color-Schemes](https://github.com/mbadolato/iTerm2-Color-Schemes) palettes.

## Your files and data

The default workspace is the system Documents directory under `Grain`; another explicitly approved directory works too.

```text
Documents/Grain/            Saved user content
├── inbox.org
└── projects/
    └── book.org

Application data directory/
├── grain-org-index.db     Derived Org index; rebuildable from workspace files
└── grain.db               Historical database, if present; not a disposable cache
```

SQLite holds rebuildable indexes, not your Org documents. Open notes and undo history live in memory; Agenda and backlinks include unsaved edits. Autosave is configured under `saving` in `config.json`; manual **Save** and **Save All** are also available.

### File safety and current limits

- Local file access runs through Tauri and Rust, scoped to the directory you approve. A browser preview does not have that authority.
- Paths are checked for traversal and symlink escapes. Saves, moves, and deletes check the expected file revision; stale or ambiguous state requires review rather than silent replacement.
- Linux descriptor-bound watching and active-document polling protect dirty buffers. Windows currently uses active-document polling and manual workspace refresh, not filesystem watching. Cross-file refile and archive copy and verify the destination before removing the source.
- Save/delete recovery can retain `.grain-*.tmp` filesystem artifacts. Inspect their paths through **Workspace tools → Recovery files…**. They are mutable recovery objects, **not immutable backups**; there is no automatic restore or garbage collection. Do not remove them blindly. Back up your workspace separately.
- Ordinary unsaved note buffers do **not** have general restart recovery. Capture draft recovery is a separate, explicit opt-in that stores plaintext draft data in local storage and does not automatically publish it.
- Native operations require supported Linux or Windows filesystem primitives. Windows rejects reparse points and EFS-encrypted workspace objects rather than losing encryption through replacement or derived copies. Unsupported conditions fail closed; see the [Windows installation boundaries](./docs/windows-install-guide.md) before choosing a published build.

Details and recovery boundaries are documented in the [desktop guide](./apps/desktop/README.md#file-mutation-rules).

### Historical SQLite data

An old `grain.db` may still hold the only copy of unmigrated writing. **Never delete it as though it were the derived Org index.** Normal Org startup does not open that historical database.

The former `/legacy` editor and desktop Lexical writing paths have been removed. Historical inspection is read-only at `/history`, and inspection/migration require an explicit native recovery launch with `GRAIN_TAURI_LEGACY_MODE=1` on a supported platform. Windows historical SQLite recovery/migration remains unsupported; the native Org backend does not migrate old data. Work only with an explicitly authorized, isolated database copy. See [SQLite startup modes](./apps/desktop/README.md#sqlite-startup-modes) before using recovery tools.

## Development

### Requirements

- **Bun ≥ 1.4.2**; the repository's package-manager pin is `bun@1.4.2`.
- **Node.js** satisfying `^22.22.2 || ^24.15.0 || >=26.0.0`.
- **Rust ≥ 1.94.0** and Cargo.
- [Tauri 2 system prerequisites](https://v2.tauri.app/start/prerequisites/); Linux needs WebKitGTK 4.1 development libraries.

After checking out the repository, install JavaScript dependencies from the repository root and launch the desktop app:

```bash
bun install --frozen-lockfile
cd apps/desktop
bun run tauri dev
```

JavaScript workspaces share the root `bun.lock` and use isolated linking. Do not install a separate desktop dependency tree. The standalone `experiments/doom-runtime` experiment retains its own npm lockfile.

Tauri starts Vite at `http://localhost:1420` for its WebView. Root **`bun run dev` starts only the desktop Vite server**, not the native app or an API server. **`bun run dev:all`** starts the wider monorepo development stack. Neither browser preview grants access to the native Org filesystem; the local desktop workspace does not require a separate HTTP API server.

### Checks and builds

Run these commands from `apps/desktop`:

| Command | Purpose |
| --- | --- |
| `bun run type:check` | Check TypeScript without emitting files |
| `bun run test` | Run the desktop Vitest suite |
| `bun run build` | Check TypeScript and build the production frontend |
| `bun run tauri build` | Build native packages; also runs the frontend build |

Run the shared Rust library tests from the repository root:

```bash
cargo test --manifest-path packages/rust-core/Cargo.toml --lib
```

For focused Org checks, native architecture, and packaging notes, see [Grain Desktop](./apps/desktop/README.md).

## Repository map

| Path | Responsibility |
| --- | --- |
| `apps/desktop/` | React/TypeScript desktop UI and Tauri shell |
| `packages/rust-core/` | Capability-scoped filesystem, indexes, migration, and Tauri commands |
| `packages/editor-*/` | Editor packages; their presence does not imply desktop integration |
| `apps/web/`, `apps/admin/`, `apps/api/`, `apps/api-rust/` | Other monorepo applications, separate from the local Org desktop path |
| `docs/` | Development, architecture, deployment, and release documentation |

For desktop architecture and contribution boundaries, see [Grain Desktop](./apps/desktop/README.md). New document features belong in the Org workspace; preserve raw text and keep filesystem access behind native IO.

## Privacy policy

This policy covers the current **Org-based Grain desktop application**, not GitHub's website or third-party services.

- **Local data.** Saved writing is plain UTF-8 Org text in a directory you approve. Grain also maintains local configuration, rebuildable SQLite indexes, and diagnostic logs. Open buffers and undo history live in memory; optional Capture draft recovery stores plaintext in this WebView's local storage.
- **Retained copies.** Saving, deleting, or exporting can retain prior content, staged bytes, and transaction metadata in `.grain-*` recovery objects. These copies are not encrypted by Grain, immutable backups, or automatically garbage-collected. Deleting a document in Grain is not permanent erasure of every retained copy. Revoking a workspace grant or uninstalling the application does not erase your workspace, exports, or external backups.
- **Network operations.** Grain does not provide automatic cloud synchronization of Org documents. External links, configured diagram services, updates, and WebView2/runtime installation can involve network requests and the relevant third party's privacy policy. A configured external content-rendering service may receive the content it renders; review its settings before using sensitive text.
- **Your control.** You choose workspace and export locations and can revoke workspace access. To remove retained data, close Grain and deliberately remove the applicable files, recovery objects, exports, backups, and local application/WebView data. Do not delete unfamiliar recovery objects until you have verified the writing they retain.
- **Historical data.** Older releases may use IndexedDB or a historical `grain.db`. These are not the derived Org index, are not automatically migrated into Org files, and must not be discarded as caches.
- **Contact.** Use [GitHub Issues](https://github.com/jeasoncc/grain/issues) for support or privacy questions. Issues and attachments are public: remove personal writing, credentials, and private paths before sharing diagnostics.

**中文说明：** 当前 Org 桌面版把正文保存在你批准目录中的本地 Org 文本文件；配置、派生索引、日志及可选 Capture 草稿也保存在本地。保存、删除和导出会保留可能含正文的恢复副本，这些副本不由 Grain 加密，也不会自动清理。应用内删除不是彻底擦除；撤销授权或卸载也不等于删除工作区、导出文件与备份。应用不提供 Org 正文自动云同步；外部链接、按配置启用的图表服务、更新和运行时下载可能访问第三方服务，渲染服务可能接收相关内容。旧版 IndexedDB／`grain.db` 不会自动迁入 Org，不能当成缓存删除。请通过上述公开 Issue 联系支持，提交前清除个人正文、凭据和私人路径。

## Documentation and license

Start with the [desktop guide](./apps/desktop/README.md) and [documentation index](./docs/README.md). Some older documents describe the former Novel Editor / SQLite/Lexical product; they are not the contract for the current Org workspace.

Grain is released under the [MIT license](./LICENSE).
