<div align="center">

# Grain

**A local-first Org-mode desktop client**

Your writing lives in standard `.org` files. Grain adds a focused editor, agenda, capture, links, and safe desktop file operations without turning a database into the source of truth.

[中文说明](./README.zh-CN.md) · [Desktop development guide](./apps/desktop/README.md) · [Documentation](./docs/README.md)

</div>

---

## What Grain is

Grain is being rebuilt around a simple rule:

> **For the new Org workspace, Org files are authoritative and its SQLite indexes are disposable.**

The default desktop experience opens a real local directory and edits its `.org` files directly. New Org indexes, caches, and UI state are rebuildable and are not canonical document storage.

While a file is open, its canonical in-memory buffer owns the working text and undo history. Editor windows are history-free projections; agenda, backlinks and link resolution use that live source, including failed-save and parked edits. The confirmed disk revision remains the separate compare-and-swap baseline, never a replacement for newer input.

An existing `grain.db` from the previous SQLite/Lexical application may still contain the only copy of unmigrated writing and **must not be deleted or treated as disposable**. Historical inspection is now a startup-gated, read-only `/history` surface; the desktop no longer loads a Lexical workspace or legacy body-writing providers. Migration and recovery operate only on an explicitly authorized database copy.

## Current capabilities

- Raw-text Org editing with CodeMirror 6
- Obsidian-style ribbon, resizable panes, note tabs, back/forward history, and status bar
- Fuzzy Quick Open (`Mod-O`), execute-command (`Alt-x`), and an Org-native command palette (`Mod-P` or `Mod-K`)
- Conflict-aware per-buffer autosave for active and inactive Org buffers, honoring Settings → General enable/interval controls, plus explicit `Mod-S`
- Restored tabs, active note, panel visibility, and tree expansion after workspace authorization
- Optional Outline, Properties, and Backlinks inspector
- Recursive workspace tree with real files and empty directories
- Safe create, read, revision-checked write, move, rename, and delete operations
- Org-style folding, heading/list editing, configurable TODO workflows, tags, planning dates, properties, timestamps, subtree move, refile, and archive
- Scoped, versioned Org Source keymaps, configurable leaders/transients, and Which-Key hints in Settings → Editor; blank retains existing defaults (no Space leader), invalid saved overrides remain visible, and configuration changes cancel old input leases and captured commands
- Named declarative Agenda views, window-local body Sparse Tree queries, and configurable Org Capture with literal prompts, file/heading/datetree targets, and opt-in draft recovery
- `file:`, `id:`, and `CUSTOM_ID` link navigation
- Backlinks with exact source navigation
- Fresh Doom-style diary entries with local-calendar directories and per-entry UUIDs
- Fresh ordinary Org notes with the Doom header, UUID, and EOF cursor; existing notes and generated sidecars are not rewritten
- Chronological Org-roam capture, file/heading nodes and aliases, literal ID-link insertion, follow, and backlinks
- Source-sibling Org-remark highlights, line icons, pens and marginal notes, with independent sidecar history and conflict-aware CAS
- Independent native Source windows and file-effect owners; shared canonical history with window-local selection, folds and viewport
- An application-lifetime tool host retaining declined-close drafts and retired-producer output, with explicit origin return and protected pending work
- Quiet text-input focus without outer outlines/glow, with keyboard and high-contrast cues retained
- Default workspace at the system Documents directory under `Grain`
- External file watching, polling fallback, dirty-buffer protection, and conflict reporting
- Rebuildable SQLite indexes for documents, headings, links, and agenda entries
- Auditable legacy migration with raw backups, manifests, hashes, recovery SQL, and recovery drills

## Storage model

```text
Documents/Grain/             Canonical user content
├── inbox.org
├── projects/
└── ا-diary/
    └── year-2026-Horse/month-10-October/day-06-Tuesday/
        └── diary-1791261296-12-34-56.org

Application data directory/  Application state
├── grain-org-index.db      Rebuildable from the Org workspace; normal desktop startup
└── grain.db                Historical; potentially canonical until explicitly migrated and verified
```

Each diary action creates a new entry in the explicitly approved workspace. Same-second collisions use `-2.org`, `-3.org`, and so on without overwriting existing targets. Older `diary/YYYY-MM-DD.org` files remain untouched.

Deleting the derived Org index must not delete or invalidate the Org files; it can be rebuilt by scanning the workspace. Never delete a historical `grain.db` merely because the new Org index is disposable.

## Safety model

Local file access is implemented by Tauri and Rust rather than browser filesystem APIs.

- A selected workspace is retained as a capability-scoped directory handle.
- Relative paths reject traversal, absolute paths, backslashes, and non-Org document targets.
- Symlink escapes are rejected and workspace scans do not follow symlink directories.
- Ordinary writes require an expected revision and reject stale content.
- Ordinary saves retain a durable, file-identity-bound publication journal. Workspace reopening recovers interrupted publication before scanning; ambiguous foreign files and unowned artifacts are preserved and rejected, not overwritten or deleted.
- Migration publication uses staged artifacts and atomic no-clobber operations on supported platforms.
- Refile and archive use copy-first behavior and preserve recoverable duplicates after partial failure.
- The fixed default workspace is created only after an explicit user action. Automatic restart recovery never silently recreates a removed directory.

## Editor transition

| Surface | Editor | Status |
|---|---|---|
| Default `/` and `/org` workspace | CodeMirror 6 over raw Org text | Primary |
| Explicit `/history` archive | Read-only historical SQLite inspection | Immutable native legacy startup mode required |

The historical route and migration picker load only after immutable native startup authority authorizes `legacy`. Use `GRAIN_TAURI_LEGACY_MODE=1` for that explicit recovery launch; browser-only, invalid and failed mode lookups do not grant access. The main activity bar remains Org-only. `/legacy`, the desktop Lexical dependency and legacy body-writing UI paths have been removed; the standalone editor package is not a desktop dependency.

## Repository layout

```text
apps/desktop/                 Tauri desktop UI
apps/desktop/src/flows/       Business flows
apps/desktop/src/io/          Tauri/API/event boundaries
apps/desktop/src/pipes/org/   Pure Org text transformations
apps/desktop/src/views/       React views and containers
packages/rust-core/           Capability filesystem, database, and Tauri commands
packages/editor-codemirror/   CodeMirror editor package
packages/editor-lexical/      Standalone historical editor package; not used by desktop
```

## Development

### Requirements

- Bun 1.4.2 (pinned package manager and CI version)
- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` (CI: 24.21.0; verified locally with 26.10.0)
- Rust 1.94.0 or newer (verified with 1.94.1)
- Tauri 2 system prerequisites
- Linux: WebKitGTK 4.1 development packages

### Install

```bash
bun install --frozen-lockfile
```

Install JavaScript workspaces from the repository root. `bun.lock` is their only
lockfile; isolated linking keeps incompatible peer versions in separate workspaces.
The independent `experiments/doom-runtime` package retains its own npm lockfile.

### Run the desktop application

```bash
cd apps/desktop
bun run tauri dev
```

Vite listens on `http://localhost:1420` for the Tauri WebView during development. It is not a browser-based replacement for the desktop filesystem boundary.

From the repository root, `bun run dev` starts only the desktop Vite task; it does not start the historical Warp API. `bun run dev:all` explicitly opts into the wider monorepo development stack. Browser preview still has no native filesystem authority.

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

The file-authoritative Org path, migration artifacts and recovery SQL are implemented. A native drill against an authorized private historical snapshot verified one complete selected workspace graph, raw content rows and all six archived artifacts, including exact SQL recovery, application restart, fresh capability acquisition and rejection of the old grant. The desktop legacy editor/write cutover is complete. A separate fresh-profile native `GRAIN_TAURI_LEGACY_MODE=1` launch accepted the historical command, selected workspace metadata and rendered six graph rows and two raw-body containers without editing controls. Only numeric evidence was recorded; copied bytes, inode, size and mtime remained unchanged, with no SQLite sidecars.

Remaining historical acceptance boundaries:

1. The selected-workspace proof is not a full original-database backup or coverage of unrelated users/settings.
2. Windows ACL, file-identity and atomic publication equivalence remain unverified; unsupported native filesystem paths fail closed.

Completed recovery artifacts remain retained; inventory is not garbage collection or authority to replay a write.

No real historical database should be read or modified without explicit authorization.

## License

MIT — see [LICENSE](./LICENSE).
