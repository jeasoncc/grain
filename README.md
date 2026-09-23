<div align="center">

# Grain

**A local-first Org-mode desktop client**

Your writing lives in standard `.org` files. Grain adds a focused editor, agenda, capture, links, and safe desktop file operations without turning a database into the source of truth.

[中文说明](./README.zh-CN.md) · [Desktop development guide](./apps/desktop/README.md) · [Documentation](./docs/README.md)

</div>

---

## What Grain is

Grain is being rebuilt around a simple rule:

> **Org files are authoritative. SQLite is disposable derived state.**

The default desktop experience opens a real local directory and edits its `.org` files directly. The application database may contain rebuildable indexes, caches, and UI state, but it is not the canonical document store.

The previous SQLite/Lexical application remains available only as an explicitly separated legacy migration surface while migration verification is completed.

## Current capabilities

- Raw-text Org editing with CodeMirror 6
- Recursive workspace tree with real files and empty directories
- Safe create, read, revision-checked write, move, rename, and delete operations
- `TODO`, heading level, checkbox, subtree move, refile, and archive operations
- Agenda extraction and TODO capture
- `file:`, `id:`, and `CUSTOM_ID` link navigation
- Backlinks with exact source navigation
- Daily notes at `diary/YYYY-MM-DD.org`
- Default workspace at the system Documents directory under `Grain`
- External file watching, polling fallback, dirty-buffer protection, and conflict reporting
- Rebuildable SQLite indexes for documents, headings, links, and agenda entries
- Auditable legacy migration with raw backups, manifests, hashes, recovery SQL, and recovery drills

## Storage model

```text
Documents/Grain/             Canonical user content
├── inbox.org
├── projects/
└── diary/YYYY-MM-DD.org

Application data directory/  Non-canonical application state
└── grain.db                 Derived indexes, caches, UI state, and temporary legacy data
```

Deleting the derived Org index must not delete or invalidate the Org files. The index can be rebuilt by scanning the workspace.

## Safety model

Local file access is implemented by Tauri and Rust rather than browser filesystem APIs.

- A selected workspace is retained as a capability-scoped directory handle.
- Relative paths reject traversal, absolute paths, backslashes, and non-Org document targets.
- Symlink escapes are rejected and workspace scans do not follow symlink directories.
- Ordinary writes require an expected revision and reject stale content.
- Migration publication uses staged artifacts and atomic no-clobber operations on supported platforms.
- Refile and archive use copy-first behavior and preserve recoverable duplicates after partial failure.
- The fixed default workspace is created only after an explicit user action. Automatic restart recovery never silently recreates a removed directory.

## Editor transition

| Surface | Editor | Status |
|---|---|---|
| Default `/` and `/org` workspace | CodeMirror 6 over raw Org text | Primary |
| Explicit `/legacy` workspace | Lexical over legacy SQLite content | Migration compatibility only |

The legacy route is lazy-loaded and is not presented as a peer application in the main activity bar. Lexical will be removed after a verified migration/recovery run against an authorized historical database copy.

## Repository layout

```text
apps/desktop/                 Tauri desktop UI
apps/desktop/src/flows/       Business flows
apps/desktop/src/io/          Tauri/API/event boundaries
apps/desktop/src/pipes/org/   Pure Org text transformations
apps/desktop/src/views/       React views and containers
packages/rust-core/           Capability filesystem, database, and Tauri commands
packages/editor-codemirror/   CodeMirror editor package
packages/editor-lexical/      Legacy editor package
```

## Development

### Requirements

- Bun 1.1+
- Node.js 20+
- Rust stable toolchain
- Tauri 2 system prerequisites
- Linux: WebKitGTK 4.1 development packages

### Install

```bash
bun install
```

### Run the desktop application

```bash
cd apps/desktop
bun run tauri dev
```

Vite listens on `http://localhost:1420` for the Tauri WebView during development. It is not a browser-based replacement for the desktop filesystem boundary.

### Verify the main Org path

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

### Build

```bash
cd apps/desktop
bun run build
bun run tauri build
```

## Migration status

The file-authoritative Org path, editor, agenda, links, derived indexes, migration artifacts, and synthetic recovery drill are implemented. Before deleting the final legacy write paths, the project still requires:

1. A complete migration and recovery drill against an explicitly authorized copy of a historical `grain.db`.
2. Conversion of `/legacy` to read-only mode after that drill passes.
3. Removal of remaining Lexical and legacy SQLite body-writing code.
4. Equivalent Windows ACL, file-identity, and atomic publication guarantees for migration and move operations.
5. Continued cleanup of stale tests for legacy-only UI surfaces.

No real historical database should be read or modified without explicit authorization.

## License

MIT — see [LICENSE](./LICENSE).
