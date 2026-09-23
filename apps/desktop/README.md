# Grain Desktop

Grain Desktop is the Tauri application for the local-first Org-mode workspace described in the [repository README](../../README.md).

## Product boundary

The default routes, `/` and `/org`, operate on real `.org` files through capability-scoped Tauri commands. `/legacy` is a lazy-loaded compatibility route for migration from the former SQLite/Lexical document model.

```text
React view
  → hook/controller
  → flow
  → pure Org pipe or IO repository
  → Tauri command
  → retained Rust directory capability
  → .org file
```

Org text must not be serialized through Lexical JSON. Parsers and UI decorations may interpret text, but ordinary saves preserve the editor's raw string.

## Main modules

| Path | Responsibility |
|---|---|
| `src/views/org-workspace/` | Workspace shell, file tree, dialogs, agenda and backlinks |
| `src/views/org-editor/` | CodeMirror Org editor integration |
| `src/hooks/use-org-workspace.ts` | Runtime orchestration, dirty state and stale-request guards |
| `src/flows/org-workspace/` | Explicit business flows |
| `src/pipes/org/` | Pure Org parsing and local text transformations |
| `src/pipes/migration/` | Legacy migration planning and recovery SQL |
| `src/io/file/org-file.repository.ts` | Typed Tauri filesystem boundary |
| `src/io/event/` | Workspace invalidation and diary requests |
| `src/routes/legacy.lazy.tsx` | Lazy legacy SQLite/Lexical surface |
| `src-tauri/` | Desktop shell using `packages/rust-core` |

The security-critical Rust implementation is in:

- `packages/rust-core/src/org_filesystem.rs`
- `packages/rust-core/src/tauri/commands/org_document_commands.rs`
- `packages/rust-core/src/tauri/commands/org_index_commands.rs`
- `packages/rust-core/src/tauri/commands/legacy_migration_commands.rs`

## Development

From the repository root:

```bash
bun install
cd apps/desktop
bun run tauri dev
```

Useful commands:

```bash
bun run type:check       # TypeScript without emit
bun run test             # Complete Vitest suite
bun run build            # TypeScript + production Vite bundle
bun run tauri build      # Native installer build
bunx biome check src     # Scoped formatting/lint check
```

The Vite development URL (`http://localhost:1420`) exists for the Tauri WebView. Local Org filesystem functionality requires the desktop runtime.

## Focused Org verification

```bash
bunx vitest run \
  src/hooks/use-org-workspace.test.ts \
  src/io/file/org-file.repository.test.ts \
  src/flows/org-workspace/org-workspace.flow.test.ts \
  src/pipes/org/org-text.pipe.test.ts \
  src/views/org-workspace/org-action-dialog.view.fn.test.tsx

cargo test --manifest-path ../../packages/rust-core/Cargo.toml --offline --lib
```

The complete desktop suite still contains stale contracts for legacy-only Story, search, and file-tree components. Do not interpret those failures as permission to weaken the focused Org filesystem tests.

## Default workspace

The welcome screen offers:

- **Open Documents/Grain** — explicitly creates or opens the fixed default directory.
- **Choose another…** — opens the native directory picker.

After the user chooses the default workspace, a non-authoritative UI preference permits restart recovery. Recovery only opens an already-existing fixed directory; it does not recreate a directory removed by the user. Arbitrary previously selected paths are not reopened through ambient authority.

## File mutation rules

1. Workspace paths must come from a retained approved capability.
2. Document paths must be normalized relative `.org` paths.
3. Ordinary writes, moves, and deletes require an expected revision.
4. UI events are invalidation hints, not trusted filesystem state.
5. Async reads must not replace dirty buffers or newer requests.
6. Refile and archive copy first, verify the destination, and only then remove the source.
7. Migration must publish into a new top-level directory and must never merge into existing output.
8. SQLite Org indexes must remain foreign-key-free, disposable, and rebuildable.

## Editor transition

CodeMirror is the primary editor and operates on raw Org text. Lexical remains installed only because the explicit legacy route must read historical documents until migration recovery has been validated against an authorized database copy.

Do not add new Lexical-based document features. New writing functionality belongs in the Org workspace.

## Known release gates

- Real historical database-copy migration and destructive recovery acceptance
- Read-only legacy mode followed by removal of legacy body writes
- Removal of remaining Lexical dependencies
- Windows-equivalent ACL, identity and atomic no-clobber guarantees
- Cleanup of stale legacy UI tests

## Packaging

Tauri configuration is in `src-tauri/tauri.conf.json`. Platform prerequisites follow the [Tauri 2 documentation](https://v2.tauri.app/start/prerequisites/). On Linux, development requires WebKitGTK 4.1 libraries.
