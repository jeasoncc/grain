# Grain

**Local-first notes, writing, and tasks in plain Org files.**

Grain is a Tauri desktop app for working with a local directory of `.org` files. It brings a text editor, Agenda, Capture, linked notes, and multiple editor views into one workspace. Your saved documents remain ordinary files you can read and edit outside Grain; SQLite provides rebuildable indexes, not document storage.

[简体中文](./README.zh-CN.md) · [Releases](https://github.com/jeasoncc/grain/releases) · [Desktop guide](./apps/desktop/README.md) · [Documentation](./docs/README.md)

> Grain is under active development. This README describes the current Org-based source tree; older published builds may still use the former SQLite/Lexical application. **Linux is the current target for native Org saving, moving, and deletion.** macOS and Windows do not yet provide equivalent filesystem support; unsupported operations are refused rather than using an unsafe fallback.

## What you can do

| Workflow | Capabilities |
| --- | --- |
| Write and organize | CodeMirror 6 editing of raw Org text; heading and list operations; folding; TODO states, checkboxes, tags, properties, and timestamps; subtree refile and archive |
| Plan your work | Scheduled tasks and deadlines, configurable TODO workflows, named Agenda views, and sparse-tree filtering |
| Capture ideas | TODO and note templates with file, heading, or datetree targets; separate diary entries with per-entry IDs |
| Connect notes | `file:`, `id:`, and `CUSTOM_ID` navigation; backlinks; Org-roam node lookup, capture, and link insertion; Org-remark highlights and marginal notes |
| Work across views | Fuzzy Quick Open, tabs, buffer switching, split editors, detached native views, and Outline/Properties/Backlinks inspectors |
| Use Org tools | Task clocks and reports, supported Org table operations, HTML/Markdown export, configurable keymaps, Which-Key hints, and opt-in Vim editing |

Views of the same note share text and undo history while keeping their own selection, folds, and scroll position. Switching notes preserves unsaved edits. Autosave is configured in `config.json` under `saving`; manual Save / Save All remains available.

Grain implements a supported subset of Org workflows. It is not an Emacs runtime or a complete replacement for GNU Org mode and its extensions.

## Get started

Packaged builds are available on [GitHub Releases](https://github.com/jeasoncc/grain/releases). Choose the asset for your operating system and architecture, and check the release version before assuming it includes the current Org workspace. To run the source described here, use the [development instructions](#development).

In the native desktop app:

1. Select **Open Documents/Grain** to create or open the default workspace, or **Choose another…** to approve an existing local directory.
2. Open a `.org` file from the file tree, or use **New Org document** and enter a relative path such as `inbox.org` in the bottom minibuffer.
3. Use **Execute command** to find actions such as **Open agenda**, **Quick capture**, **New diary entry**, and **Org-roam: find node**.

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

`Ctrl-C Ctrl-T` is a sequence: press `Ctrl-C`, then `Ctrl-T`. Scoped bindings and optional Vim mode are configured in the `keymaps` section of `config.json`. See the [desktop editing guide](./apps/desktop/README.md#org-editing-keys) for the full supported key set.

The [file tree](./apps/desktop/README.md#file-tree) uses arrow navigation. Focused rows support `F2` rename, `Delete` confirmation, `F5` refresh and `Ctrl/Cmd-F` filtering. Right-click / **…** menus identify their target; new-file and rename readers preselect the filename stem while preserving `.org`. Built-in Vim/Treemacs tree keys are removed; optional Source Vim mode is unchanged.

## File configuration

Grain has no graphical preferences pages or theme picker. In **Execute command**, run **Open configuration file** to open `config.json` with the system default application; after saving it, run **Reload configuration**.

The native configuration lives in the application configuration directory. On Linux this is `$XDG_CONFIG_HOME/com.lotus.grain/config.json`, or `~/.config/com.lotus.grain/config.json` when `XDG_CONFIG_HOME` is unset. Preferences migrate once when the file is first created; an existing file is never rewritten by Grain.

The version-1 JSON document controls appearance, fonts, saving, word counts, Capture, keymaps, Org behavior, Agenda views, tool placement and diagram services. Missing fields use defaults; unknown fields or invalid values reject the complete reload. Visual preferences, Source and Undo are retained on rejection. Themes use exact names from 811 bundled [iTerm2-Color-Schemes](https://github.com/mbadolato/iTerm2-Color-Schemes) palettes.

See the [configuration example and safety rules](./apps/desktop/README.md#file-configuration) and [theme guide](./docs/desktop/THEMES_GUIDE.md).

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

While a note is open, its shared in-memory buffer owns the working text and undo history. Agenda and backlinks use live text, including unsaved changes, rather than replacing it with an older disk or index snapshot. The last confirmed disk revision is tracked separately for saving.

### File safety and current limits

- Local file access runs through Tauri and Rust, scoped to the directory you approve. A browser preview does not have that authority.
- Paths are checked for traversal and symlink escapes. Saves, moves, and deletes check the expected file revision; stale or ambiguous state requires review rather than silent replacement.
- External-change watching and polling protect dirty buffers. Cross-file refile and archive copy and verify the destination before removing the source.
- Save/delete recovery can retain `.grain-*.tmp` filesystem artifacts. Inspect their paths through **Workspace tools → Recovery files…**. They are mutable recovery objects, **not immutable backups**; there is no automatic restore or garbage collection. Do not remove them blindly. Back up your workspace separately.
- Ordinary unsaved note buffers do **not** have general restart recovery. Capture draft recovery is a separate, explicit opt-in that stores plaintext draft data in local storage and does not automatically publish it.
- Native file operations depend on supported Linux filesystem primitives. Unsupported platforms or filesystem conditions fail closed; packaging for an OS does not establish equivalent Org filesystem support.

Details and recovery boundaries are documented in the [desktop guide](./apps/desktop/README.md#file-mutation-rules).

### Historical SQLite data

An old `grain.db` may still hold the only copy of unmigrated writing. **Never delete it as though it were the derived Org index.** Normal Org startup does not open that historical database.

The former `/legacy` editor and desktop Lexical writing paths have been removed. Historical inspection is read-only at `/history`, and inspection/migration require an explicit native recovery launch with `GRAIN_TAURI_LEGACY_MODE=1`. Work only with an explicitly authorized, isolated database copy. See [SQLite startup modes](./apps/desktop/README.md#sqlite-startup-modes) before using recovery tools.

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
| `apps/desktop/src/flows/` | Business flows and editor/workspace ownership |
| `apps/desktop/src/pipes/org/` | Pure Org parsing and text transformations |
| `apps/desktop/src/io/` | Native filesystem, API, and event boundaries |
| `packages/rust-core/` | Capability-scoped filesystem, indexes, migration, and Tauri commands |
| `packages/editor-*/` | Editor packages; their presence does not imply desktop integration |
| `apps/web/`, `apps/admin/`, `apps/api/`, `apps/api-rust/` | Other monorepo applications, separate from the local Org desktop path |
| `docs/` | Development, architecture, deployment, and release documentation |

New desktop document features belong in the Org workspace. Preserve raw Org text, keep filesystem access behind native IO, and keep SQLite indexes rebuildable. The standalone Lexical package is not a desktop dependency.

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
