# Doom-oriented editor runtime: incremental reconstruction

## Decision

Preserve Tauri, capability-scoped Rust filesystem access, revision-checked writes,
raw Org files, disposable indexes, and migration/recovery isolation. Reconstruct
the editor runtime incrementally rather than rewrite the entire application.

The user-confirmed product direction is Doom experience consistency: keyboard
interaction, command composition, buffers/windows and practical workflows.
ELisp/Doom package binary/runtime compatibility is explicitly **not a goal or a
decision gate**. Implement required behaviors natively; evaluate controlled tool
bridges only for concrete needs, not ecosystem emulation. Evil defaults, scripting
privileges, recovery journals and general-purpose editing scope remain separate
product/security decisions. Continue implementation and verification without
waiting for user approval at ordinary phase commits.

The authoritative implementation goal is now the Org-roam node
`f46e42b4-809e-454f-abff-3e37f79473c9`,
“Grain面向Doom体验一致性的工作环境架构与实施目标”, dated 2026-10-03:
`~/org-roam/report/year-2026-Horse/month-10-October/day-03-Saturday/Grain面向Doom体验一致性的工作环境架构与实施目标.org`.
Continue implementation, verification and goal updates against this new document.
The previous September 30 goal is historical only; do not append work to it.
Changing the document does not reset progress, reduce requirements or complete the goal.

## Target boundaries

```text
Keyboard / views -> command intent -> applicability guard
  -> parameter session -> fresh context guard -> pure Org edit
  -> buffer transaction -> existing revision-checked save -> echo
```

- **Minibuffer:** parameter entry, completion, history, validation and cancellation.
- **Which-Key:** unfinished key-sequence discovery; not a parameter form.
- **Popup:** a temporary tool buffer/window, such as Capture or search results.
- **Buffer:** content, undo, selection, revision and conflict state.
- **Window:** display of a buffer; not document ownership.
- **Workspace:** approved filesystem capability and layout context.

No component should independently serialize a document after parsing it. No new
runtime may become a competing canonical writer alongside the old controller.

## S1: Heading Tags vertical slice

Implemented as an initial slice, not a completed command kernel:

- `flows/org-command/org-tags.command.ts`: pure preparation/execution protocol.
  Rejects preamble/block contexts and stale path/content; distinguishes no-op.
- `hooks/use-org-command-minibuffer.ts`: shared session orchestration and buffer commit (formerly Tags-specific).
  Revision-only autosave does not invalidate a prompt. Loading/saving prevents
  commit but retains input for retry. Workspace/document switches cancel it.
- `types/editor/minibuffer.interface.ts`: parameter-session contract.
- `views/org-workspace/org-minibuffer.view.fn.tsx`: bottom, non-modal surface.
  Multi-value tag completion at the caret; history; IME guard; inline errors.
- `OrgEditorCommandTarget`: exact-source, readonly and range-checked CodeMirror
  transaction boundary. Command edits are isolated undo steps and report through
  the existing controlled editor path; they do not write files themselves.

Heading Tags no longer uses the centered modal. Both menu and `C-c C-q` enter
the same workflow. Candidate tags currently come from the active document only.
History is memory-only while the pane is mounted. The panel currently belongs to
the main document pane, not a complete application-wide minibuffer host.

Keys: Enter accepts; Tab completes; arrows/C-n/C-p select; M-p/M-n browse history;
Esc/C-g cancels. Shift-Tab retains reverse focus navigation. Empty input removes
tags; removing nonexistent tags is a successful no-op. Cancellation restores
editor focus without changing content.

Automated acceptance includes CRLF/lone-CR source preservation, malformed blocks,
menu-focus handoff, undo/redo/selection restoration, revision-only saves, busy
retry, changed content, workspace switch and IME composition. User acceptance is
still required; unit tests are not proof of Doom-equivalent ergonomics.

## S2a: shared parameter commands and planning dates

Tags, Schedule, Deadline and Property now share a typed `OrgBufferCommand` contract and one
session/transaction host. Captured workspace, file path, source, editor target and
session generation are checked before commit. Superseded or unmounted sessions
cannot commit or cancel a newer command. No file IO is added to this host.

Schedule (`C-c C-s`) and Deadline (`C-c C-d`) use the bottom minibuffer. Existing
dates are prefilled; absent dates default to the caller-supplied local date.
Whole-value completion does not insert tag separators. Memory histories are
isolated by command ID. Invalid dates retain input with specific feedback.
Accepting an unchanged date preserves all timestamp bytes, including weekday,
time and repeater/warning details. Changed dates remove the possibly incorrect
weekday while preserving other details. Common Chinese/Japanese weekdays are
recognized; unsupported weekday formats are rejected rather than retained with
a changed date. Empty input is invalid, not date removal.

Preparation, no-op detection and mutation share `parseOrgPlanningLine` source
ranges. Mismatched/unterminated timestamps and duplicate fields are rejected,
not silently guessed or duplicated. Opaque text is retained; nested field names
are not mistaken for top-level planning fields. Existing malformed planning lines
remain editable as raw Org text.

This is **not** a full Org date reader: relative dates, calendar navigation,
time editing and repeater editing are not provided by these prompts. Refile and Archive have since migrated in S2c below. The overall S2 phase is not complete.

Property (`C-c C-p`) uses whole-value `KEY=VALUE` input and completion from the
current heading's properties. Existing ID values are prefilled rather than
silently cleared. Empty VALUE sets an empty value; it does not delete a property.
Preparation and mutation use the same complete-drawer source ranges. Missing
`:END:`, nested drawers, duplicate case-insensitive keys and reserved marker keys
(`END`, `PROPERTIES`) are rejected. Unknown lines and existing whitespace remain
untouched. The pane no longer splices metadata edits into a React-owned string.

## S2b: workspace command inlet and bottom navigation parameters

A pure workspace command catalog defines stable IDs, context availability, labels
and icon keys for the existing shell commands. Ribbon actions and Execute command
use the same guarded dispatcher. This is a shell catalog, not yet a complete
registry of every Org editing operation or plugin command.

Execute command (`Mod-P` / `Mod-K`) now uses the bottom minibuffer. Quick Open
(`Mod-O`) is a nonmodal bottom picker with preserved fuzzy ranking, IME-safe keys,
inline errors and one pending selection at a time. Both support Esc/C-g. Workspace
keyboard routing honors `defaultPrevented` and parameter-surface ownership, so
Org chord suffixes no longer also open shell prompts. Metadata sessions suspend
while workspace parameter surfaces own input; Note actions cannot open conflicting
transfer parameter surfaces.

Quick Open owns a cancellable session and passes an AbortSignal to navigation.
Abort releases request-owned loading immediately and prevents late document
commit, but cannot undo a save already started. Closing the active tab also
invalidates a pending read and releases its loading state. Older aborts/results
must not clear a newer request's loading/error state. Failed opens retain input;
candidate navigation alone never previews or switches the real buffer.

Cancellation restores origin focus. Successful command execution restores origin
before handing off to the selected action; successful Quick Open focuses the
opened editor only if its workspace/path remain current. S2b path tabs initially
were navigation only; the S4a memory buffer handoff below now retains independent
source/history. Buffer Switch, multi-window ownership and
asynchronous workspace-wide completion remain unfinished; initial Org prefix
Which-Key discovery is implemented in S2d below.

## S2c: Refile/Archive effect parameters

Refile and Archive now share parameter ownership with metadata commands, but their
filesystem effects remain explicit controller/flow calls, not buffer transactions.
Refile completes safe workspace-relative Org file paths, excluding source aliases.
Creating a new safe target remains supported by the existing transfer flow. Heading
target completion is **not** implemented yet. Cursor must be on the heading line.
Archive defaults to `no`; only explicit `yes` starts transfer.

Both reject unsaved source input, stale source/path/root and a replaced editor
before invoking effects. The controller also checks latest content against the
committed document, including same-render input not yet reflected in `isDirty`.
Async acceptance locks duplicate submissions and cancellation once effects begin.
Pure validation errors retain input; every filesystem outcome retires the prompt,
including unexpected controller rejection, so it cannot be blindly resubmitted.
Failure/reconciliation echo is persistent, with the full message in its title.

The controller reports success/rejection/partial outcomes. Target-write errors
are marked uncertain even if an API reports failure: atomic publication can have
happened before cleanup/fsync returned an error. The source was not removed by
that failed target-write step. The warning directs users to reread both files and
reconcile possible duplicates, not retry or perform pathname rollback. Existing
confirmed-target partial-success recovery wording remains intact.

Subtree extraction now shares Org block ranges. Fake headings and mismatched end
markers inside source blocks cannot truncate the copied subtree. LF/CRLF/lone-CR,
Unicode, NUL and original EOF remain source-range operations.

## S2d: Org prefix routing and Which-Key discovery

`org-prefix-keymap.ts` now resolves immutable prefix snapshots with caller-supplied
time and identity. Routing and hint labels share readonly keymap tables. It is a
small Org prefix mechanism, not an Evil engine or a complete configuration API.

The `C-c` table retains existing commands and adds `C-c C-w` Refile. `C-c C-x`
transitions to a nested map with `C-a` Archive; both delegate to guarded transfer
parameters. Unknown suffixes clear the prefix and fall through; recognized
commands consume the browser shortcut even when their applicability guard rejects.
Selected idle Ctrl-C remains native copy. Modifier-only keydowns do not destroy
an unfinished prefix. IME/composing events never trigger an Org command.

Which-Key is a passive region, delayed by 350 ms, with no inputs/buttons/focus
capture. It explains a pending prefix; it is neither parameter entry nor a popup
tool buffer. Minibuffer and workspace parameter ownership hide it. Prefix sessions
wait indefinitely by default, permitting time to read hints. Optional finite
`prefixTimeoutMs` values are bounded by the browser's signed-32-bit timer limit;
this prop is not yet a persisted/user-editable configuration layer.

Esc/C-g, editor/window blur, pointer navigation, composition, file/workspace
context changes, readonly transitions and same-document programmatic reveal clear
pending prefixes. Timers are identity-checked and removed on unmount. These
behaviors are covered through real CodeMirror/pane integration, not only pure
router tests. Leader maps, Vim operators/motions/registers and arbitrary keymap
configuration remain pending feasibility work.

## S3: disposable ownership/Vim evidence (not runtime adoption)

Reproducible probes are preserved in
[`experiments/doom-runtime`](../../experiments/doom-runtime/README.md), outside the
application workspace packages. A fresh pinned `npm ci` on 2026-10-02 passed
16/16 Vim/raw-source cases, 18/18 canonical-buffer/window cases and 14/14 combined
ownership cases. Production dependencies and modes are unchanged.

The canonical-buffer prototype uses public history/StateEffect APIs with
history-free, selection-owning window projections. A/B dirty buffers, shared text
and undo across windows, stale/ABA rejection, external CAS conflict and saved
capture/new-edit races pass with synthetic files. This does not establish real
filesystem identity, watcher behavior, plugin-effect forwarding or typing groups.

Composition is **not automatic**: ordinary Vim undo/redo does not reach canonical
history. A public custom route passes narrow normal-mode cases, but needs global
mapping/adapter ownership policy. A transient Vim operator range caused initial
failures; the final probe intentionally restores its range-start cursor. That
lossy policy is not accepted as production cursor semantics. Exact intra-line
cursor, visual/block editing and arbitrary extension effects remain gates.

Vim modes live in view plugins and reset on saved-state switch; registers/maps are
global. Ownership probes use literal CR with an LF separator, preserving source
strings without proving native mixed/lone-CR line editing. Real Chinese IME,
Tauri input/focus, extension compatibility and measured workload performance remain
unverified. Neither Evil defaults nor a full buffer/window architecture are
approved by passing synthetic probes alone.

## S4a: independent memory buffers and real native grant authority

The active controller/editor path remains the only active writer. Successful
navigation atomically parks the previous baseline/working source; the parked
snapshot is the sole inactive body authority. Navigation does not force-save.
Reactivation preserves dirty source even when disk changed or disappeared. Clean
reactivation reads fresh disk source. All callbacks bind grant, activation and path;
request/edit generations also guard async commits and ABA cases.

Each logical buffer keeps an immutable CodeMirror EditorState/undo/selection plus
scroll in a memory-only rendering cache. Exact raw-source equality is required to
reuse it; public reconfiguration installs fresh closures, compartments and labels.
Cache contents never commit body or write files. Grants/closed buffers prune it;
no prefix, focus, timer, modal-engine state or recovery journal is retained. Scroll
restoration yields to reveal, replacement and newer interaction.

Native approvals now mint exact leases. Every filesystem/index/watch operation
validates its originating live token **before** acquiring the retained descriptor.
An acquired descriptor never retargets after revocation; a stale queued token
cannot acquire a new same-root grant. Multiple same-inode approvals share an
immutable retained root; inode replacement is rejected while leases exist.
Releasing a stale lease cannot revoke another grant or its watches. Linux watches
bind descriptors; non-Linux watching fails closed, with active-document polling
and manual workspace refresh retained.

Native close checks live aggregate dirty/busy state. Editing/mutations wait until
close-listener registration succeeds; failed registration leaves editing blocked
with an error. Discard confirmation is explicit; an ongoing file operation is not
cancelled by close. Every owned mutation uses owner-checked exception cleanup;
uncertain failures preserve source and require review, not rollback/blind retry.
Capability tokens belong to the approved Org target, never legacy DB metadata.

Six real hook/pane/CodeMirror integration cases verify independent A/B dirty
source, history/cursor/scroll, save callback rebinding, Agenda-style remount,
failed inactive close, external conflict and same-root new-grant isolation.
Full desktop suite: 137 files / 2024 cases; Rust: 201 cases; typecheck/build pass.
These are automated evidence, not Chinese IME or native desktop UX acceptance.

The S4a checkpoint did not yet include Buffer Switch/save-all (added in S4b
below). Background inactive autosave, shared-buffer windows/projection effects,
restart recovery and modal-engine adoption remain missing. The pure buffer lifecycle protocol is tested separately; it is not a
claim that the full canonical multi-window engine has replaced this handoff.

## S4b: buffer commands and nonblocking captured saves

`buffer-switch` and `save-all` join the guarded shell catalog (Mod-Shift-B/S).
The shared navigation picker backs both Quick Open and Buffer Switch; it owns
nonmodal bottom input, fuzzy path ranking, Tab completion, stable-ID selection,
IME/consumed-event priority, focus and abort generations. Buffer candidates come
from the memory registry, not only files: deleted dirty buffers stay selectable.
Switching validates the live logical ID; close/delete/implicit clean removal
retire IDs, while explicit rename retains them. Old IDs cannot reopen replacements.

Save All snapshots dirty bodies/base revisions, owns one batch mutation token and
writes sequentially through the existing grant/revision flow. Confirmed writes
advance only their own baselines; newer source input remains dirty. The first
failure retires the batch with saved/remaining paths; no rollback or blind retry.
Affected autosave pauses latch across further edits until explicit confirmed
save/reconciliation. Ordinary and batch captures keep native editor input enabled;
loading/transfer still locks editing. This avoids save-driven readonly transitions
interrupting composition, without claiming real Chinese IME acceptance.

Command results use bounded, grant/generation-scoped echo; opened-editor focus
also carries grant identity. Four additional real hook/pane/CM integration cases
cover multi-buffer capture, editable deferred saves, ID switching/cancel and the
real deleted-buffer picker. Desktop 139 files / 2090 cases, typecheck/build pass.

## S5a: Capture parameter → popup tool buffer → explicit effect

Capture no longer uses the TODO argument Dialog or window prompts. A bottom
minibuffer chooses literal `todo`/`note` data; a separate nonmodal scratch Org
editor owns multiline draft text and target input. It is a tool window, not a
fake argument minibuffer or another writer for the originating file buffer.
C-c C-c / Mod-S finish, C-c C-k / C-g abort before write; IME, consumed events,
accepted editor prefixes, multiple-selection copying and held-key repeats take
priority. Template acceptance focuses scratch once at its declared raw cursor.

Draft dirty contributions are workspace-grant scoped, synchronous before React
publication, memory-only, and included in close/route/root-discard checks. File
mutations block route exit until their owned effect finishes; dismissal cannot
cancel or roll back an already-started write. `captureOrgEntryFlow` validates
exact RPC file identities and nonempty revisions, preserves existing/raw entry
bytes, rejects unclosed target blocks, and writes through the same grant/CAS port.
Every failed or malformed post-write confirmation is uncertain: keep a copyable
readonly draft, retire acceptance and require reread/reconciliation, no retry.

Capture target dirty buffers are rejected before effects. Confirmed results
advance only the target baseline; newer input is retained and autosave paused.
Unresolved buffers remain protected after undo to their old baseline, through
watch/poll/refresh and parking. Source caret/history preservation uses minimal
external changes and, for inactive clean buffers, defensive same-ID append-only
cached-state projection with unchanged separator policy followed by public
reconfigure. Unknown body replacements/new grants cannot adopt old cached history.

Eight production-root cases plus real-CM keyboard integration verify the complete
sequence and parked target path with exact EOF semantics. Desktop 143 files /
2255 cases, typecheck/build pass; static review found no remaining scoped issues.
No real native/Chinese IME acceptance, shared-file multi-window runtime, full
capture configuration/interpolation or persistent draft recovery is implied.

## S5b: snapshot-bound heading Refile

Refile has a cancellable, read-only file lookup followed by a separate heading
parameter session. `(file root)` is explicit; heading labels include outline and
line number so duplicate titles do not become identity. The immutable snapshot
binds revision, UTF-16 source offset and complete heading line. Lookup holds no
mutation owner/global loading state, abort returns immediately, and source/grant/
activation/generation guards reject late or busy-ABA results.

`planOrgRefileInsertion` enumerates only headings outside shared raw block ranges,
inserts at the chosen subtree end before its peer and changes only legitimate
incoming heading star runs to child level. Existing bytes, mixed endings, NUL,
Unicode and raw EOF survive; unsafe unclosed block cases reject before effects.
The flow validates exact RPC identities/revisions, rechecks live protected-path
and source guards immediately before first write and after target confirmation.
Any target post-write failure is uncertain; source failure leaves a known target
copy as partial. Neither rollback nor automatic retry is performed.

Both affected paths latch protection after uncertain/partial/throw outcomes;
undo-to-baseline or saving only the source cannot unlock the target. Subsequent
lookups/transfers, automatic import/save, root discard and close obey the latch.
The minibuffer honors native/synthetic consumed input and filters held Enter so
one keypress cannot accept both phases. Archive retains its yes/no root-only flow.

Four real hook/pane/CM/flow cases use a synthetic repository to verify IO ordering,
exact tokens/revisions/raw bytes, stale targets, both-path latching and immediate
read cancellation. Desktop 146 files / 2362 cases, typecheck/build pass; scoped
review has no remaining critical/warnings. Same-file refile, full Org target
configuration, multi-window runtime and native/user acceptance remain pending.

## S4c: production canonical buffer and same-buffer split (historical milestone)

Main-file views now attach to `flows/org-editor-runtime`: one public CodeMirror
state owns text/history; window states contain no history. The controller's live
source mirror drives existing dirty/baseline/CAS ports but is not another editable
history owner. Canonical preflight guards live grant, logical buffer, expected
source and readonly mutation state; receipt commits update the mirror once.
Confirmed filesystem source installations use a separate explicit inlet. Older
save acknowledgments never overwrite newer text. Parked runtimes retain history.

The production pane can display two projections of its same active buffer. Both
follow A/B handoff; independent selections, folds and scroll remain local, while
undo/redo use canonical history and exact origin multi-range selections. Focused
window routing owns metadata, prefix/reveal and opened-buffer focus; mounting or
updating a peer cannot steal the command target. Closing a secondary projection
does not close the buffer. Scratch/capture remain local engines.

The engine preflights complete chained transaction batches and every effect.
Unknown effects/configuration reject rather than silently disappear. Supported
local folding, registered compartment/scroll effects stay window-owned; source
transactions preserve userEvent/time/addToHistory/isolation and typing grouping.
Filters are not run twice. Stale/ABA, detached, closed and reentrant dispatches
fail before commit. Unexpected post-commit mirror/projection failures retain the
canonical source, disable/detach the failing participant and report the error.

Runtime replacement carries a pane mount-incarnation fence; cached runtime-owner
snapshots cannot resurrect retired history even for append-like unknown changes.
Legacy history/redo migration runs on callback-free public history seeds, not
cached filters or stale closures. Unknown clean inactive disk changes reset old
history; confirmed controller capture/refile/archive target changes install into
parked runtimes as known changes. Compatibility edits obey normal readonly guards.

Nine production-root split cases and engine/editor/pane tests cover raw newline/
NUL/Unicode/EOF, one body receipt, history-free projections, undo/redo and detach,
A/B handoff, focus/metadata, save/new-input races, coherent external changes and
incarnation reset. Desktop 150 files /2436 cases, typecheck/build pass; scoped
review found no remaining critical/warnings after the ownership fixes.

At the S4c milestone this was not different-buffer simultaneous windows (now
implemented in the independent split slice below), detached/native windows,
restart recovery, arbitrary extension support, Vim adoption or real IME/desktop
performance acceptance. Those remain explicit goal requirements/gates.

## Architecture convergence: owner rules leave React

The workspace hook still coordinates too many responsibilities. The first
convergence step extracts `guardOrgRuntimeCommit` into a pure data-shaped policy:
immutable owner snapshot → accepted active/parked installation or classified
rejection. The React boundary gathers current refs; it no longer invents permit
rules in the runtime factory closure. Exact lease/session/source and readonly
semantics remain unchanged, with exhaustive parity and regression evidence.

`org-workspace-runtime-registry.ts` then extracts the narrowly scoped lifecycle
reservoir: creation/get, authorized source installation, retirement and closure.
Install authorization clears in owner-checked `finally`; commit decisions still
use the pure guard. Snapshot/mirror adapters remain explicit in the controller,
including old-grant error fencing. This registry owns no filesystem or Org rules
and stores no competing body string.

`org-save-all.flow.ts` now owns sequential snapshot CAS writes, fresh/owner
checks, exact receipt validation, synchronous confirmed commits and classified
first-failure outcomes. The hook only captures inputs, supplies mirror/baseline
ports, maps pause/conflict/echo and releases its owner in `finally`; it does not
run the batch's write loop. Confirmed paths are retained after partial failure;
newer input remains dirty. A production-hook regression covers the terminal
flow-to-hook microtask gap: final commit followed by unmount must not return
success or emit into another origin. The hook rechecks ownership immediately
when the flow settles, even on success.

`org-save-working-copy.flow.ts` now handles one captured CAS effect for both
active saves and inactive close: fresh/current guards, exact confirmation,
nonrejecting navigation waiter, synchronous ACK and classified failures. Active
ACK never replaces newer input. Inactive ACK updates the surviving same-ID
baseline even if its body changed, but retirement still requires the exact owned
snapshot. Baseline drift retains the newer baseline and pauses reconciliation.
Old-grant results cannot mutate an already-live G2. A throwing write-start
notification drains the already-started effect before releasing Busy; handling
promise rejection alone is not enough to preserve native-close protection.

`guardOrgWorkingCopyBaseline` and `planOrgWorkingCopyAck` now share the pure
baseline contract across active save, inactive close and Save All. Path, revision
and baseline bytes must match; confirmed captured content advances the disk
baseline, never the live working source/history. Save All ACKs the current same-ID
parked snapshot rather than spreading its stale capture over newer input. Actual
batch IO uses frozen baseline copies, with per-member owner/ID/reference/baseline
checks before writing: a later member drifting while the first write awaits must
not start IO. Earlier confirmed paths remain acknowledged, with affected members
paused until explicit reconciliation.

`org-buffer-identity-registry.ts` owns path-to-logical-ID lifecycle without text,
history or filesystem authority. All hook allocation, lookup, reverse lookup,
approved rename and retirement now use this scope-bound reservoir. Matching
requires the exact grant object and session, not a root label; clearing an old
scope cannot clear G2. Rename retains ID, while close/delete/clean external
removal retire it, and reopen allocates a distinct identity/runtime. Reopen tests
assert successful navigation and non-null objects rather than accepting null as
merely different from a retired object.

`org-parked-working-copy-reservoir.ts` now owns immutable parked mirror/baseline
snapshots, exact scope/ID lifecycle and stable revision subscriptions. The hook
uses `useSyncExternalStore` for these snapshots rather than owning a mutable
parked Map. Park/mirror/confirmed-baseline/activation/rename/retirement are
explicit operations; pure plans remain outside the reservoir, and canonical
source/history remain runtime-owned. Listener failures cannot unwind committed
mirrors; reentrant mutations are rejected before commit. The runtime permit has
an independent notification fence, not a fake mutation flag that ordinary-save
or authorized-install exceptions could bypass. Production tests dispatch real
transactions, undo and installs during a Save All ACK notification to prove this.
Snapshot/subscription access is internal to the persistent React root, not an
extension-facing unscoped permission API.

This is the beginning, not completion, of splitting lifecycle/state reservoirs,
file effects and presentation. It does not weaken the experience target to avoid
larger window/config/workflow work. Full desktop verification: 157 files /2577
cases, typecheck/build pass (2026-10-03 16:09 +08:00).

## Independent split buffers: production window routing

Split starts with one shared buffer, then navigation changes only the focused
binding. Open-memory focus handoff is synchronous, without an asynchronous read
that loses the first command; `.org` remains the persistent authority, with
watch/refresh/CAS handling disk changes. Live snapshots expose canonical runtime
and mirror/baseline state, not a second body/history owner. Registered window
leases authorize active **and** parked edits. A null-origin direct source commit
is denied unless the trusted registry explicitly authorizes installation.

```text
Window primary -> scoped lease -> canonical A -> active/parked source mirror
Window secondary -> scoped lease -> canonical B -> active/parked source mirror
Focus -> memory-only context activation -> metadata / save / link / reveal
Undo caller lease -> history transaction; restored selection origin is separate
```

Busy cross-buffer focus is visibly deferred/read-only rather than invalidating
an in-flight save owner. Consumed/IME events cannot activate or trigger commands;
copy and navigation remain available. Once busy clears, toolbar availability and
commands use the fenced pending origin—even without another editor key/focus
event—and fresh controller/parameter refs. Pointer modifier-link navigation
activates its originating window rather than stealing the peer's context.

Actual container/CodeMirror regressions cover A/B independent editing/history,
focus Tags/Save, newer parked Save All input, close-focused-buffer peer survival,
close-all/reopen/close-split, rename identity, revoked/rebound leases, history
caller versus selection origin, pending copy→toolbar commands, links, consumed
and composition guards, and same-root G1/G2 cache fencing. Final automated
verification: 157 files /2601 tests, typecheck/build pass (2026-10-03 17:21 +08:00).
This does not claim detached/native windows, fully independent mutation owners,
real native Chinese IME or user workflow acceptance.

## Body Sparse Tree and guarded view commands

`OrgBufferCommandResult` distinguishes source edits from explicit view operations.
The shared minibuffer applies Sparse Tree through a fresh source/window target;
Execute-command requests retain the dispatch-time target/runtime/grant identity,
so a delayed same-buffer peer focus cannot redirect the operation. Toolbar view
commands do not use edit-specific selection-restoration wrappers.

```text
C-c / / catalog / menu -> guarded minibuffer query -> pure raw-source plan
  -> originating window's proven local effect -> body replacement decorations
Canonical .org source/history unchanged; peer filter state independent
```

Queries support `todo`, `todo:STATE`, local `tag:NAME` and title-only literal
`text:LITERAL`. Candidates reuse eligible headings/TODO declarations; no match
shows the document rather than trapping an empty view. Matched sections and
ancestor paths stay visible. Clear restores mapped full selections where
appropriate; ordinary movement supersedes the saved selection. Mixed raw
separators use exact heading-range marks, not invalid CM line decorations.

Lexical block protection stays distinct from sparse/TODO source eligibility:
COMMENT-subtree blocks still guard all existing Org transformations, while inert
markers in excluded comments/drawers cannot hide valid peer headings. Windows
recompute after edits and canonical projections without AST serialization.

Atomic navigation alone is insufficient: origin transaction preflight rejects
hidden-source edits and hidden-selection reveal attempts, including `filter:false`
batches. Runtime canonical history/projection has private authority; standalone
history is entered only by owned per-view key/DOM handlers. Caller-supplied
undo/redo/canonical annotations confer no exemption. Effect approval uses
instance provenance, rejecting forged or other-window sparse effects.

Production and local-editor tests cover visibility/source/history separation,
full multi-range relocation/Clear, Backspace/Delete/movement, peer undo/redo,
forged transactions/effects, mixed endings, source scopes, cancellation, IME,
held acceptance, stale catalog targets and source-derived completion. Verification:
166 files /2692 tests, typecheck/build pass (2026-10-03 19:08 +08:00).
This is bounded query support, not full Org sparse grammar/tag inheritance,
TODO logging, measured large-file performance or native IME acceptance.

## Same-file Refile: atomic buffer edit, not filesystem transfer

The exact current path is a file candidate, including when absent from the last
workspace scan; normalized aliases are not interchangeable local targets.
Current-file heading lookup uses a frozen canonical-source snapshot without
scan/read/write RPCs. Dirty local sources are valid, but unresolved pause/conflict,
busy state and changed source/window/grant/incarnation reject acceptance.
Cross-file Refile/Archive keep their saved-source/copy-first/dual-path protocol.

```text
Current file -> frozen local headings -> target / file root -> fresh guards
  -> pure remove/relevel/insert source ranges -> one origin-window transaction
  -> one canonical undo event -> normal later CAS save with original baseline
```

`planOrgSameFileRefile` returns an atomic edit batch in original raw coordinates,
not a whole-document replacement or two separate dispatches. The editor validates
ranges and visibility before committing; unchanged peer selections/folds keep
meaningful mappings through move, undo and redo. Toolbar transfer clears any
metadata-specific selection wrapper so the destination caret is retained.

Sparse hidden source/target cannot be modified indirectly; visible moves with
unrelated hidden intervening content remain usable. Boundary insertion has narrow
private per-view authority and validates complete actual CRLF/LF/lone-CR
separators. Safe whole-subtree removal must preserve the following heading's line
boundary; ordinary Backspace/Delete cannot borrow this authority. Unclosed
incoming or target drawers/blocks are rejected before edits/writes, including a
malformed drawer in a later destination peer.

Real production/editor regressions cover atomic two-range transactions,
same-buffer peer cursor/folds/history, dirty local workflow and later CAS,
visible/hidden sparse targets, raw EOF/separators, no-op/self/descendant targets,
late unresolved state, focus/IME/held acceptance and canonical/alias candidates.
Verification: 168 files /2741 tests, typecheck/build pass
(2026-10-03 20:16 +08:00). Full configurable targets and native/user acceptance
remain separate unfinished requirements.

## Agenda TODO action: derived tool → canonical command

Agenda row selection supports arrows/n/p, Enter navigation and repeat-safe `t`.
Cycling TODO stays in Agenda and updates the canonical source/history once;
there is no direct write RPC. An unopened target is explicitly read, validated
and parked without activating an editor or overwriting dirty working input.
Live snapshots overlay disk-derived rows, including unsaved states. Parked edits
remain memory-only until Save All/manual persistence; native close sees them.

```text
Derived row + complete scope/provenance + raw heading/timestamp anchors
 -> current live source OR validated explicit read -> fresh command guard
 -> scoped command permit (not window lease or no-history installation)
 -> isolated canonical source-range edit -> mirror -> refreshed live Agenda
```

The registry grants a temporary, exact expected-source command permit with
owner-checked cleanup. Loading/destructive mutation/notification fences precede
that exception. Direct null-origin runtime edits still have no command authority.
Malformed Either discriminants, path/revision payloads and incomplete provenance
reject before allocation or commit. Live actions require current session,
runtime incarnation and generation—even unrelated edit→undo invalidates a DTO.
Disk actions require current-session provenance and verified revisions/anchors.
Derived cache keys include the capability grant, not just filesystem root labels.

Pending rows use guarded aria-disabled behavior and retain actual focus; surviving
selected rows/root fallback restore only within the owned interaction. Navigation
completion is disposal/scope/request-fenced, including rejection and superseding
requests. Actual production-container/runtime tests cover focused deferred success,
rejection/refresh/empty/removal, outside-focus preservation, late G1 versus live G2,
source drift, malformed reads, failed-save pause after undo and canonical undo/CAS.
Verification: 169 files /2807 tests, typecheck/build pass
(2026-10-03 23:53 +08:00). Schedule/Deadline tool commands, unified global tool
registry, full TODO logging and native/user acceptance remain unfinished.

## Agenda Schedule / Deadline parameter workflow

`executeAgendaCommand` handles a typed TODO/planning union through the existing
validated canonical-command path; the TODO API is a wrapper, not a separate
permission system. Date validation precedes reads or allocation. Allocation-free
preparation retrieves the existing requested field—not just the selected row's
timestamp—and falls back to externally injected local today when absent.

`useOrgAgendaParameters` owns only a scoped immutable row/session snapshot.
The shared bottom `OrgMinibuffer` provides `s`/`d` parameter entry, strict ISO
validation, history, IME/consumed/repeat priority and cancellation. Existing
planning pipes preserve accepted format, time/repeater and unknown suffix rules;
an identical date is explicit unchanged, with no history or raw-source rewrite.
Changed dates create one canonical undo event and rebuild unsaved Agenda groups.

```text
s / d -> validated preparation (no allocation) -> scoped date minibuffer
 -> strict date + fresh provenance -> cancellable read
 -> synchronous onCommitStarted -> cancellation locked -> canonical command ACK
 -> original heading/action focus after regrouping; later normal CAS persistence
```

Root rechecks ownership after the lifecycle observer and before publication;
the observer never grants authority. Reads remain abortable, but cancelling after
canonical publication cannot suppress confirmed outcomes or display “cancelled”.
Disposal/new scope still suppresses foreign UI effects without undoing the edit.
Production and adapter tests cover field-specific prefill, no-op/date errors,
raw separators/repeaters, dirty/unopened targets, source/G2 drift, read cancellation,
commit/terminal-gap cancellation, same-heading selection/focus and later Save All.
Verification: 170 files /2880 tests, typecheck/build pass
(2026-10-04 01:06 +08:00). ISO-date entry is not the full Org date reader,
calendar/repeater UI, unified application tool host or TODO logging.

## TODO timestamp logging: shared source-range planner

Editor (runtime and standalone) and Agenda use `planOrgTodoTransition` with an
explicit validated local timestamp. State `!` / outgoing `/!` flags and final
ordered file STARTUP policy govern state logs and CLOSED. No implicit logging
default is enabled. `logdrawer` selects a valid log drawer; ordinary non-drawer
logs remain source lines. Note `@` and a final `lognotedone` prepare a note request only when the
chosen transition actually requires a note, without changing state before Finish.

```text
TODO shortcut / Agenda t -> current source + injected local clock
 -> eligible sequence / applicable policy -> atomic original-coordinate edits
 -> heading + CLOSED + state log -> one canonical history event -> later CAS
```

Existing CLOSED colon spacing and date/weekday/time component shape remain
intact, with present known components updated truthfully. Other planning fields,
unknown source and raw newline payloads are preserved; one undo restores bytes.
Properties validation accepts empty values while rejecting nested/duplicate or
unclosed drawers. Unsupported heading-local LOGGING is evaluated only for the
target and applicable ancestors, not unrelated siblings or excluded source.

The registry's command-batch permit has exact scope/source and readonly/notify
fences, not no-history installation authority. Per-window editing uses the
existing atomic range/visibility contract. Clock failure, malformed policy,
required notes and sparse hidden edits are rejected before commit; production
Editor/Agenda tests assert rendered rejection messages, peer mapping/folds,
consumed/IME/repeat safety, full undo and timezone behavior.
Verification: 173 files /2988 tests, typecheck/build pass
(2026-10-04 02:15 +08:00). The multiline workflow is described below; full property inheritance
and complete logging-policy compatibility remain unfinished requirements.

## TODO notes: scoped request → retained scratch → atomic source commit

`OrgTodoNoteRequest` and its asynchronous Agenda specialization live in the
command flow layer, not view types. They carry validate/execute/abort behavior
with captured source identity; they do not serialize capabilities or persist
another document authority. The planner takes explicit literal note text and
finish-local timestamp; reversible Org-safe literal encoding prevents multiline
`:END:`, headings, blocks and directives from escaping the note/log structure.

```text
Editor TODO / Agenda t -> needs-note preparation (original state held)
 -> shell admission + acknowledged transient protection -> multiline scratch
 -> fresh grant/session/buffer/incarnation/generation/window lease/source checks
 -> cancellable read -> commit boundary -> one state/CLOSED/log/note history event
 -> owned origin focus; later normal CAS / Save All
```

The workspace shell owns the note across Editor/Agenda navigation. Only one
request is admitted; competing requests cannot replace a draft. Editor/standalone
source ownership remains canonical runtime/local CM, while the plain-text note
scratch has its own native input history. Source edits including edit→undo,
retired/rebound windows, conflict or paused autosave invalidate Finish without
throwing away the copyable draft. Root checks the exact active or parked buffer
again after the commit observer; unrelated flags are not authority.

Protection is acknowledged before editable publication. Retained old-scope
scratch may receive a separate current-scope dirty-close registration, never
current-scope commit authority; old callbacks cannot release another grant's
protection. Explicit abort or confirmed completion retires the request. Pending
reads can abort, but a committed result remains applied through terminal gaps.
Focus restoration requires the host still owns focus and the origin is current;
publication callbacks focusing another surface are not overridden.

Production tests cover Editor/standalone/Agenda notes, injected clock, raw undo,
no-write/read-only preparation, literal payload reversibility, dirty baseline/CAS,
lease/ABA/G2 drift, late active/parked pause/conflict, mode-switch retention,
acknowledged close protection, read/commit cancellation and external focus.
Verification: 175 files /3073 tests, typecheck/build pass
(2026-10-04 03:51 +08:00). Native textarea undo and Chinese IME require actual
browser/native acceptance; restart recovery and unified tool registry/complete
logging inheritance remain open, not silently declared complete.

## Next decision gates and work

1. Inventory actual Doom workflows and non-negotiable behaviors.
2. Validate existing Vim extensions, IME, undo/registers/macros and text-object APIs.
3. Extend production independent split routing to detached/native windows and
   independent effect-owner contexts, with extension effects/lifecycle gates.
4. Establish shared source-range Org semantics and measured large-file behavior.
5. Promote the command/session host; migrate planning/properties, Quick Open,
   Refile and Capture one workflow at a time.
6. Generalize the existing Org Which-Key layer into configurable scoped keymaps;
   finish buffer/window ownership without importing the lossy Vim probe policy.
7. Add declarative configuration before arbitrary high-privilege scripts.

Do not equate outline filtering with body sparse-tree visibility, basic TODO
cycling with state logging, or timestamp insertion with a complete date reader.
A recovery journal, if approved, is explicitly non-authoritative and must never
silently overwrite the real Org file on restart.
