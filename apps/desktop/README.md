# Grain Desktop

Grain Desktop is the Tauri application for the local-first Org-mode workspace described in the [repository README](../../README.md).

## Product boundary

The default routes, `/` and `/org`, operate on real `.org` files through capability-scoped Tauri commands. `/history` is the lazy read-only historical archive, accessible only after immutable native startup authority reports `legacy`; browser-only, invalid and failed mode lookups do not authorize it. Explicit recovery launches use `GRAIN_TAURI_LEGACY_MODE=1`. `/legacy` and the desktop Lexical/write providers are removed.

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

An open canonical buffer owns working source and shared history; editor windows only project it. The confirmed disk revision is a separate save baseline. Queries use live source before disk, including parked or failed-save edits, with exact grant/session/incarnation/generation provenance. They never activate a buffer or write source.

## Main modules

| Path | Responsibility |
|---|---|
| `src/views/org-workspace/` | Ribbon shell, persisted navigation session, command palette, fuzzy Quick Open, file tree, agenda, inspector and dialogs |
| `src/views/org-editor/` | CodeMirror Org editor integration |
| `src/hooks/use-org-workspace.ts` | Session/effect adapters, conflict-aware autosave and native IO orchestration |
| `src/flows/org-workspace/` | Explicit business flows |
| `src/flows/org-editor-runtime/` | Canonical buffer/history and workspace session/effect ownership |
| `src/flows/org-command/org-workspace-command.ts` | Shared existing-command catalog, applicability, shortcuts, prefixes and parameter factories |
| `src/hooks/org-query-sources.ts` | Authoritative live/disk query snapshots |
| `src/pipes/org/` | Pure Org parsing and local text transformations |
| `src/pipes/migration/` | Legacy migration planning and recovery SQL |
| `src/io/file/org-file.repository.ts` | Typed Tauri filesystem boundary |
| `src/io/event/` | Workspace invalidation and diary requests |
| `src/routes/history.lazy.tsx` | Startup-gated, read-only historical SQLite archive |
| `src-tauri/` | Desktop shell using `packages/rust-core` |

The security-critical Rust implementation is in:

- `packages/rust-core/src/org_filesystem.rs`
- `packages/rust-core/src/org_document_write.rs`
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

Press `Ctrl-C` with no selection to start the Org prefix; after 350 ms, passive Which-Key help shows the next bindings without taking focus. `Ctrl-C Ctrl-X` opens the extra-command prefix. Prefixes wait by default rather than expiring while you read; Esc/C-g, blur, pointer navigation, composition or context navigation cancels them. Selected Ctrl-C still copies normally. **Settings → Editor → Org keymaps** accepts validated version-1 scoped bindings and transient maps with optional timeouts; blank configuration retains the existing defaults.

`Alt-X` / `Ctrl-P` / `Ctrl-K` opens Execute command in the shared application minibuffer; `Ctrl-O` opens nonmodal Quick Open. Escape/C-g cancels and aborts unaccepted asynchronous reads/navigation; accepted effects drain. M-x, header actions, editor keys, Note actions, Which-Key and native-child commands use one captured application command registry and unified result/echo path. Captures retain their actual Source/window rather than whichever Main buffer becomes active later. Workspace shortcuts defer to consumed editor chords, IME composition and active parameter input.

Heading Tags, Schedule, Deadline and Property use a non-modal bottom minibuffer: Enter accepts, Tab completes, C-n/C-p selects candidates, M-p/M-n browses per-command session history, and Esc/C-g cancels. Planning prompts prefill existing dates or today's date and validate real YYYY-MM-DD calendar dates; they are not full Org date readers. Edits commit as isolated CodeMirror undo transactions. Property uses KEY=VALUE, with existing properties as completion candidates. Cross-file Refile and Archive require saved source content, retain copy-first verification, and cannot be canceled after transfer begins. Same-file Refile supports dirty buffers as described below. A failed/uncertain transfer retires the prompt; reread both files before retrying. See [editor runtime design](../../docs/design/doom-editor-runtime.md).

Agenda now supports selected-row arrows/`n`/`p`, Enter to open, and repeat-safe **`t`** or **Cycle TODO** to act without leaving Agenda. Actions use an isolated canonical buffer transaction—not a direct file write. Live dirty sources override disk-derived rows; unopened sources are explicitly read and parked without editor activation. Complete grant/session/revision, runtime incarnation/generation and raw heading/timestamp anchors are required before acting. Missing legacy provenance remains display-only; stale or unresolved rows refuse edits. Dirty parked results are protected on close, eligible for independent quiet-input autosave, and saved by explicit Save All. Agenda focus and late navigation are scoped so asynchronous results do not steal later user navigation. Editor and Agenda planning share a bounded date reader: `YYYY-MM-DD`, `today`/`tomorrow`/`yesterday` (今天/明天/昨天), signed days/weeks such as `+3d`/`-2w`, and strictly-next weekdays such as `next mon`. Relative input resolves using accept-time local today, then only validated ISO reaches Root. Input history retains the user's expression. Clock errors and ambiguous planning casing fail closed; full calendar/time/range/repeater input remains future work.

Use **`s` / Schedule** and **`d` / Deadline** for bottom-minibuffer date editing, with existing field-date prefill, validation/history and no-change preservation. Preparation allocates no buffers; pending reads may be cancelled, while cancellation locks at the actual canonical commit boundary so committed edits are never reported as cancelled. Date reordering returns focus to the original heading/action. The shared application tool host is implemented; complete calendar/repeater behavior, repeat/reschedule logging and general unsaved-buffer restart recovery remain release gates.

Editor metadata/Refile and Agenda date parameters share a scoped session lifecycle reservoir: immutable snapshots, singleflight acceptance, owned prompt transitions, abortable reads and draining commit locks. Domain/lease/source guards and effects stay in their adapters/flows. Completion restores focus only from its original surviving host. Source subscriptions retire even React-batched edit/undo ABA prompts; revision-only save ACKs retain unchanged input. Cancellation restores full selection and both scroll axes without history. Shared application command, parameter and tool registries preserve independent tool origins and dirty/pending close protocols; trusted compiled extensions use revocable owned registrations, not arbitrary runtime TypeScript or a sandbox.

The application retains a compiled tool's original portal/frame/body when its producer unmounts: new commands, reads and effects are revoked, accepted work drains, and dirty/readonly output remains until explicit close. Integration tests exercise real CodeMirror bodies, StrictMode replay, declined close and late receipts. Actual native readonly export output keeps its literal CRLF/NUL/astral text and bounded Ctrl-A selection; declining close restores that selection after the modal. Native producer-unmount acceptance is separate from this live-producer close proof. Plain system text clipboards can truncate NUL: Copy refuses that lossy form and offers explicit UTF-8 hex bytes; a native clipboard round trip recovered the exact original bytes.

Agenda commands run through an explicit effect flow and pure planner, with frozen intent capture, allocation-free preparation, scoped read/commit ownership and owner-checked cleanup; the workspace hook only adapts current snapshots and ports.

TODO timestamp logging is shared by Editor shortcuts and Agenda. Explicit state `!` / outgoing `/!` and file `#+STARTUP: logdone`, `nologdone`, `logdrawer`, `nologdrawer` control atomic state/CLOSED/log edits; no logging default is enabled. Existing CLOSED spacing/component shape and other planning remain intact. Logging declarations inherit through file properties, ancestors and the target heading. Empty values inherit; `nil` clears all logging; explicit state tokens and `LOGGING+` overlay only requested behavior. Safe `LOG_INTO_DRAWER` values inherit but log insertion is always target-local. Valid empty properties are accepted; malformed drawers or applicable unsupported logging policies refuse edits. Required `@` notes / final `lognotedone` open a workspace-owned, nonmodal multiline plain-text scratch; the source state stays unchanged until Finish. `C-c C-c` / Mod-S finish; `C-c C-k` / C-g explicitly abort. Confirmed state, CLOSED and literal note changes share one undo event. Drafts are protected before typing, retained and copyable when origin/lease/source becomes stale, and survive Editor/Agenda view changes. Read cancellation never hides an already committed result; native textarea undo/IME still require real-browser/native acceptance. Pending-to-pending transitions and overridden note settings do not falsely require notes. The local clock is injected into the pure planner; one undo restores all raw bytes.

Same-file Refile is available through the normal file → heading minibuffer: choose the exact current path, then a heading or file root. Dirty sources are supported unless saving/loading or unresolved. The move uses deletion/insertion source ranges in **one canonical transaction and undo event**, preserving unrelated peer selections/folds and raw separators; no filesystem transfer is started. Normal autosave/manual save later uses the existing baseline revision. Self/descendant targets, stale snapshots, aliases, hidden source/target, and unclosed drawers/blocks are rejected. Cross-file Refile and Archive still require saved sources and retain copy-first/dual-path reconciliation protection.

Body Sparse Tree is available through Execute command, Note actions, or **C-c /**. Enter `todo`, `todo:STATE`, `tag:NAME`, or `text:LITERAL`; completion derives declared states and local tags from eligible source. Matching headings, their own body sections and ancestor paths remain visible; unrelated body sections are hidden in the originating window only. Clear sparse tree restores visibility without rewriting raw Org or adding canonical undo history. Hidden-source edits and selection-reveal bypasses are rejected even with `filter:false`; visible edits remain usable, with canonical peer/history changes safely reprojected. Text matches heading titles case-sensitively. `tag:NAME` stays local; `itag:NAME` explicitly includes eligible file, ancestor and own tags. Compose with `match: todo AND (itag:work OR tag:urgent) AND NOT todo:DONE`, using NOT > AND > OR, parentheses and quoted `text:"literal"`. Legacy `text:LITERAL` retains its entire literal tail. Invalid queries preserve the prior view; limits are 8192 UTF-16 units, depth 32 and 128 nodes. Full Org query grammar remains future work. No match keeps the document visible.

Vim is a production opt-in through Org keymaps JSON: `{"version":1,"modalEngine":"vim"}`; blank configuration leaves modal editing disabled. The owned upstream adapter uses canonical buffer history and the shared minibuffer instead of a second editor/body writer. Actual Linux WebKitGTK **focused XTest** input has exercised `dw`, dot/count, named registers, macros, text objects, visual/block deletion, one-session insert Undo and whole-astral deletion. These keyboard commands omit `--window` and verify the owned native window plus Source focus; earlier targeted `xdotool --window` evidence was XSendEvent, not XTest. Actual Fcitx5 Rime displayed native preedit/candidates without changing Source, committed `哦` in Vim insert mode, and one canonical Undo restored exact Source; cancellation added no Source input and correctly left Vim in insert mode. GTK/XIM still marks first ASCII keys `repeat=true`; repeated modal keys remain usable while held configured command shortcuts cannot repeat their producer. Native Undo publication must be awaited, not inferred from the key command's exit. Broader workflows/platforms remain separate acceptance gates. [Runtime experiments](../../experiments/doom-runtime/README.md) are synthetic feasibility evidence, not production acceptance.

The application retains independent in-memory Org buffers: switching A → B → A does not force a save and preserves source, revision, canonical history, selection and viewport. **Split editor** initially duplicates the current buffer; navigation changes only the focused window, so A/B can remain visible together. Same-buffer projections share text/undo while selections, folds, effects and scroll stay window-local. **Detach** opens a real native view of the same canonical buffer; **Attach** and **Close view** are separate from closing its buffer. Native bindings fence grants, incarnations, proposal order and acknowledged canonical revisions; unknown effects are refused. Actual Linux/X11 two-webview acceptance includes independent A/B native save receipts, newer input while an earlier receipt waits, shared exact multi-range Undo/Redo, child rebind, window-only Attach/Close and child-local folds. The overlap holds an unmodified real receipt after native publication; it does not prove parallel native disk IO. Codec/ABA negatives are regression evidence, not credential-replay or cross-platform native proof. Broader acceptance remains tracked in [editor runtime design](../../docs/design/doom-editor-runtime.md).

Window viewport capture runs before DOM removal, including StrictMode replay; an untouched pending restoration cannot overwrite its cached bookmark with zero offsets. Newer wheel, pointer, keyboard or reveal intent cancels restoration. Real browser A → B → A and Capture finish/cancel preserve a nonzero viewport independently of the peer window.

Refile uses file → heading → raw-range preview/yes-no confirmation. Target lookup is cancellable and read-only; final acceptance binds disk revision, exact heading offset and source lifetime. **Settings → Editor → Org behavior** configures Refile targets. An explicit configured file allowlist refuses a missing target before preview/confirmation/effects; the default typed-new-file and Archive conventions are unchanged. Insertion adjusts only legitimate heading stars, preserving other raw bytes. Cross-file copy confirmation precedes source removal; partial/uncertain transfers protect both paths without destructive rollback. **Review / reconcile file** opens exact retained/disk Source snapshots: cancellation changes neither body nor baseline; adopting different disk Source requires discard consent and a fresh canonical history incarnation, while keeping Source accepts only the reviewed baseline and requires a later explicit CAS Save. Each path is reconciled separately; settling the source cannot authorize or clear the target. Acceptance rereads disk; unchanged background mismatch observations do not revoke a review, but new uncertain mutations, manual target drift and stale source/window/grant lifetimes do.

Capture configuration is declarative JSON in **Settings → Editor → Org Capture**: `version: 1`, `templates`, and explicit `draftRecovery`. Blank configuration retains the built-in TODO/note inbox templates; malformed nonblank configuration reports errors without silently using defaults. Templates declare `id`, `label`, `entryType` (`entry`, `plain`, `item`, `checkitem`, `table-line`), an approved relative `.org` file/heading/datetree target, and literal `source`. Heading targets require an exact unambiguous heading path; datetrees freeze the local Capture date and create only missing date headings at Finish. File/heading list and table captures use the first eligible body container, not a child heading's container.

The bottom minibuffer selects a template and accepts sequential `%^{prompt|default|candidates}` answers. Expansion supports `%?`, `%t/%T/%u/%U`, bounded `%<FORMAT>`, `%i`, `%a/%l/%L`, `%f/%F`, `%%`, and numbered prompt references. Time and exact Source context freeze before prompts; inserted answers/regions remain literal and are never rescanned or evaluated. `%i` preserves the contiguous raw selection and line endings; discontiguous selections are rejected only for templates requesting `%i`. Unsupported escapes, executable forms, functions and external includes are errors. The nonmodal multiline scratch tool opens at the first `%?` caret. `C-c C-c`/Mod-S finish, `C-c C-k`/C-g abort before writing; empty structurally valid drafts remain editable but meaningful content is required to finish.

Target preview is read-only. Finish rechecks scope, source and target revision, then performs one captured revision-checked content write through the existing workspace owner. Preview/stale-target rejection makes no content write and keeps the draft editable. An uncertain publication retains a readonly, copyable draft and disables retry; dismissal or journal deletion does not roll back files. Finish/cancellation restore the exact surviving Editor or Agenda origin and Source selection/focus without adding Source history.

Capture drafts are memory-only by default. Explicit `draftRecovery: true` stores plaintext scratch metadata/body in this webview's local storage, scoped to the approved root—not a capability token, writer, filesystem baseline or automatic replay authority. Reopening acquires a fresh grant; **Resume saved Capture draft** or readonly viewing is explicit. Frozen target/time/body survive restart; Finish still previews/rechecks the real file. Publication checkpoints cannot be downgraded from publishing/uncertain to editable. Storage/quota failures preserve the draft and refuse publication before native writing. Turning recovery off requires an application dialog before deleting saved Capture metadata; cancellation preserves permission and saved drafts. Ordinary unsaved-buffer restart recovery remains separate. Genuine native Rime preedit/commit/cancel and exact canonical Undo have been exercised; broader IME routes/platforms are not implied.

Every dirty Org buffer has an independent quiet-input autosave deadline controlled by **Settings → General → Auto save / interval**. Disabling clears unaccepted queues; accepted native work drains. Invalid/nonfinite intervals do not schedule writes, including corrupt numeric-looking stored strings; editing B does not postpone quiet A. Frontend file-effect owners reserve affected paths, so disjoint files can proceed independently while workspace-wide effects remain barriers. Native Rust filesystem mutations still share a process-global lock; this is not parallel native disk publication. Captured saves advance only their confirmed baseline and retain newer Source/history. Failed automatic saving pauses that path; typing or restored permissions do not silently retry it. Switch Buffer and Save All are available from Execute command or Ctrl-Shift-B/Ctrl-Shift-S (Meta equivalents on macOS). Save All snapshots bodies/revisions, saves sequentially without navigation and stops on failure without rollback. This is memory-only, not general unsaved-buffer restart recovery.

Workspace source/baseline/lifetime and effect ownership publish immutable snapshots; React subscribes and sends intents instead of holding a second body authority. Save ACKs, confirmed target installations and explicit per-file reconciliation use central session rules. Native close, workspace switching, dirty deletion and destructive tools use abortable application confirmation, not `window.confirm`. Pending effects and aggregate dirty/unresolved state block destructive close; **Keep editing** preserves surviving Source/scratch focus and exact selection. **Discard and close** remains bound to its captured current state.


Workspace approvals issue native capability leases. Every Org filesystem/index invocation must carry the originating token; stale grants cannot acquire a later same-path directory. Same-path reapproval retains the original descriptor and rejects inode replacement. Releases remove only their exact grant. Linux watches are descriptor-bound; other platforms currently fail closed for watching and retain active-document polling/manual workspace refresh.

Ordinary Linux saves prove descriptor-source publication support before capture and retain a durable identity-bound journal. Approved reopening recovers before scan: unpublished old files restore; confirmed publication is retained. Foreign inodes and unowned artifacts are preserved and rejected. The old pathname has an observable capture gap: this is not no-gap atomic replacement or unsaved-buffer restart recovery. Darwin ordinary Save/Delete and other unsupported publication platforms refuse before preparation/capture; no named-source fallback is used. Linux process-interruption smoke covers both publication sides, not power loss or other-platform parity.

Confirmed overwrites preserve their original inode and journal in `.grain-original-*.tmp`; confirmed deletes move the original into `.grain-deleted-*.tmp` rather than permanently unlinking it. Native receipts and workspace scans expose recovery paths. Already-open external fds can still mutate these originals: they are live recovery files, not immutable backups, and are not automatically replayed or garbage-collected. Retention consumes disk until explicit external cleanup. Real Linux native smoke verified writes through the original fd after save/delete ACK remain byte-exact at a named recovery path with `nlink=1`; this does not establish strict in-place-write atomic CAS or other-platform parity.

All recognized stage, original, journal and publication-probe objects remain named; there is no automatic transaction garbage collection. New journals use v3; genuine active v1/v2 provenance remains readable. A real Linux bg166 v1 interrupted-recovery smoke retained all three original/staged/journal objects and `nlink=1` on an already-open stage descriptor. Late non-UTF8/NUL writes through that same descriptor remained discoverable by inode, while scoped native reads kept the exact restored original. Two same-process reopens retained names and did not replay the stage. This does not qualify v2/v3 probes, OS-process restart, crash/fsync injection or strict concurrent in-place-write CAS.

The opt-in Capture scratch journal above is separate from the native filesystem publication journal: it restores only an explicitly selected scratch draft and never writes an Org file by itself.

`#+TODO` and `#+SEQ_TODO` workflows are honored when cycling TODO states. The Outline inspector provides a heading-filtered sparse-tree view. Grain still does not attempt complete GNU Emacs keymap emulation.

## Development

From the repository root:

```bash
bun install --frozen-lockfile
cd apps/desktop
bun run tauri dev
```

Use Bun 1.4.2 and the root lockfile; do not install a separate desktop dependency
tree. Node must satisfy `^22.22.2 || ^24.15.0 || >=26.0.0`. The toolchain uses
TypeScript 6, Vite 8 and Vitest 5. Desktop declares ES2024 libraries while retaining
its ES2020 TypeScript target. Mermaid 12 diagrams additionally require native
ES2024 browser APIs; Safari 17.4 or newer is required for that renderer.
Legacy Lexical 0.52 styles use the explicit `@grain/editor-lexical/styles.css`
asset export. Both desktop and Monaco layouts use panels 4 percentage strings
and panel-ID layout records, not panels 3 array positions.

Useful commands:

```bash
bun run type:check       # TypeScript without emit
bun run test             # Complete Vitest suite
bun run build            # TypeScript + production Vite bundle
bun run tauri build      # Native installer build
bunx biome check src     # Scoped formatting/lint check
```

The Vite development URL (`http://localhost:1420`) exists for the Tauri WebView. Local Org filesystem functionality requires the desktop runtime.

Root `bun run dev` starts only desktop Vite, without the historical Warp API. Use `bun run dev:all` only for the full development stack; neither browser command grants native filesystem authority.

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

The current full desktop regression run passed 195 files / 4,267 tests. Obsolete desktop legacy-only contracts were removed with their retired callers; this does not weaken the Org filesystem or selected-workspace recovery boundaries.

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

Legacy mode is a read-only historical source, not the old editing runtime. It opens
only an existing standard plaintext SQLite database: no creation, schema initialization,
key PRAGMA, journal-mode change or historical CRUD. WAL/SHM/journal sidecars and unsupported
filesystem/locking conditions fail closed. Use an authorized isolated copy; normal Org mode
never opens historical `grain.db`. Both modes reject historical body writers and ambient
`save_file`/`ensure_directory_and_save` commands. `GRAIN_DB_FILENAME` configures the API server,
not this Tauri boundary. Restart without the variable to return to normal Org mode.

## Editor transition

CodeMirror is the primary editor and raw Org files are the body authority. The historical route
provides startup-gated read-only inspection and migration. The desktop `/legacy` route, Lexical
dependency and legacy editing providers are removed; the standalone editor package is not a desktop dependency.

Do not add new Lexical-based document features. New writing functionality belongs in the Org workspace.

## Known release gates

- Windows-equivalent ACL, identity and atomic no-clobber guarantees

## Current native evidence

An authorized fresh isolated historical copy completed the actual native migration UI,
verification and recovery drill. Version-2 recovery restored one workspace, six nodes and
two raw content rows into an initially empty standalone SQLite database, with every selected
tuple, nullable field, integer and content type equal. Native restart issued a different
grant, rejected the old grant, recovered the exact bundle and verified six artifacts with
zero mismatches. The original database was never opened by SQLite; pinned read-only descriptor
hash, identity, size and mtime stayed unchanged, and no sidecars appeared. This is selected
workspace recovery, not a backup of users, settings or the entire historical database.

A separate fresh-profile native `GRAIN_TAURI_LEGACY_MODE=1` launch accepted the public
historical command, selected actual workspace metadata and rendered six graph rows and
two raw-body containers. The `/history` main had zero editable controls, forms,
non-selection buttons or alerts. SDK ingress descriptors remained non-writable.
Only numeric evidence was recorded; the authorized copied source retained exact hash,
inode, size and mtime, without WAL/SHM/journal sidecars. The original was not opened by this runtime.

The earlier owned 2 MB/12,000-heading/20-additional-buffer XTest scenario improved from
3,274/5,868 ms to approximately 233/300 ms median/p95 keydown-to-second-rAF. That is
historical evidence, not the current 9811-heading fixture or hardware-to-paint/heap
acceptance. The stale shared `NORMAL` status and input-provider retirement repair
has since passed integrated regressions and actual native Vim/IME consumer checks.

At that earlier milestone frontend regressions passed 191 desktop files / 4,157 tests
and core `--lib` passed 297 tests with four ignored. The final eight-lane run below
supersedes those counts; ignored documentation examples were not rerun.
Actual GTK regressions passed literal percent/Unicode preservation and complete
long-disclosure layout. Native block, inline source, `#+CALL` and table workflows
each accepted a bounded, complete one-run consent, returned a real exit-zero
receipt, and required explicit Apply; one native Undo restored exact Source.
Settings also exercised invalid-keymap diagnostics and a persisted Source binding,
then restored the test profile. TypeScript, Vite and the embedded Tauri debug build
passed. Full A–F acceptance, all native child lifetimes, workflow priorities and
cross-platform publication remain open.

Current native recovery also exercised exact-path no-write Refile collision, a real
copy-first/source-permission partial failure, separate authorized missing-path review,
occupied-path refusal, retained-Source create-CAS and preserved canonical Undo/Redo.
The workspace folder picker now uses an owned blocking worker: the synchronous
command had deadlocked GTK's main thread. Actual rebuilt selection and cancellation
preserved the existing capability and Source boundaries. Retained review output
refuses NUL plain copy and exposes exact read-only UTF-8 hex; OS clipboard round-trip
was not established under the current automation. A separate real canonical-runtime
extension smoke passed lifecycle/ownership checks without pretending trusted
TypeScript is sandboxed. See the runtime design document for bounded evidence.

Native execution now serializes the final enabled check and actual spawn against
disable. A real production-registry child reproduced the old race; after the fix,
completed disable refused stale preflight without process, receipt or outputs.
Accepted children still drain; disabling is not cancellation. Save/delete/recovery
now distinguish unresolved retention from identity-witnessed terminal resolution,
so an observed post-retention rejection stays protected across reopen. The real-FS
regression failed before the fix and passed in the current core run. This does not
retroactively classify ambiguous legacy terminal directories or exclude later
held-descriptor writes and physical storage failure.

All five configured workflow values survived an actual native process restart.
An actual XDamage/XGetImage Source-glyph probe measured one small-file X-server
input-request-to-drawable-readback upper bound of 91.323 ms, with exact input and
Undo. It is not hardware-to-scanout, a percentile or full performance acceptance.
Actual literal native consent now proves denial, stale approval after disable and
accepted-child drain; Run does not edit Source. Real GTK/Rime main and independently
hosted native Source also prove trusted preedit priority, atomic committed Undo/Redo,
history-neutral cancellation, exact selection/focus, and child-only close retaining
accepted Source. These are not full Vim dot/macro, fresh Babel Apply, held-FD/restart,
continuous Org or cross-platform acceptance. See the design document for evidence.

Default compiled bottom producers now share a bounded dock. Two actual native Babel
tools, including an expanded full disclosure, kept Source visible and both physically
edited controls reachable above the footer; returning Source retained exact body and
selection. Native migration also reproduced foreign-temp deletion and same-inode
false hash ACK on the original binary. The source safety repair passed 317 core tests
with four ignored. The final eight-lane acceptance below supplies actual Linux
race-after and IME repeat/macro proof; non-Linux execution remains a separate gate.

## Eight-lane integrated acceptance (2026-10-12)

All eight concurrent development lanes landed under one integration owner:
configuration/Capture, Diary/Roam/Remark, Refile, Agenda, Clock/table/Sparse Tree,
Export/Babel, Vim/IME and runtime performance. Current verification passed
**195 desktop files / 4,267 tests**, TypeScript/Vite and embedded Tauri debug build.
Filesystem changes passed **317 core tests / 4 ignored**.
Final native executable SHA-256:
`8f12823f91c6b64fc71fb366665c1589a04a4828a75d5d59a045c2d490720baf`.

Actual Linux GTK/Rime/XTest exercised configured Capture/Refile, chronological
Diary/Roam/ID links/backlinks, native Remark, Agenda planning/TODO/accurate return,
Clock/Sparse Tree and canonical Undo. The real GNU table/Babel paths required literal
Run consent and fresh Apply; one actual Undo restored complete Source, including
untouched CRLF/NUL/astral text. Markdown/HTML exports are read-only snapshot formats,
not GNU semantic Org export. Trusted TypeScript is not sandboxed JSON.

Rapid real composition handoff, accepted ASCII before Chinese input, dot/macro and
ordered Undo passed without synthetic composition. Bodyless native Remark metadata
uses binding/generation/revision fences. A real same-file peer A→B→A retired an old
Roam session despite restored bytes; a new session alone navigated to the exact
heading. Harmless metadata labels do not revoke valid input configuration.

Actual final-build native migration refused same-inode changed bytes, foreign-temp
replacement and both staging/installed-root substitution; original and foreign
entries stayed reachable. FIFO artifacts, a 1 GiB sparse manifest and file/symlink
active/retaining markers were refused. This is Linux proof, not later-write byte CAS
or Darwin/Windows equivalence.

The final owned 2 MB/9811-heading/1000-catalog fixture actually opened and closed
twenty additional buffers. Normal buffer-switch second-rAF p50/p95 was **264/377 ms**;
warm Roam first visible result **307/325 ms**. Large input remained slow: **975/995 ms**
with two Main views, **763/974 ms** with an additional independent native peer.
Five actual Source-glyph drawable readbacks were **893/1427 ms** p50/p95 upper bounds.
All groups checked exact body/mirror and one native Undo. These are software-Xvfb
observations, not hardware scanout or a controlled speedup between different shapes.
Long Tasks/heap APIs were unavailable; RSS is not heap/leak proof. Raw failed pilots
were retained; observers and throwaway drivers were removed.

The full goal records technical C–E and Linux native acceptance separately from
remaining F gates: user's actual daily priorities/acceptance, complete performance
observability and non-Linux file-safety execution. Detailed contracts, measurements,
artifacts and limits are in [the runtime design](../../docs/design/doom-editor-runtime.md#eight-lane-integration-and-native-acceptance-2026-10-12).

## Large-Org input optimization (2026-10-13)

A controlled actual Tauri/WebKitGTK comparison used the same 2,077,746-UTF-16 /
49,057-line / 9811-heading Source, two Main views, twenty actually open additional
buffers and 1000 catalog documents. Thirty native keys after three warmups reduced
trusted-key-to-second-rAF p50/p95 from **828/854 ms to 230/241 ms** (about 72%).
This is a software-Xvfb presentation proxy, not hardware key-to-paint.

Current-line lookup is local; source readers stream and collect only requested
metadata. Clock subtree boundaries use a monotonic stack and body owners use binary
search. No new body or command-authority cache was added. Complete input/mirror
hashes, actual single Undo, large-document Clock insertion/Undo and independent
native peer convergence/Undo passed. Unified verification passed **195 files /
4281 tests**, TypeScript/Vite and the embedded Tauri debug build.

The optimized executable SHA-256 is
`09842f1223b0f7d193d77f47caa4774eec5f3fc8cdf645489b84c7cba52acde8`.
Remaining Clock parsing, unavailable Long Tasks/heap observability and full F gates
are recorded in the [controlled native evidence](../../docs/design/doom-editor-runtime.md#controlled-large-org-input-optimization-2026-10-13).

## Packaging

Tauri configuration is in `src-tauri/tauri.conf.json`. Platform prerequisites follow the [Tauri 2 documentation](https://v2.tauri.app/start/prerequisites/). On Linux, development requires WebKitGTK 4.1 libraries.
