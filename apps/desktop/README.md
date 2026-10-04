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
| `src/views/org-workspace/` | Ribbon shell, persisted navigation session, command palette, fuzzy Quick Open, file tree, agenda, inspector and dialogs |
| `src/views/org-editor/` | CodeMirror Org editor integration |
| `src/hooks/use-org-workspace.ts` | Runtime orchestration, conflict-aware autosave, dirty state and stale-request guards |
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

## Org editing keys

The editor keeps raw Org text intact while supporting an initial Org-compatible command set:

| Key | Action |
|---|---|
| `Tab` on a heading | Toggle subtree folding |
| `Shift-Tab` | Fold or unfold the document globally |
| `Alt-Left` / `Alt-Right` | Promote or demote a heading |
| `Alt-Up` / `Alt-Down` | Move a subtree |
| `Alt-Enter` | Insert a sibling heading or list item |
| `Enter` at the end of a list item | Continue the list; an empty item ends it |
| `Ctrl-C Ctrl-T` | Cycle heading TODO state |
| `Ctrl-C Ctrl-C` | Toggle a checkbox at the cursor |
| `Ctrl-C Ctrl-O` | Open the Org link at the cursor |
| `Ctrl-Shift-B` | Switch an already-open buffer (including unsaved/missing files) |
| `Ctrl-Shift-S` | Save all dirty buffers with per-file revision checks |
| `Ctrl-C Ctrl-Q` | Set heading tags in the bottom minibuffer |
| `Ctrl-C Ctrl-S` / `Ctrl-C Ctrl-D` | Schedule a heading or set its deadline in the bottom minibuffer |
| `Ctrl-C Ctrl-P` | Set a heading property in the bottom minibuffer |
| `Ctrl-C Ctrl-W` | Refile subtree using bottom target completion |
| `Ctrl-C Ctrl-X Ctrl-A` | Archive subtree with explicit yes/no confirmation |
| `Ctrl-C .` / `Ctrl-C !` | Insert an active or inactive timestamp |
| `Mod-S` | Save immediately |

Press `Ctrl-C` with no selection to start the Org prefix; after 350 ms, passive Which-Key help shows the next bindings without taking focus. `Ctrl-C Ctrl-X` opens the extra-command prefix. Prefixes wait by default rather than expiring while you read; Esc/C-g, application/editor blur, pointer navigation, composition or context navigation cancels them. Selected Ctrl-C still copies normally. Optional finite expiry is available through the editor's `prefixTimeoutMs` prop (null by default); this is not yet a user configuration system.

`Ctrl-P` / `Ctrl-K` now opens Execute command in the bottom minibuffer; `Ctrl-O` opens a nonmodal bottom Quick Open picker. Escape/C-g cancels. Quick Open cancellation aborts pending navigation without undoing any save already started. Workspace shortcuts defer to consumed editor chords, IME composition and active parameter input.

Heading Tags, Schedule, Deadline and Property use a non-modal bottom minibuffer: Enter accepts, Tab completes, C-n/C-p selects candidates, M-p/M-n browses per-command session history, and Esc/C-g cancels. Planning prompts prefill existing dates or today's date and validate real YYYY-MM-DD calendar dates; they are not full Org date readers. Edits commit as isolated CodeMirror undo transactions. Property uses KEY=VALUE, with existing properties as completion candidates. Refile and Archive also use bottom parameters: Refile completes workspace-relative Org files; Archive defaults to no and requires explicit yes. Both require saved source content, retain the existing copy-first verification flow, and cannot be canceled after transfer begins. A failed/uncertain transfer retires the prompt; reread both files before retrying. See [editor runtime design](../../docs/design/doom-editor-runtime.md).

Agenda now supports selected-row arrows/`n`/`p`, Enter to open, and repeat-safe **`t`** or **Cycle TODO** to act without leaving Agenda. Actions use an isolated canonical buffer transaction—not a direct file write. Live dirty sources override disk-derived rows; unopened sources are explicitly read and parked without editor activation. Complete grant/session/revision, runtime incarnation/generation and raw heading/timestamp anchors are required before acting. Missing legacy provenance remains display-only; stale or unresolved rows refuse edits. Dirty parked results are protected on close and saved by explicit Save All (inactive autosave remains off). Agenda focus and late navigation are scoped so asynchronous results do not steal later user navigation. Editor and Agenda planning share a bounded date reader: `YYYY-MM-DD`, `today`/`tomorrow`/`yesterday` (今天/明天/昨天), signed days/weeks such as `+3d`/`-2w`, and strictly-next weekdays such as `next mon`. Relative input resolves using accept-time local today, then only validated ISO reaches Root. Input history retains the user's expression. Clock errors and ambiguous planning casing fail closed; full calendar/time/range/repeater input remains future work.

Use **`s` / Schedule** and **`d` / Deadline** for bottom-minibuffer date editing, with existing field-date prefill, validation/history and no-change preservation. Preparation allocates no buffers; pending reads may be cancelled, while cancellation locks at the actual canonical commit boundary so committed edits are never reported as cancelled. Date reordering returns focus to the original heading/action. Full calendar/repeater UI, global tool host, repeat/reschedule logging and restart draft recovery remain unfinished.

Editor metadata/Refile and Agenda date parameters share a scoped session lifecycle reservoir: immutable snapshots, singleflight acceptance, owned prompt transitions, abortable reads and draining commit locks. Domain/lease/source guards and effects stay in their adapters/flows. Completion restores focus only from its original surviving host; preparation failures use separately guarded source focus. This is not yet the global command/tool registry.

Agenda commands run through an explicit effect flow and pure planner, with frozen intent capture, allocation-free preparation, scoped read/commit ownership and owner-checked cleanup; the workspace hook only adapts current snapshots and ports.

TODO timestamp logging is shared by Editor shortcuts and Agenda. Explicit state `!` / outgoing `/!` and file `#+STARTUP: logdone`, `nologdone`, `logdrawer`, `nologdrawer` control atomic state/CLOSED/log edits; no logging default is enabled. Existing CLOSED spacing/component shape and other planning remain intact. Logging declarations inherit through file properties, ancestors and the target heading. Empty values inherit; `nil` clears all logging; explicit state tokens and `LOGGING+` overlay only requested behavior. Safe `LOG_INTO_DRAWER` values inherit but log insertion is always target-local. Valid empty properties are accepted; malformed drawers or applicable unsupported logging policies refuse edits. Required `@` notes / final `lognotedone` open a workspace-owned, nonmodal multiline plain-text scratch; the source state stays unchanged until Finish. `C-c C-c` / Mod-S finish; `C-c C-k` / C-g explicitly abort. Confirmed state, CLOSED and literal note changes share one undo event. Drafts are protected before typing, retained and copyable when origin/lease/source becomes stale, and survive Editor/Agenda view changes. Read cancellation never hides an already committed result; native textarea undo/IME still require real-browser/native acceptance. Pending-to-pending transitions and overridden note settings do not falsely require notes. The local clock is injected into the pure planner; one undo restores all raw bytes.

Same-file Refile is available through the normal file → heading minibuffer: choose the exact current path, then a heading or file root. Dirty sources are supported unless saving/loading or unresolved. The move uses deletion/insertion source ranges in **one canonical transaction and undo event**, preserving unrelated peer selections/folds and raw separators; no filesystem transfer is started. Normal autosave/manual save later uses the existing baseline revision. Self/descendant targets, stale snapshots, aliases, hidden source/target, and unclosed drawers/blocks are rejected. Cross-file Refile and Archive still require saved sources and retain copy-first/dual-path reconciliation protection.

Body Sparse Tree is available through Execute command, Note actions, or **C-c /**. Enter `todo`, `todo:STATE`, `tag:NAME`, or `text:LITERAL`; completion derives declared states and local tags from eligible source. Matching headings, their own body sections and ancestor paths remain visible; unrelated body sections are hidden in the originating window only. Clear sparse tree restores visibility without rewriting raw Org or adding canonical undo history. Hidden-source edits and selection-reveal bypasses are rejected even with `filter:false`; visible edits remain usable, with canonical peer/history changes safely reprojected. Text matches heading titles case-sensitively. `tag:NAME` stays local; `itag:NAME` explicitly includes eligible file, ancestor and own tags. Compose with `match: todo AND (itag:work OR tag:urgent) AND NOT todo:DONE`, using NOT > AND > OR, parentheses and quoted `text:"literal"`. Legacy `text:LITERAL` retains its entire literal tail. Invalid queries preserve the prior view; limits are 8192 UTF-16 units, depth 32 and 128 nodes. Full Org query grammar remains future work. No match keeps the document visible.

Runtime feasibility probes live separately in [experiments/doom-runtime](../../experiments/doom-runtime/README.md). They exercise Vim and canonical buffer/window ownership with synthetic data; they do not enable Vim or split windows in the application.

The application now retains independent in-memory Org buffers: switching A → B → A does not force a save and preserves each source, revision, CodeMirror history, cursor and scroll. Tabs show inactive unsaved state too. Closing a dirty inactive tab uses revision-checked save; failure retains the buffer. Main-file editors now use one canonical CodeMirror buffer/history runtime with history-free window projections. **Split editor** initially duplicates the current buffer, then navigation changes only the focused window, so A/B can remain visible together. Focus handoff for open memory buffers is synchronous and preserves canonical history; selections, folds and scroll stay window-local. Same-buffer projections share text/undo, while different buffers retain independent histories. Closing the split does not close its buffer; closing a focused buffer preserves a surviving peer. Window leases guard both active and parked edits, and undo authority belongs to the caller rather than the restored selection's window. Native IO, revision baselines and dirty/uncertain guards remain in the controller. Cross-buffer focus is explicitly deferred/read-only while a save owns the current context; copy/navigation remain available, and toolbar commands resolve the pending origin after busy clears. Capture scratch editors still use their local engine. Detached/native windows and real native IME acceptance remain unimplemented/unverified.

Refile now uses two bottom parameter steps: choose a relative Org file, then `(file root)` or a block-aware, outline/line-qualified heading. Target lookup is cancellable and read-only; final acceptance binds its revision and exact heading source offset. Insertion adjusts only legitimate heading stars, preserving other raw bytes. Copy confirmation precedes source removal. Uncertain/partial transfers protect both paths against a new command or autosave until explicit reconciliation; held Enter cannot cross the two acceptance steps. Same-file refile and full Org target configuration remain pending.

Capture now selects a literal `todo` or `note` template in the bottom minibuffer, then opens a nonmodal multiline scratch Org tool window. `C-c C-c`/Mod-S finish, `C-c C-k`/C-g abort before writing. Typed drafts participate in live native close/navigation protection, but remain memory-only. Revision-checked writes return confirmed/rejected/uncertain outcomes; an uncertain result retains a readonly, copyable draft and disables retry (dismissal does not roll back files). Successful capture returns to the originating buffer/caret, including safe cached append projection. Templates are not yet user-configurable and have no evaluation/interpolation; journal recovery and real IME acceptance remain separate gates.

The active buffer alone autosaves; inactive dirty buffers do not autosave yet. Switch Buffer and Save All are available from Execute command or Ctrl-Shift-B/Ctrl-Shift-S (Meta equivalents on macOS). Save All snapshots bodies/revisions, saves sequentially without navigating, advances confirmed baselines and preserves newer input. Failure stops the batch without rollback; affected autosave is latched off even after typing until an explicit successful save/reconciliation. Ordinary and batch saves do not disable editor typing/composition, unlike loading/transfers. Native close and workspace replacement protect aggregate dirty state. This is memory-only, not a restart recovery journal or a detached/native-window implementation.

Workspace approvals issue native capability leases. Every Org filesystem/index invocation must carry the originating token; stale grants cannot acquire a later same-path directory. Same-path reapproval retains the original descriptor and rejects inode replacement. Releases remove only their exact grant. Linux watches are descriptor-bound; other platforms currently fail closed for watching and retain active-document polling/manual workspace refresh.

`#+TODO` and `#+SEQ_TODO` workflows are honored when cycling TODO states. The Outline inspector provides a heading-filtered sparse-tree view. Grain still does not attempt complete GNU Emacs keymap emulation.

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

## SQLite startup modes

Normal Tauri startup opens `grain-org-index.db`, not the historical `grain.db`. The Org index
commands continue to use the managed SeaORM connection, but canonical document bodies remain in
`.org` files. The shared schema currently also creates empty compatibility/support tables in this
separate database; their presence does not authorize reading or migrating a historical database.

Access to `grain.db` is process-level opt-in for deliberate legacy recovery work:

```bash
GRAIN_TAURI_LEGACY_MODE=1 bun run tauri dev
```

Legacy mode opens the historical database read/write and schema initialization may mutate it. Use
it only against an authorized backup/copy. Merely having `grain.db` in the data directory never
enables this mode, and `GRAIN_DB_FILENAME` configures the API server but does not override the
Tauri safety default. Restart without the variable to return to normal Org mode.

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
